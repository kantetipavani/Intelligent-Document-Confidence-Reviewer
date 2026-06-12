from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from pydantic import BaseModel
from typing import Any

from app.core.security import get_current_user
from app.models.extraction_run import ExtractionRun
from app.models.review_version import ReviewVersion
from app.models.user import User

router = APIRouter()


class DocumentStatusResponse(BaseModel):
    document_id: str
    status: str
    extraction: dict[str, Any] | None = None


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    current_user: User = Depends(get_current_user),
) -> DocumentStatusResponse:
    # Find latest run for this document + tenant.
    runs = await ExtractionRun.find(
        {"tenant_id": current_user.tenant_id, "document_id": document_id}
    ).sort("-created_at").limit(1).to_list()

    if not runs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="document not found")

    run = runs[0]

    if run.status in {"queued", "running"}:
        return DocumentStatusResponse(
            document_id=document_id,
            status="processing",
            extraction=None,
        )

    if run.status == "failed":
        return DocumentStatusResponse(
            document_id=document_id,
            status="failed",
            extraction=None,
        )

    if run.status == "completed":
        # Prefer latest ReviewVersion snapshot, else fall back to run.result.
        versions = await ReviewVersion.find(
            {"tenant_id": current_user.tenant_id, "document_id": document_id}
        ).sort("-created_at").limit(1).to_list()

        if versions:
            extraction = versions[0].snapshot.get("fields", versions[0].snapshot) or versions[0].snapshot
        else:
            extraction = (run.result or {}).get("fields", run.result) if run.result else None

        return DocumentStatusResponse(
            document_id=document_id,
            status="ready",
            extraction=extraction,
        )

    # Unknown run.status
    return DocumentStatusResponse(document_id=document_id, status="failed", extraction=None)

