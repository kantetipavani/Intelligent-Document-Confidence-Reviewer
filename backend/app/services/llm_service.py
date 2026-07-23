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
    """Fast PDF text extraction (works only for text-layer PDFs)."""
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("PDF extraction requires pypdf. Install backend requirements.") from exc

    reader = PdfReader(BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(page.strip() for page in pages if page.strip())


def _looks_like_empty_text(text: str) -> bool:
    return not (text or "").strip()


def _ocr_images_from_pdf(file_bytes: bytes) -> str:
    """OCR scanned PDFs by rasterizing pages and running Tesseract."""
    try:
        from pdf2image import convert_from_bytes
    except ImportError as exc:
        raise RuntimeError(
            "OCR for scanned PDFs requires pdf2image. Install backend requirements."
        ) from exc

    try:
        import pytesseract
    except ImportError as exc:
        raise RuntimeError(
            "OCR requires pytesseract. Install backend requirements and ensure Tesseract is installed on the system."
        ) from exc

    images = convert_from_bytes(file_bytes)
    chunks: list[str] = []
    for img in images:
        chunks.append(pytesseract.image_to_string(img) or "")
    return "\n".join(c.strip() for c in chunks if c.strip())


def _ocr_image_bytes(file_bytes: bytes) -> str:
    """OCR image bytes (png/jpg/webp/etc)."""
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("OCR requires Pillow. Install backend requirements.") from exc

    try:
        import pytesseract
    except ImportError as exc:
        raise RuntimeError(
            "OCR requires pytesseract. Install backend requirements and ensure Tesseract is installed on the system."
        ) from exc

    img = Image.open(BytesIO(file_bytes))
    return pytesseract.image_to_string(img) or ""


async def _maybe_ocr_fallback(
    *,
    document_text: str,
    file_bytes: bytes,
    content_type: str | None,
    filename: str,
) -> str:
    """Run OCR fallback if fast extraction produced empty text."""
    if not _looks_like_empty_text(document_text):
        return document_text

    ct = (content_type or "").lower()
    name = (filename or "").lower()

    # PDFs: render pages -> OCR
    if ct == "application/pdf" or name.endswith(".pdf"):
        return _ocr_images_from_pdf(file_bytes)

    # Common images: decode -> OCR
    if ct.startswith("image/") or any(
        name.endswith(ext)
        for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]
    ):
        return _ocr_image_bytes(file_bytes)

    return document_text


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

    # If the extracted text is empty (common for scanned PDFs/images), run OCR fallback.
    document_text = await _maybe_ocr_fallback(
        document_text=document_text,
        file_bytes=file_bytes,
        content_type=content_type,
        filename=filename,
    )

    return await extract_invoice_fields(document_text)


async def extract_invoice_fields(document_text: str) -> ExtractionResult:
    """Extract invoice fields.

    Important: frontend expects a generic `fields` map using keys like:
      invoice_no, date, gstin, vendor, amount, status
    """

    # Always try local heuristic first. This keeps the API functional even when
    # OCR/LLM dependencies or API keys are missing.
    local_fields: dict[str, Any] | None = None
    try:
        from app.services.extraction_service import document_text_to_extraction_result

        local = document_text_to_extraction_result(document_text)
        local_fields = local.get("fields", {}) or {}
    except Exception:
        local_fields = None

    # If no LLM key is configured, rely solely on local heuristic.
    if not getattr(settings, "gemini_api_key", "") and not getattr(settings, "anthropic_api_key", ""):
        if local_fields is None:

            raise RuntimeError("no Anthropic API key and local extraction failed")

        invoice_no = local_fields.get("invoice_no", {})
        vendor = local_fields.get("vendor", {})
        amount = local_fields.get("amount", {})

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
            fields=local_fields,
        )

    # Prefer Anthropic when configured (tests mock `anthropic`).
    if getattr(settings, "anthropic_api_key", ""):

        try:
            from anthropic import AsyncAnthropic  # type: ignore
        except Exception:
            AsyncAnthropic = None

        if AsyncAnthropic is not None:
            client = AsyncAnthropic(api_key=settings.anthropic_api_key)
            prompt = (
                f"{SYSTEM_PROMPT}\n\n"
                "Extract invoice fields and return only JSON.\n\n"
                f"Invoice Text:\n{document_text}"
            )

            # `anthropic` SDK style expects messages
            resp = await client.messages.create(
                model=settings.anthropic_model,
                max_tokens=settings.anthropic_max_tokens,
                temperature=0,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )

        # The real SDK returns `content` blocks with `.text`
            content_text = ""
            for block in getattr(resp, "content", []) or []:
                content_text = getattr(block, "text", None) or content_text
                if getattr(block, "text", None):
                    break

            parsed = parse_extraction_json(content_text)
            # Populate the generic `fields` map for frontend compatibility
            parsed.fields = _build_frontend_fields(parsed, local_fields)
            return parsed


    # Gemini (google-genai)
    try:
        from google import genai
    except (ModuleNotFoundError, ImportError):
        # If the google-genai dependency isn't available in the running env,
        # fall back to local heuristic so the UI still gets fields.
        if local_fields is not None:
            invoice_no = local_fields.get("invoice_no", {})
            vendor = local_fields.get("vendor", {})
            amount = local_fields.get("amount", {})
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
                fields=local_fields,
            )
        raise


    api_key = getattr(settings, "gemini_api_key", "") or getattr(settings, "anthropic_api_key", "")
    model = getattr(settings, "gemini_model", "") or getattr(settings, "anthropic_model", "")
    max_tokens = getattr(settings, "gemini_max_tokens", 800) or getattr(settings, "anthropic_max_tokens", 800)

    client = genai.Client(api_key=api_key)



    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        "Extract invoice_number, vendor_name, and invoice_total from this invoice text:\n\n"
        f"{document_text}"
    )

    resp = client.models.generate_content(
        model=model,
        contents=prompt,
        config={
            "temperature": 0,
            "max_output_tokens": max_tokens,
        },
    )


    text = getattr(resp, "text", None) or str(resp)

    # Try to parse the LLM output. If it fails, fall back to local heuristic
    # so the UI doesn't show "OCR extraction failed".
    try:
        parsed = parse_extraction_json(text)
    except Exception:
        if local_fields is not None:
            invoice_no = local_fields.get("invoice_no", {})
            vendor = local_fields.get("vendor", {})
            amount = local_fields.get("amount", {})
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
                fields=local_fields,
            )
        raise

    # Ensure the generic `fields` map exists for the frontend.
    # Build frontend fields map expected by UI
    parsed.fields = _build_frontend_fields(parsed, local_fields)

    print("\n===== DOCUMENT TEXT =====")
    print(document_text[:1000])
    print("=========================\n")

    print("\n===== GEMINI RESPONSE =====")
    print(text)
    print("===========================\n")

    print("\n===== FINAL RESPONSE =====")
    print(parsed.model_dump())
    print("==========================\n")

    return parsed


def _build_frontend_fields(
    parsed: ExtractionResult,
    local_fields: dict[str, Any] | None,
) -> dict[str, Any]:
    """Build the generic `fields` map expected by the frontend.

    Maps the structured ExtractionResult fields (invoice_number, vendor_name, invoice_total)
    into the flat keys the UI expects: invoice_no, vendor, amount, date, gstin, status.
    Falls back to local heuristic values when available, otherwise uses LLM output.
    """
    return {
        "invoice_no": (
            local_fields.get("invoice_no")
            if local_fields and local_fields.get("invoice_no")
            else {
                "value": parsed.invoice_number.value,
                "confidence": parsed.invoice_number.confidence,
            }
        ),
        "vendor": (
            local_fields.get("vendor")
            if local_fields and local_fields.get("vendor")
            else {
                "value": parsed.vendor_name.value,
                "confidence": parsed.vendor_name.confidence,
            }
        ),
        "amount": (
            local_fields.get("amount")
            if local_fields and local_fields.get("amount")
            else {
                "value": parsed.invoice_total.value,
                "confidence": parsed.invoice_total.confidence,
            }
        ),
        "date": (
            local_fields.get("date")
            if local_fields and local_fields.get("date")
            else {
                "value": "",
                "confidence": 0.0,
            }
        ),
        "gstin": (
            local_fields.get("gstin")
            if local_fields and local_fields.get("gstin")
            else {
                "value": "",
                "confidence": 0.0,
            }
        ),
        "status": (
            local_fields.get("status")
            if local_fields and local_fields.get("status")
            else {
                "value": "EXTRACTED",
                "confidence": 1.0,
            }
        ),
    }


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

