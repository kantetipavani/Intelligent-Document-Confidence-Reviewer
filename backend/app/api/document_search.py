from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user import User
from app.services.full_text_search import atlas_or_fallback_full_text_search


router = APIRouter()


class DocumentSearchResultItem(BaseModel):
    document_id: str
    filename: Optional[str] = None
    score: float
    created_at: datetime


class DocumentSearchResponse(BaseModel):
    query: str
    tenant_id: str
    total: int
    results: list[DocumentSearchResultItem]


def _parse_confidence_from_audit_payload(payload: Any) -> Optional[float]:
    """Best-effort extraction of a representative confidence from AuditEvent payload.

    Payload shapes vary across producers/consumers in this scaffold.
    We try:
      - payload.extraction.fields[*].confidence
      - payload.extraction.fields[*] flattened as dict
      - payload.fields[*].confidence
    and return the average confidence for that document.
    """
    if not isinstance(payload, dict):
        return None

    extraction = payload.get("extraction") if isinstance(payload.get("extraction"), dict) else payload

    fields_obj: Any = None
    if isinstance(extraction, dict):
        if isinstance(extraction.get("fields"), dict):
            fields_obj = extraction.get("fields")
        else:
            # maybe extraction itself is the fields map
            fields_obj = {k: v for k, v in extraction.items() if isinstance(v, dict)}

    if not isinstance(fields_obj, dict):
        return None

    confidences: list[float] = []
    for _, field_data in fields_obj.items():
        if not isinstance(field_data, dict):
            continue
        c = field_data.get("confidence")
        if c is None:
            continue
        try:
            confidences.append(float(c))
        except Exception:
            continue

    if not confidences:
        return None
    return sum(confidences) / len(confidences)


@router.get("/documents/search", response_model=DocumentSearchResponse)
async def full_text_search(
    q: str = Query(..., min_length=1, description="Full-text query"),
    tenant_id: Optional[str] = Query(
        None,
        description="If omitted, uses tenant from JWT. If provided, must match JWT tenant.",
    ),
    from_: Optional[datetime] = Query(None, alias="from", description="Start of date range (UTC)"),
    to: Optional[datetime] = Query(None, description="End of date range (UTC)"),
    min_confidence: Optional[float] = Query(
        None,
        ge=0.0,
        le=1.0,
        description="Minimum average confidence for a matching document.",
    ),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """Full-text search across processed documents.

    Implementation note:
    - This repository currently uses MongoDB + Beanie.
    - A production-grade solution should use MongoDB Atlas Search ($search)
      with a dedicated Atlas Search index on:
        * document.source_text
        * extraction-derived text fields (e.g., normalized fields)
      and include filters for tenant_id, created_at, and confidence.

    For local/dev compatibility without Atlas/Search setup, this endpoint
    performs best-effort search by:
    - scanning AuditEvent payloads for query substring matches in extracted
      field values (or JSON-serialized payload text),
    - deriving a representative average confidence,
    - applying tenant/date/confidence filtering.

    This is NOT optimized for large datasets.
    """

    resolved_tenant_id = tenant_id or current_user.tenant_id
    if resolved_tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="tenant mismatch")

    if from_ and to and from_ > to:
        raise HTTPException(status_code=400, detail="invalid date range")

    items = await atlas_or_fallback_full_text_search(
        q=q,
        tenant_id=resolved_tenant_id,
        from_=from_,
        to=to,
        min_confidence=min_confidence,
        limit=limit,
        offset=offset,
    )

    results = [
        DocumentSearchResultItem(
            document_id=item["document_id"],
            filename=item.get("filename"),
            score=float(item.get("score") or 0.0),
            created_at=item["created_at"],
        )
        for item in items
        if isinstance(item, dict) and isinstance(item.get("document_id"), str)
    ]

    return DocumentSearchResponse(
        query=q,
        tenant_id=resolved_tenant_id,
        total=len(results),
        results=sorted(results, key=lambda r: r.score, reverse=True)[:limit],
    )


