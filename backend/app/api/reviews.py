from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.document import Document
from app.models.review_version import ReviewVersion
from app.models.user import User
from app.services.version_service import create_review_version

from app.api.documents import _k_dashboard_stats


router = APIRouter()


class ApproveReviewPayload(BaseModel):
    document_id: str
    extraction: dict
    # reviewer_user_id is optional for now (auth not wired in scaffold)
    reviewer_user_id: str | None = None


@router.post("/approve")
async def approve_review(
    payload: ApproveReviewPayload,
    current_user: User = Depends(get_current_user),
) -> dict:
    # RBAC: only reviewer/admin can approve.
    # (If you introduce more roles later, extend this list.)
    if current_user.role not in {"reviewer", "admin"}:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges")

    doc = await Document.get(payload.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="document not found")
    if doc.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="tenant mismatch")

    version = await create_review_version(
        tenant_id=doc.tenant_id,
        document_id=payload.document_id,
        extraction_run_id="unknown",
        snapshot={"fields": payload.extraction} if "fields" not in payload.extraction else payload.extraction,
        action="approve",
        reviewer_user_id=current_user.email,
    )

    try:
        from app.api.activity import record_event

        await record_event(
            event_type="review_approved",
            user_email=current_user.email,
            tenant_id=doc.tenant_id,
            payload={
                "document_id": payload.document_id,
                "version_number": version.version_number,
                "action": "approve",
                "extraction": version.snapshot.get("fields", version.snapshot),
            },
        )
    except Exception:
        pass

    # Cache invalidation: dashboard stats depend on review/approval.
    try:
        from app.core.cache import invalidate

        await invalidate(_k_dashboard_stats(doc.tenant_id))
    except Exception:
        pass

    return {
        "version_number": version.version_number,
        "status": "approved",
    }


