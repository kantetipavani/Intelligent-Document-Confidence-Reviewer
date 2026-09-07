from __future__ import annotations

import os
from io import BytesIO
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.core.config import settings
from app.core.security import create_access_token
from app.models import user as user_module
from app.api.documents import MAX_FILE_SIZE


class DummyUser:
    email = "test@example.com"
    tenant_id = "default"
    role = "user"


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch: pytest.MonkeyPatch):
    os.environ["KAFKA_ENABLED"] = "false"

    async def _noop_worker_loop(**kwargs):
        return

    monkeypatch.setattr(
        "app.workers.extraction_worker.extraction_worker_loop",
        _noop_worker_loop,
    )
    monkeypatch.setattr(settings, "skip_db", True)

    dummy_user_obj = DummyUser()
    monkeypatch.setattr(user_module.User, "email", "test@example.com", raising=False)

    async def fake_find_one(*args, **kwargs):
        return dummy_user_obj

    monkeypatch.setattr(user_module.User, "find_one", fake_find_one)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    token = create_access_token(
        subject=DummyUser.email,
        tenant_id=DummyUser.tenant_id,
        role=DummyUser.role,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client() -> TestClient:
    from app.main import app
    return TestClient(app)


def test_upload_empty_file_fails_validation(client: TestClient, auth_headers: dict[str, str]):
    """Test case 1: Empty file (0 bytes) is rejected with HTTP 400."""
    response = client.post(
        "/documents/upload",
        data={"filename": "invoice.pdf"},
        files={"file": ("invoice.pdf", b"", "application/pdf")},
        headers=auth_headers,
    )

    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "empty" in detail.lower()


def test_upload_malformed_pdf_fails_validation(client: TestClient, auth_headers: dict[str, str]):
    """Test case 2: Malformed or corrupted PDF is rejected with HTTP 400."""
    malformed_pdf_bytes = b"not a valid pdf header and garbage content 12345"
    response = client.post(
        "/documents/upload",
        data={"filename": "invoice.pdf"},
        files={"file": ("invoice.pdf", malformed_pdf_bytes, "application/pdf")},
        headers=auth_headers,
    )

    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "malformed" in detail.lower() or "corrupted" in detail.lower()


def test_upload_malformed_docx_fails_validation(client: TestClient, auth_headers: dict[str, str]):
    """Test case 2b: Malformed DOCX is rejected with HTTP 400."""
    malformed_docx_bytes = b"not a zip or docx content"
    response = client.post(
        "/documents/upload",
        data={"filename": "invoice.docx"},
        files={
            "file": (
                "invoice.docx",
                malformed_docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
        headers=auth_headers,
    )

    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "malformed" in detail.lower() or "corrupted" in detail.lower()


def test_upload_oversized_file_fails_validation(client: TestClient, auth_headers: dict[str, str]):
    """Test case 3: File exceeding MAX_FILE_SIZE (10 MB) is rejected with HTTP 413."""
    oversized_bytes = b"X" * (MAX_FILE_SIZE + 1)
    response = client.post(
        "/documents/upload",
        data={"filename": "large_invoice.txt"},
        files={"file": ("large_invoice.txt", oversized_bytes, "text/plain")},
        headers=auth_headers,
    )

    assert response.status_code == 413
    detail = response.json().get("detail", "")
    assert "too large" in detail.lower() or "maximum" in detail.lower()


def test_upload_unsupported_file_extension_fails_validation(client: TestClient, auth_headers: dict[str, str]):
    """Test case 4: File with unsupported extension is rejected with HTTP 400."""
    response = client.post(
        "/documents/upload",
        data={"filename": "script.exe"},
        files={"file": ("script.exe", b"binary content", "application/octet-stream")},
        headers=auth_headers,
    )

    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "unsupported" in detail.lower()


def test_upload_missing_filename_fails_validation(client: TestClient, auth_headers: dict[str, str]):
    """Test case 5: Missing extension or empty filename is rejected with HTTP 400."""
    response = client.post(
        "/documents/upload",
        data={"filename": "   "},
        files={"file": ("noextension", b"some valid text content", "text/plain")},
        headers=auth_headers,
    )

    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "extension" in detail.lower() or "filename" in detail.lower()


def test_upload_empty_pdf_no_pages_fails_validation(client: TestClient, auth_headers: dict[str, str]):
    """Test case 6: Valid PDF container with 0 pages is rejected with HTTP 400."""
    writer = PdfWriter()
    buf = BytesIO()
    writer.write(buf)
    empty_pdf_bytes = buf.getvalue()

    response = client.post(
        "/documents/upload",
        data={"filename": "invoice.pdf"},
        files={"file": ("invoice.pdf", empty_pdf_bytes, "application/pdf")},
        headers=auth_headers,
    )

    assert response.status_code == 400
    detail = response.json().get("detail", "")
    assert "no pages" in detail.lower() or "malformed" in detail.lower()
