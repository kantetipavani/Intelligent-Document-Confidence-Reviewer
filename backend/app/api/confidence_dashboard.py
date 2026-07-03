from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.audit_event import AuditEvent
from app.models.user import User

router = APIRouter()


ConfidenceMetricEvent = Literal[
    "extraction_completed",
    "extraction_retrieved",
]


class ConfidenceDashboardResponse(BaseModel):
    window_seconds: int
    tenant_id: str

    average_confidence: float
    low_confidence_documents: int
    total_documents_with_confidence: int

    manual_review_rate: float
    manual_reviews: int
    total_reviews: int


def _parse_confidences_from_extraction_payload(payload: Any) -> list[float]:
    """Extract confidence values from an extraction payload.

    The extraction payload is expected to have either:
    - {"fields": { <field>: { value, confidence }, ... }} OR
    - { <field>: { value, confidence }, ... }
    """

    if not isinstance(payload, dict):
        return []

    # Common: payload.extraction.fields
    extraction = payload
    if "extraction" in payload and isinstance(payload.get("extraction"), dict):
        extraction = payload["extraction"]

    fields_obj = extraction.get("fields") if isinstance(extraction.get("fields"), dict) else None
    if fields_obj is None and isinstance(extraction, dict):
        # Already a fields map
        fields_obj = {k: v for k, v in extraction.items() if isinstance(v, dict)}

    if not isinstance(fields_obj, dict):
        return []

    confidences: list[float] = []
    for _, field_data in fields_obj.items():
        if not isinstance(field_data, dict):
            continue
        c = field_data.get("confidence")
        try:
            if c is None:
                continue
            confidences.append(float(c))
        except Exception:
            continue

    return confidences


def _is_low_confidence(confidences: list[float], low_confidence_threshold: float) -> bool:
    if not confidences:
        return False
    avg = sum(confidences) / len(confidences)
    return avg < low_confidence_threshold


@router.get("/confidence-dashboard", response_model=ConfidenceDashboardResponse)
async def get_confidence_dashboard(
    window_seconds: int = 7 * 24 * 3600,
    low_confidence_threshold: float = 0.6,
    current_user: User = Depends(get_current_user),
) -> ConfidenceDashboardResponse:
    if window_seconds <= 0:
        raise HTTPException(status_code=400, detail="window_seconds must be > 0")

    # We compute metrics using audit_events (tenant scoped). This avoids extra
    # DB aggregation queries and leverages already-recorded events.
    tenant_id = current_user.tenant_id

    since = datetime.utcnow() - timedelta(seconds=window_seconds)

    # Extraction events should carry extracted fields either at payload.extraction
    # or payload.extraction.fields.
    extraction_events = await AuditEvent.find(
        {
            "tenant_id": tenant_id,
            "event_type": {"$in": ["extraction_completed", "extraction_retrieved"]},
            "created_at": {"$gte": since},
        }
    ).to_list()

    total_docs = 0
    total_confidence_sum = 0.0
    total_confidence_count = 0
    low_confidence_docs = 0

    for ev in extraction_events:
        confidences = _parse_confidences_from_extraction_payload(ev.payload)
        if not confidences:
            continue

        total_docs += 1
        avg_doc_conf = sum(confidences) / len(confidences)
        total_confidence_sum += avg_doc_conf
        total_confidence_count += 1

        if _is_low_confidence(confidences, low_confidence_threshold=low_confidence_threshold):
            low_confidence_docs += 1

    average_confidence = (
        total_confidence_sum / total_confidence_count if total_confidence_count > 0 else 0.0
    )

    # Manual review rate:
    # - treat audit events "review_approved" as manual reviews.
    # - denominator: count review-related events; if there are none, rate is 0.
    review_events = await AuditEvent.find(
        {
            "tenant_id": tenant_id,
            "event_type": {"$in": ["review_approved", "review_requested", "review_retrieved"]},
            "created_at": {"$gte": since},
        }
    ).to_list()

    manual_reviews = sum(1 for ev in review_events if ev.event_type == "review_approved")
    total_reviews = len(review_events)

    manual_review_rate = (manual_reviews / total_reviews) if total_reviews > 0 else 0.0

    return ConfidenceDashboardResponse(
        window_seconds=window_seconds,
        tenant_id=tenant_id,
        average_confidence=average_confidence,
        low_confidence_documents=low_confidence_docs,
        total_documents_with_confidence=total_docs,
        manual_review_rate=manual_review_rate,
        manual_reviews=manual_reviews,
        total_reviews=total_reviews,
    )

