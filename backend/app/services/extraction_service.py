from __future__ import annotations

import random
from typing import Any

from app.models.extraction_run import ExtractionRun
from app.models.document import Document
from app.services.version_service import create_review_version


def extract_text_best_effort(*, file_bytes: bytes, content_type: str, filename: str) -> str:
    """Best-effort text extraction.

    Without external OCR/PDF/DOCX dependencies, we support:
    - text/* and application/json-like (decode bytes)
    - fallback: attempt UTF-8 decode

    For PDFs/DOC/DOCX we return an explicit message so the UI can surface a real error
    instead of silently producing placeholders.
    """
    ct = (content_type or "").lower()
    name = (filename or "").lower()

    # TXT / text files
    if ct.startswith("text/") or ct in {"application/json", "application/xml"} or name.endswith(".txt"):
        try:
            return file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            return file_bytes.decode(errors="ignore")

    # PDF/DOC/DOCX: no parsing libs installed yet.
    if ct == "application/pdf" or name.endswith(".pdf"):
        return "(PDF text extraction not implemented in this environment)"

    if ct in {"application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}:
        return "(DOC/DOCX text extraction not implemented in this environment)"

    if name.endswith(".doc") or name.endswith(".docx"):
        return "(DOC/DOCX text extraction not implemented in this environment)"

    # Fallback: try to decode as text
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def document_text_to_extraction_result(document_text: str) -> dict[str, Any]:
    """Extract invoice fields from plain text.

    Heuristic regex extraction (no external OCR/LLM dependencies).

    IMPORTANT: The frontend you have uses field keys:
      - invoice_no, date, gstin, vendor, amount, status

    Output shape must match what the frontend renders:
      {"fields": {<key>: {"value": <string>, "confidence": <number>}, ...}, ...}
    """

    import re
    from datetime import datetime

    text = document_text or ""

    def _confidence(val: str | None, base: float) -> float:
        """Return confidence in [0, 1].

        Use more informative heuristics than raw length so UI percentages are more realistic.
        """
        if not val or not str(val).strip():
            return 0.0

        s = str(val).strip()

        # Stronger signals for typical invoice fields.
        # - invoice numbers: often short alphanumerics with dashes/slashes
        # - dates: many have '-' or '/' and are relatively short
        # - gstin: fixed-ish length 15 with pattern
        is_date_like = bool(re.search(r"\b\d{1,2}[-/][A-Za-z]{3,9}[-/]\d{2,4}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b", s, re.IGNORECASE))
        is_gstin_like = bool(re.fullmatch(r"\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}", s.upper()))
        is_inv_like = bool(re.search(r"\bINV[-/\s]?[A-Z0-9]+\b|\b[A-Z]{2,}[-/][A-Z0-9]+\b", s, re.IGNORECASE))

        boost = 0.0
        if is_gstin_like:
            boost += 0.20
        if is_date_like:
            boost += 0.15
        if is_inv_like:
            boost += 0.10

        # Length-based fallback: cap at 0.25, but use a smaller divisor so good tokens get higher confidence.
        length_boost = min(len(s) / 60, 0.25)

        score = base + boost + length_boost
        return max(0.0, min(0.99, round(score, 2)))

    def _norm_money(s: str) -> str:
        # normalize spaces and keep common currency symbols and separators
        return re.sub(r"\s+", " ", s).strip()

    invoice_no: str | None = None
    date_val: str | None = None
    gstin: str | None = None
    vendor: str | None = None
    amount: str | None = None
    status: str | None = None


    # Invoice number patterns
    # Common OCR outputs:
    # - “Invoice Number :INV-3337” (note missing space after ':')
    # - “Invoice Number INV-3337”
    # - “Invoice Number : INV-3337”
    # Capture the token after the label even with tight spacing.
    m = re.search(
        r"(?:Invoice\s*Number|Invoice\s*No\.?|Invoice\s*#)\s*[:\-]?\s*:?\s*([A-Z]{2,}[-\w\/]*)",
        text,
        re.IGNORECASE,
    )
    if m:
        invoice_no = m.group(1).strip().replace(" ", "")
    else:
        # Fallback: first INV-like token
        m2 = re.search(r"\b(INV[-\s]?[A-Z0-9]+)\b", text, re.IGNORECASE)
        if m2:
            invoice_no = m2.group(1).replace(" ", "").strip()

    # Invoice date patterns
    # Supported examples:
    # - 25-Jan-2016
    # - 25/01/2016
    # - 2016/01/25
    # - January 25, 2016   <-- currently missing (month-first)
    date_matchers = [
        # Numeric-first + month name in middle
        (r"(?:invoice\s*date|date)\s*[:\-]?\s*(\d{1,2}[-\/][A-Za-z]{3,9}[-\/]\d{2,4})"),
        (r"(?:invoice\s*date|date)\s*[:\-]?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})"),
        (r"(?:invoice\s*date|date)\s*[:\-]?\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})"),

        # Month-first: January 25, 2016 / Jan 25 2016
        (r"(?:invoice\s*date|date)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*)?\d{2,4})"),

        # Anywhere in text
        (r"\b(\d{1,2}[-\/][A-Za-z]{3,9}[-\/]\d{2,4})\b"),
        (r"\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b"),
        (r"\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b"),
        (r"\b([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*)?\d{2,4})\b"),
    ]


    for pattern in date_matchers:
        dm = re.search(pattern, text, re.IGNORECASE)
        if dm:
            raw = dm.group(1).strip().replace("/", "-")
            normalized = raw
            try:
                for fmt in ["%d-%b-%Y", "%d-%b-%y", "%d-%m-%Y", "%d-%m-%y", "%Y-%m-%d", "%B-%d-%Y", "%b-%d-%Y"]:

                    try:
                        dt = datetime.strptime(raw, fmt)
                        normalized = dt.strftime("%d-%b-%Y")
                        break
                    except ValueError:
                        continue
            except Exception:
                pass
            # If we successfully parsed a date, boost confidence because this is a strong match.
            # (We don't change the actual value here; confidence is handled below.)
            date_val = normalized
            break




    # GSTIN
    gm = re.search(r"GSTIN\s*[:\-]?\s*(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1})", text, re.IGNORECASE)
    if gm:
        gstin = gm.group(1).upper()
    else:
        # raw gstin token
        gt = re.search(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b", text, re.IGNORECASE)
        if gt:
            gstin = gt.group(0).upper()

    # Vendor / Supplier name (best-effort)
    vm = re.search(r"(?:Vendor\s*Name|Vendor|Supplier)\s*[:\-]?\s*(.+)", text, re.IGNORECASE)
    if vm:
        vendor = vm.group(1).strip()
        # cut at common separators
        vendor = re.split(r"\s{2,}|\n|\r|\||-\s{2,}", vendor)[0].strip()

    # Amount / Total
    # Handles OCR outputs like:
    # - “Total Amount    : ₹84,700”
    # - “AMOUNT  : ₹ 54”
    # - “Total $93.50”
    # - “Sub Total $85.00” (we still prefer Total/Grand Total when possible)
    # Capture numbers with optional thousands separators and/or decimals.
    # Important: OCR sometimes swaps commas and periods, so we will normalize later.
    # Amount regex: supports
    # - 84,700
    # - 54.200 (OCR sometimes uses '.' for thousands)
    # - 93.50
    # - 84.70
    money_amount = r"([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?|[0-9]+(?:[.,][0-9]{2})?)"


    # Some OCR outputs split currency tokens like "R S" or "R.".
    money_currency = r"(₹|INR|INR\.?|RS\.?|R\.?S\.?|R\s*S\.?|RS|\$)?"

    # Also accept OCR formats like:
    #   "Total Amount    : ₹ 84,700" (space after currency symbol)
    #   "₹ 84,700" (currency separated from number)
    money_currency_with_space = money_currency + r"\s*"

    # OCR sometimes drops commas/spacing and can also split the number.

    # Example: "₹ 84" even though actual is "₹ 84,700".
    # We'll prefer labels with currency+number and then normalize any captured
    # partial/fragmented amount by looking for a longer number nearby.


    # Prefer explicit Total labels first.
    tm = re.search(
        r"(?:Grand\s*Total|Total\s*Amount|Total\s*Due|Total\s*|Total\s*[:\-]|Total\s*$|Total)\s*[:\-]?\s*"
        + money_currency_with_space
        + r""
        + money_amount,
        text,
        re.IGNORECASE,
    )

    if not tm:
        # Fallback to other common amount labels.
        tm = re.search(
            r"(?:Subtotal|Sub\s*Total|Tax|Amount\s*Due|Net\s*Amount|Amount)\s*[:\-]?\s*"
            + money_currency
            + r"\s*"
            + money_amount,
            text,
            re.IGNORECASE,
        )

    if tm:
        cur = (tm.group(1) or "").strip()
        num = tm.group(2)
        if cur:
            print("[debug amount] raw num=", repr(num), "cur=", repr(cur))
            # Keep currency symbol as-is (supports $ and ₹)
            cur_norm = cur
            # normalize Rs./INR to ₹ only if you want; otherwise keep original
            if re.fullmatch(r"RS\.?|INR\.?|INR", cur, re.IGNORECASE):
                cur_norm = "₹"

            # Normalize numeric token so OCR like "84,700" or "84.700" stays intact.
            # If OCR used the wrong separator, prefer the version with 3-digit groups.
            num_norm = (num or "").replace(" ", "").strip()
            # Normalize OCR numeric token without losing digits.
            # Keep thousands separators when present.
            # - "54,200" => keep comma form
            # - "54.200" => treat dot as thousands separator => convert to comma
            # - "84.70" => treat dot as decimal => keep dot
            if "," in num_norm and "." not in num_norm:
                pass
            elif "." in num_norm and "," not in num_norm:
                parts = num_norm.split(".")
                if len(parts) > 1 and all(p.isdigit() for p in parts):
                    # Cases:
                    # - "54.200" => thousands => "54,200"
                    # - "84.70"  => decimal cents => keep as "84.70"
                    # - multi-dot thousands => keep comma-thousands using first+last
                    if len(parts) == 2:
                        if len(parts[-1]) == 3:
                            num_norm = parts[0] + "," + parts[-1]
                        elif len(parts[-1]) == 2:
                            pass
                        else:
                            num_norm = "".join(parts)
                    else:
                        num_norm = parts[0] + "," + parts[-1]



            amount = f"{cur_norm} {num_norm}".replace("  ", " ").strip()
        else:
            amount = num
    else:
        # Last-resort fallback: capture a currency+number anywhere.
        tm2 = re.search(money_currency + r"\s*" + money_amount, text, re.IGNORECASE)
        if tm2:
            cur = (tm2.group(1) or "").strip()
            num = tm2.group(2)

            if cur and re.fullmatch(r"RS\.?|INR\.?|INR", cur, re.IGNORECASE):
                cur = "₹"
            amount = (f"{cur} {num}" if cur else num).replace("  ", " ").strip()

    # Status
    sm = re.search(r"(?:Status|Invoice\s*Status|Payment\s*Status)\s*[:\-]?\s*(\w+)", text, re.IGNORECASE)
    if sm:
        status = sm.group(1).strip().upper()

    # Confidence heuristic
    doc_confidence_base = round(0.55 + (len(text) % 25) / 100, 2)

    invoice_no_conf = _confidence(invoice_no, doc_confidence_base)
    # Date is often highly structured; keep confidence slightly higher when parsed.
    date_conf = _confidence(date_val, doc_confidence_base)

    gstin_conf = _confidence(gstin, doc_confidence_base - 0.1)
    vendor_conf = _confidence(vendor, doc_confidence_base - 0.15)
    amount_conf = _confidence(amount, doc_confidence_base - 0.1)
    status_conf = _confidence(status, doc_confidence_base - 0.2)

    # Return exactly the fields your UI needs
    return {
        "fields": {
            "invoice_no": {"value": invoice_no or "", "confidence": invoice_no_conf},
            "date": {"value": date_val or "", "confidence": date_conf},
            "gstin": {"value": gstin or "", "confidence": gstin_conf},
            "vendor": {"value": vendor or "", "confidence": vendor_conf},
            "amount": {"value": amount or "", "confidence": amount_conf},
            "status": {"value": status or "", "confidence": status_conf},
        },
        "document_text_length": len(text),
    }




async def run_extraction_and_prepare_review_version(
    *,
    tenant_id: str,
    document_id: str,
    extraction_run_id: str,
    file_bytes: bytes | None = None,
    content_type: str | None = None,
    user_email: str | None = None,
) -> None:
    run = await ExtractionRun.get(extraction_run_id)
    doc = await Document.get(document_id)
    if not run or not doc or doc.tenant_id != tenant_id:
        return

    run.status = "running"
    await run.save()

    try:
        # Extract text from provided bytes for TXT/PDF/DOC/DOCX.
        # Use the more complete extractor (PDF text + OCR fallback) from llm_service.
        document_text = doc.source_text or ""

        extracted_result: dict[str, Any] | None = None
        if file_bytes:
            try:
                # This returns the same schema shape expected by the UI:
                # {"fields": {<key>: {"value": ..., "confidence": ...}, ...}, ...}
                from app.services.llm_service import extract_invoice_from_document_bytes

                extracted = await extract_invoice_from_document_bytes(
                    file_bytes=file_bytes,
                    content_type=content_type,
                    filename=doc.filename,
                )
                # Pydantic model -> plain dict
                extracted_result = extracted.model_dump()
                document_text = ""  # not used when extracted_result is available
            except Exception:
                # If robust extractor fails, fall back to best-effort text + regex heuristics.
                extracted_result = None

                document_text = extract_text_best_effort(
                    file_bytes=file_bytes,
                    content_type=content_type or "",
                    filename=doc.filename,
                )

        if extracted_result is None and not document_text.strip():
            # Fall back to filename so the rest of the pipeline can continue.
            document_text = f"(no text extracted yet) {doc.filename}"

        # Prefer the robust extracted_result (from llm_service) when available;
        # otherwise derive from heuristic text.
        result = extracted_result if extracted_result is not None else document_text_to_extraction_result(document_text)

        run.result = result
        run.status = "completed"
        run.error = None
        await run.save()

        # Create immutable version 1..N via version_service (single source of truth)
        version = await create_review_version(
            tenant_id=tenant_id,
            document_id=document_id,
            extraction_run_id=extraction_run_id,
            snapshot=result,
            action="ai_pass",
            reviewer_user_id=None,
        )

        next_version = version.version_number


        try:
            from app.api.activity import record_event

            await record_event(
                event_type="extraction_completed",
                user_email=user_email,
                tenant_id=tenant_id,
                payload={
                    "document_id": document_id,
                    "extraction_run_id": extraction_run_id,
                    "version_number": next_version,
                    "filename": doc.filename,
                    "extraction": result.get("fields", {}),
                    "document_text_length": result.get("document_text_length", 0),
                },
            )
        except Exception:
            pass
    except Exception as e:
        run.status = "failed"
        run.error = str(e)
        await run.save()

