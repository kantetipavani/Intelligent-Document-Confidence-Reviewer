from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user

from app.models.document import Document
from app.models.user import User
from app.services.llm_service import ExtractionResult, extract_invoice_from_document_bytes

router = APIRouter()

# Cache key helper used by other modules (e.g. reviews) for dashboard invalidation.
# Keeping it here avoids import-time failures.
def _k_dashboard_stats(tenant_id: str) -> str:
    return f"dashboard_stats:{tenant_id}"


class DocumentCreateResponse(BaseModel):
    document_id: str | None = None
    status: str
    extraction: ExtractionResult | None = None



@router.post("/upload", response_model=DocumentCreateResponse)
async def upload_document(
    filename: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # Enforce tenant isolation: tenant is derived from the JWT, not from request fields.
    tenant_id = current_user.tenant_id



    if settings.skip_db:
        # In skip_db mode we still require a JWT so UI cannot upload into arbitrary tenants.
        # No persistence occurs, so we just run extraction and return fields.
        pass


    if not filename:
        raise HTTPException(status_code=400, detail="filename required")

    content_type = file.content_type

    file_bytes = await file.read()




    # Persist document immediately.
    if settings.skip_db:
        # No persistence in skip_db mode; keep old behavior for local dev.
        try:
            extraction = await extract_invoice_from_document_bytes(
                file_bytes=file_bytes,
                content_type=content_type,
                filename=filename,
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"invoice extraction failed: {exc}") from exc

        return DocumentCreateResponse(
            document_id=None,
            status="extracted",
            extraction=extraction,
        )

    doc = Document(tenant_id=tenant_id, filename=filename, content_type=content_type, source_text=None)
    await doc.insert()

    # Create an extraction run placeholder.
    from app.models.extraction_run import ExtractionRun

    run = ExtractionRun(
        tenant_id=tenant_id,
        document_id=str(doc.id),
        status="queued",
    )
    await run.insert()

    # Publish job to in-process asyncio queue.
    from app.queue.extraction_queue import ExtractionJob, publish_extraction_job

    job = ExtractionJob(
        tenant_id=tenant_id,
        document_id=str(doc.id),
        file_bytes=file_bytes,
        filename=filename,
    )
    await publish_extraction_job(job)

    # Audit: document uploaded / extraction enqueued
    try:
        from app.api.activity import record_event

        await record_event(
            event_type="document_uploaded",
            user_email=current_user.email,
            tenant_id=tenant_id,
            payload={
                "document_id": str(doc.id),
                "filename": filename,
            },
        )
    except Exception:
        pass

    return DocumentCreateResponse(
        document_id=str(doc.id),
        status="processing",
        extraction=None,
    )








@router.get("/{tenant_id}/{document_id}")
async def get_document(
    tenant_id: str,
    document_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    if tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="tenant mismatch")

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

