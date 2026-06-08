from __future__ import annotations

from typing import Optional

from app.models.review_version import ReviewVersion


async def get_document_versions(tenant_id: str, document_id: str) -> list[ReviewVersion]:
    return await ReviewVersion.find(
        {"tenant_id": tenant_id, "document_id": document_id}
    ).sort("version_number").to_list()


async def get_latest_document_version(tenant_id: str, document_id: str) -> Optional[ReviewVersion]:
    versions = await ReviewVersion.find(
        {"tenant_id": tenant_id, "document_id": document_id}
    ).sort("-version_number").limit(1).to_list()
    return versions[0] if versions else None


async def create_review_version(
    *,
    tenant_id: str,
    document_id: str,
    extraction_run_id: str,
    snapshot: dict,
    action: str = "ai_pass",
    reviewer_user_id: str | None = None,
) -> ReviewVersion:
    existing = await get_document_versions(tenant_id=tenant_id, document_id=document_id)
    next_version = 1 if not existing else max(v.version_number for v in existing) + 1
    version = ReviewVersion(
        tenant_id=tenant_id,
        document_id=document_id,
        extraction_run_id=extraction_run_id,
        version_number=next_version,
        reviewer_user_id=reviewer_user_id,
        action=action,
        snapshot=snapshot,
    )
    await version.insert()
    return version
