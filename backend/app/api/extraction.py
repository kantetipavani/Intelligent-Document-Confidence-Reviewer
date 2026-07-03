from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.models.user import User
from app.services.extraction_service import run_extraction_and_prepare_review_version
from app.kafka.producer import publish
from app.kafka.topics import DOCUMENT_EVENTS


router = APIRouter()


class ExtractionTrigger(BaseModel):
    tenant_id: str
    document_id: str


from app.core.rate_limiter import tenant_rate_limit_dependency


@router.post("/trigger")
async def trigger_extraction(
    payload: ExtractionTrigger,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    _rate_limited: None = Depends(
        tenant_rate_limit_dependency(endpoint_key="trigger", current_user_dep=get_current_user)
    ),
):

    if payload.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="tenant mismatch")

    doc = await Document.get(payload.document_id)
    if not doc or doc.tenant_id != payload.tenant_id:
        raise HTTPException(status_code=404, detail="document not found")

    run = ExtractionRun(tenant_id=payload.tenant_id, document_id=payload.document_id, status="queued")
    await run.insert()

    # Kafka event-driven execution (fault-tolerant + replayable).
    # If Kafka is unavailable, fall back to in-process execution.
    try:
        await publish(
            topic=DOCUMENT_EVENTS,
            event_type="extraction_requested",
            payload={
                "tenant_id": payload.tenant_id,
                "document_id": payload.document_id,
                "extraction_run_id": str(run.id),
            },
            tenant_id=payload.tenant_id,
            request_app=None,
        )
    except Exception:
        background_tasks.add_task(
            run_extraction_and_prepare_review_version,
            tenant_id=payload.tenant_id,
            document_id=payload.document_id,
            extraction_run_id=str(run.id),
        )

    return {"extraction_run_id": str(run.id), "status": "queued"}


