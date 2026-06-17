from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.models.user import User
from app.services.extraction_service import run_extraction_and_prepare_review_version
from app.tasks.extraction_tasks import run_extraction


router = APIRouter()


class ExtractionTrigger(BaseModel):
    tenant_id: str
    document_id: str


@router.post("/trigger")
async def trigger_extraction(
    payload: ExtractionTrigger,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    if payload.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="tenant mismatch")

    doc = await Document.get(payload.document_id)
    if not doc or doc.tenant_id != payload.tenant_id:
        raise HTTPException(status_code=404, detail="document not found")

    run = ExtractionRun(tenant_id=payload.tenant_id, document_id=payload.document_id, status="queued")
    await run.insert()

    # Prefer Celery-based async execution (Redis broker/worker).
    try:
        run_extraction.delay(
            {
                "tenant_id": payload.tenant_id,
                "document_id": payload.document_id,
                "extraction_run_id": str(run.id),
            }
        )
    except Exception:
        # Fallback to in-process background task if broker is unavailable.
        background_tasks.add_task(
            run_extraction_and_prepare_review_version,
            tenant_id=payload.tenant_id,
            document_id=payload.document_id,
            extraction_run_id=str(run.id),
        )


    return {"extraction_run_id": str(run.id), "status": "queued"}

