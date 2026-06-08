from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.models.user import User
from app.services.version_service import get_document_versions, get_latest_document_version

router = APIRouter()


@router.get("/{document_id}")
async def get_versions(document_id: str, current_user: User = Depends(get_current_user)) -> list[dict]:
    versions = await get_document_versions(current_user.tenant_id, document_id)
    if not versions:
        raise HTTPException(status_code=404, detail="versions not found")

    return [
        {
            "version_number": v.version_number,
            "action": v.action,
            "reviewer_user_id": v.reviewer_user_id,
            "snapshot": v.snapshot,
            "extraction_run_id": v.extraction_run_id,
            "created_at": v.created_at,
        }
        for v in versions
    ]


@router.get("/latest/{document_id}")
async def get_latest_document_extraction(document_id: str, current_user: User = Depends(get_current_user)) -> dict:
    version = await get_latest_document_version(current_user.tenant_id, document_id)
    if not version:
        raise HTTPException(status_code=404, detail="no extraction versions")

    try:
        from app.api.activity import record_event

        await record_event(
            event_type="extraction_retrieved",
            user_email=current_user.email,
            tenant_id=current_user.tenant_id,
            payload={
                "document_id": document_id,
                "version_number": version.version_number,
                "action": version.action,
                "extraction": version.snapshot.get("fields", version.snapshot),
            },
        )
    except Exception:
        pass

    return {
        "document_id": document_id,
        "extraction": version.snapshot.get("fields", version.snapshot),
        "version_number": version.version_number,
        "action": version.action,
    }


