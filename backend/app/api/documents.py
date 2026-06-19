from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_user

from app.models.document import Document
from app.models.user import User
from app.services.llm_service import ExtractionResult, extract_invoice_from_document_bytes

router = APIRouter()

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

    # Enqueue extraction via Celery so it runs in the Docker Celery worker (Redis).
    # This keeps POST /documents/upload fast and makes extraction truly async.
    from app.celery_app import celery_app

    extraction_run_id = str(run.id)

    # Celery task signature: payload = {tenant_id, document_id, extraction_run_id, ...}
    # NOTE: We pass file_bytes so the worker can run extraction even without a shared filesystem.
    payload = {
        "tenant_id": tenant_id,
        "document_id": str(doc.id),
        "extraction_run_id": extraction_run_id,
        "file_bytes": file_bytes,
        "content_type": content_type,
        "filename": filename,
    }

    # Fire-and-forget: client only needs the placeholder run record.
    celery_app.send_task(
        "app.tasks.extraction_tasks.run_extraction",
        args=[payload],
    )


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

