from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.config import settings
from app.models.document import Document
from app.services.llm_service import ExtractionResult, extract_invoice_from_document_bytes

router = APIRouter()


class DocumentCreateResponse(BaseModel):
    document_id: str | None = None
    status: str
    extraction: ExtractionResult


@router.post("/upload", response_model=DocumentCreateResponse)
async def upload_document(
    tenant_id: str = Form(...),
    filename: str = Form(...),
    file: UploadFile = File(...),
    user_email: str | None = Form(default=None),
):


    # Scaffold validation

    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id required")
    if not filename:
        raise HTTPException(status_code=400, detail="filename required")

    content_type = file.content_type
    file_bytes = await file.read()

    try:
        extraction = await extract_invoice_from_document_bytes(
            file_bytes=file_bytes,
            content_type=content_type,
            filename=filename,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"invoice extraction failed: {exc}") from exc

    if settings.skip_db:
        return DocumentCreateResponse(
            document_id=None,
            status="extracted",
            extraction=extraction,
        )

    doc = Document(tenant_id=tenant_id, filename=filename, content_type=content_type, source_text=None)
    await doc.insert()

    # Kick off extraction job synchronously for now so frontend can immediately render fields.
    # (Production approach: background task + polling)
    from app.models.extraction_run import ExtractionRun
    from app.services.extraction_service import run_extraction_and_prepare_review_version

    # Create a real extraction run id so Beanie/ObjectId validation passes.
    run = ExtractionRun(
        tenant_id=tenant_id,
        document_id=str(doc.id),
        status="queued",
    )
    await run.insert()

    # Audit: document uploaded / extraction triggered
    try:
        from app.api.activity import record_event

        await record_event(
            event_type="document_uploaded",
            user_email=user_email,
            tenant_id=tenant_id,
            payload={
                "document_id": str(doc.id),
                "filename": filename,
                "extraction": extraction.model_dump(),
            },
        )
    except Exception:
        pass

    await run_extraction_and_prepare_review_version(
        tenant_id=tenant_id,
        document_id=str(doc.id),
        extraction_run_id=str(run.id),
        file_bytes=file_bytes,
        content_type=content_type,
        user_email=user_email,
    )

    return DocumentCreateResponse(
        document_id=str(doc.id),
        status="extracted",
        extraction=extraction,
    )





@router.get("/{tenant_id}/{document_id}")
async def get_document(tenant_id: str, document_id: str) -> dict:
    doc = await Document.get(document_id)
    if not doc or doc.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="document not found")
    return {
        "document_id": str(doc.id),
        "tenant_id": doc.tenant_id,
        "filename": doc.filename,
        "content_type": doc.content_type,
        "source_text": doc.source_text,
    }

