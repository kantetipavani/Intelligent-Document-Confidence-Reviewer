from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.review_version import ReviewVersion
from app.models.extraction_run import ExtractionRun
from app.models.document import Document

router = APIRouter()


@router.get("/{document_id}")
async def get_versions(document_id: str) -> list[dict]:
    # NOTE: frontend currently does not pass tenant_id.
    # We return all versions across tenants for this document_id.
    # In a production system, document_id should be globally unique per tenant.
    versions = await ReviewVersion.find({"document_id": document_id}).sort("version_number").to_list()
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
async def get_latest_document_extraction(document_id: str, user_email: str | None = None) -> dict:


    # Latest version snapshot is used as "extraction" by the reviewer page.
    versions = await ReviewVersion.find({"document_id": document_id}).sort("-version_number").limit(1).to_list()
    if not versions:
        raise HTTPException(status_code=404, detail="no extraction versions")

    v = versions[0]

    # Audit: extraction retrieved
    try:
        from app.api.activity import record_event

        await record_event(
            event_type="extraction_retrieved",
            user_email=user_email,
            tenant_id=v.tenant_id,
            payload={
                "document_id": document_id,
                "version_number": v.version_number,
                "action": v.action,
                "extraction": v.snapshot.get("fields", v.snapshot),
            },
        )
    except Exception:
        pass

    return {
        "document_id": document_id,
        "extraction": v.snapshot.get("fields", v.snapshot),
        "version_number": v.version_number,
        "action": v.action,
    }


