from __future__ import annotations

import json
import re
from io import BytesIO
from typing import Any

from pydantic import BaseModel, Field

from app.core.config import settings


class ExtractedField(BaseModel):
    value: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ExtractionResult(BaseModel):
    invoice_number: ExtractedField = Field(default_factory=ExtractedField)
    vendor_name: ExtractedField = Field(default_factory=ExtractedField)
    invoice_total: ExtractedField = Field(default_factory=ExtractedField)
    # Generic fields mapping to support frontend expectations (invoice_no, date, gstin, vendor, amount, status)
    fields: dict[str, Any] = Field(default_factory=dict)


SYSTEM_PROMPT = """You extract invoice fields and return only valid JSON.

Return exactly this schema:
{
  "invoice_number": {"value": "string", "confidence": 0.0},
  "vendor_name": {"value": "string", "confidence": 0.0},
  "invoice_total": {"value": "string", "confidence": 0.0}
}

Rules:
- Do not include markdown, commentary, or extra keys.
- Use empty string and confidence 0 when a field is missing.
- Confidence must be a float from 0 to 1.
- invoice_total should preserve the currency symbol/code when visible.
"""


def extract_text_from_document(
    *,
    file_bytes: bytes,
    content_type: str | None,
    filename: str,
) -> str:
    content_type = (content_type or "").lower()
    filename = (filename or "").lower()

    if content_type == "application/pdf" or filename.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)

    return file_bytes.decode("utf-8", errors="ignore")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("PDF extraction requires pypdf. Install backend requirements.") from exc

    reader = PdfReader(BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(page.strip() for page in pages if page.strip())


async def extract_invoice_from_document_bytes(
    *,
    file_bytes: bytes,
    content_type: str | None,
    filename: str,
) -> ExtractionResult:
    document_text = extract_text_from_document(
        file_bytes=file_bytes,
        content_type=content_type,
        filename=filename,
    )
    return await extract_invoice_fields(document_text)


async def extract_invoice_fields(document_text: str) -> ExtractionResult:
    # If Anthropic key is not configured, fall back to a local heuristic extractor
    # so the API remains functional in offline/dev environments.
    if not settings.anthropic_api_key:
        try:
            from app.services.extraction_service import document_text_to_extraction_result

            local = document_text_to_extraction_result(document_text)
            fields = local.get("fields", {})
            invoice_no = fields.get("invoice_no", {})
            vendor = fields.get("vendor", {})
            amount = fields.get("amount", {})

            return ExtractionResult(
                invoice_number={
                    "value": invoice_no.get("value", ""),
                    "confidence": float(invoice_no.get("confidence", 0.0)),
                },
                vendor_name={
                    "value": vendor.get("value", ""),
                    "confidence": float(vendor.get("confidence", 0.0)),
                },
                invoice_total={
                    "value": amount.get("value", ""),
                    "confidence": float(amount.get("confidence", 0.0)),
                },
                fields=fields or {},
            )
        except Exception:
            # If local extraction fails for any reason, raise a clear error
            raise RuntimeError("no Anthropic API key and local extraction failed")

    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=settings.anthropic_max_tokens,
        temperature=0,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    "Extract invoice_number, vendor_name, and invoice_total from this invoice text:\n\n"
                    f"{document_text}"
                ),
            }
        ],
    )

    text = _message_text(response)
    return parse_extraction_json(text)


def parse_extraction_json(raw_text: str) -> ExtractionResult:
    data = json.loads(_extract_json_object(raw_text))
    return ExtractionResult.model_validate(_normalize_payload(data))


def _message_text(response: Any) -> str:
    chunks: list[str] = []
    for block in getattr(response, "content", []) or []:
        text = getattr(block, "text", None)
        if text is not None:
            chunks.append(text)
            continue
        if isinstance(block, dict) and block.get("type") == "text":
            chunks.append(str(block.get("text", "")))

    return "\n".join(chunks).strip()


def _extract_json_object(raw_text: str) -> str:
    text = (raw_text or "").strip()
    if text.startswith("{") and text.endswith("}"):
        return text

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("LLM response did not contain a JSON object")

    return match.group(0)


def _normalize_payload(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "invoice_number": _normalize_field(data.get("invoice_number")),
        "vendor_name": _normalize_field(data.get("vendor_name")),
        "invoice_total": _normalize_field(data.get("invoice_total")),
    }


def _normalize_field(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return {
            "value": str(value.get("value") or ""),
            "confidence": _clamp_confidence(value.get("confidence")),
        }

    if value is None:
        return {"value": "", "confidence": 0.0}

    return {"value": str(value), "confidence": 0.0}


def _clamp_confidence(value: Any) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0

    return max(0.0, min(1.0, confidence))
