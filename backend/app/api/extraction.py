from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.services.extraction_service import run_extraction_and_prepare_review_version

router = APIRouter()


class ExtractionTrigger(BaseModel):
    tenant_id: str
    document_id: str


@router.post("/trigger")
async def trigger_extraction(payload: ExtractionTrigger, background_tasks: BackgroundTasks):
    doc = await Document.get(payload.document_id)
    if not doc or doc.tenant_id != payload.tenant_id:
        raise HTTPException(status_code=404, detail="document not found")

    run = ExtractionRun(tenant_id=payload.tenant_id, document_id=payload.document_id, status="queued")
    await run.insert()

    background_tasks.add_task(
        run_extraction_and_prepare_review_version,
        tenant_id=payload.tenant_id,
        document_id=payload.document_id,
        extraction_run_id=str(run.id),
    )

    return {"extraction_run_id": str(run.id), "status": "queued"}

