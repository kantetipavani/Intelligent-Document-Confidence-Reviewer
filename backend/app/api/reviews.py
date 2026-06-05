from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.document import Document
from app.models.review_version import ReviewVersion

router = APIRouter()


class ApproveReviewPayload(BaseModel):
    document_id: str
    extraction: dict
    # reviewer_user_id is optional for now (auth not wired in scaffold)
    reviewer_user_id: str | None = None


@router.post("/approve")
async def approve_review(payload: ApproveReviewPayload) -> dict:
    doc = await Document.get(payload.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="document not found")

    # Determine next version number
    existing = await ReviewVersion.find({
        "tenant_id": doc.tenant_id,
        "document_id": payload.document_id,
        "action": {"$in": ["ai_pass", "review", "approve"]},
    }).to_list()
    next_version = 1 if not existing else max(v.version_number for v in existing) + 1

    # Create new immutable version as "approve"
    version = ReviewVersion(
        tenant_id=doc.tenant_id,
        document_id=payload.document_id,
        extraction_run_id="unknown",
        version_number=next_version,
        reviewer_user_id=payload.reviewer_user_id,
        action="approve",
        snapshot={"fields": payload.extraction} if "fields" not in payload.extraction else payload.extraction,
    )
    await version.insert()

    try:
        from app.api.activity import record_event

        await record_event(
            event_type="review_approved",
            user_email=payload.reviewer_user_id,
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

    return {
        "version_number": version.version_number,
        "status": "approved",
    }

