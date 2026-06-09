from __future__ import annotations

import sys
import types

import pytest
from fastapi.testclient import TestClient

from app.core import security as security_module
from app.core.config import settings
from app.services.llm_service import ExtractionResult, parse_extraction_json


FIXTURE_LLM_JSON = """
{
  "invoice_number": {"value": "INV-1001", "confidence": 0.96},
  "vendor_name": {"value": "Acme Supplies", "confidence": 0.91},
  "invoice_total": {"value": "INR 12,500.00", "confidence": 0.88}
}
"""


def test_parse_extraction_json_returns_expected_fields() -> None:
    result = parse_extraction_json(FIXTURE_LLM_JSON)

    assert result.invoice_number.value == "INV-1001"
    assert result.vendor_name.value == "Acme Supplies"
    assert result.invoice_total.value == "INR 12,500.00"


def test_parse_extraction_json_clamps_confidence_and_fills_missing_fields() -> None:
    result = parse_extraction_json(
        """
        {
          "invoice_number": {"value": "INV-999", "confidence": 1.4},
          "vendor_name": {"value": "Missing Total Ltd", "confidence": -0.2}
        }
        """
    )

    assert result.invoice_number.confidence == 1.0
    assert result.vendor_name.confidence == 0.0
    assert result.invoice_total.value == ""
    assert result.invoice_total.confidence == 0.0


@pytest.mark.asyncio
async def test_extract_invoice_fields_uses_mocked_anthropic_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeMessages:
        async def create(self, **kwargs):
            assert kwargs["system"]
            assert kwargs["temperature"] == 0
            assert "Invoice Number: INV-1001" in kwargs["messages"][0]["content"]
            return types.SimpleNamespace(
                content=[types.SimpleNamespace(text=FIXTURE_LLM_JSON)]
            )

    class FakeAsyncAnthropic:
        def __init__(self, api_key: str):
            assert api_key == "test-key"
            self.messages = FakeMessages()

    fake_anthropic_module = types.SimpleNamespace(AsyncAnthropic=FakeAsyncAnthropic)
    monkeypatch.setitem(sys.modules, "anthropic", fake_anthropic_module)
    monkeypatch.setattr(settings, "anthropic_api_key", "test-key")

    from app.services.llm_service import extract_invoice_fields

    result = await extract_invoice_fields(
        "Invoice Number: INV-1001\nVendor: Acme Supplies\nTotal: INR 12,500.00"
    )

    assert result == parse_extraction_json(FIXTURE_LLM_JSON)


def test_upload_endpoint_returns_structured_json(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_extract_invoice_from_document_bytes(**kwargs):
        assert kwargs["filename"] == "invoice.pdf"
        assert kwargs["content_type"] == "application/pdf"
        assert kwargs["file_bytes"] == b"%PDF mocked bytes"
        return ExtractionResult(
            invoice_number={"value": "INV-1001", "confidence": 0.96},
            vendor_name={"value": "Acme Supplies", "confidence": 0.91},
            invoice_total={"value": "INR 12,500.00", "confidence": 0.88},
        )

    monkeypatch.setattr(settings, "skip_db", True)
    monkeypatch.setattr(
        "app.api.documents.extract_invoice_from_document_bytes",
        fake_extract_invoice_from_document_bytes,
    )

    from app.main import app

    class DummyUser:
        email = "test@example.com"
        tenant_id = "default"
        role = "user"

    # Instead of patching dependency (which FastAPI may capture), generate a valid JWT
    # and patch DB lookup to return our DummyUser when the token is validated.
    from app.core.security import create_access_token

    from app.models import user as user_module

    dummy_user_obj = DummyUser()

    # Patch the attribute used in the query builder so User.email doesn't
    # trigger Pydantic model attribute errors during tests.
    monkeypatch.setattr(user_module.User, "email", "test@example.com", raising=False)

    # Patch DB lookup used by get_current_user.
    async def fake_find_one(*args, **kwargs):
        return dummy_user_obj

    monkeypatch.setattr(user_module.User, "find_one", fake_find_one)



    token = create_access_token(
        subject=DummyUser.email,
        tenant_id=DummyUser.tenant_id,
        role=DummyUser.role,
    )

    headers = {"Authorization": f"Bearer {token}"}


    with TestClient(app) as client:
        response = client.post(
            "/documents/upload",
            data={"filename": "invoice.pdf"},
            files={
                "file": (
                    "invoice.pdf",
                    b"%PDF mocked bytes",
                    "application/pdf",
                )
            },
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "extracted"
    assert body["extraction"]["invoice_number"]["value"] == "INV-1001"
    assert body["extraction"]["vendor_name"]["confidence"] == 0.91
    assert body["extraction"]["invoice_total"]["value"] == "INR 12,500.00"

