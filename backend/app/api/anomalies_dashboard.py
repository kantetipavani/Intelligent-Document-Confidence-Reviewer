from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.audit_event import AuditEvent
from app.models.user import User

router = APIRouter()


class AnomalyThresholds(BaseModel):
    low_confidence_ratio: float = 0.25
    manual_review_rate: float = 0.30

    # If extraction volume drops sharply within the window, we can flag it.
    # This repo doesn't have an expected baseline per tenant, so this is
    # thresholding against an absolute minimum.
    min_extraction_completed_events: int = 5


class AnomalyItem(BaseModel):
    key: str
    severity: Literal["warning", "critical"]
    message: str
    metrics: dict[str, Any]


class AnomaliesDashboardResponse(BaseModel):
    window_seconds: int
    tenant_id: str
    thresholds: AnomalyThresholds
    anomalies: list[AnomalyItem]


def _parse_confidences_from_extraction_payload(payload: Any) -> list[float]:
    """Extract confidence values from an extraction payload.

    The extraction payload is expected to have either:
    - {"fields": { <field>: { value, confidence }, ... }} OR
    - {"fields": { ... } } OR
    - {<field>: { value, confidence }, ...}

    AuditEvent payload for this scaffold may contain different shapes depending
    on producer/consumer.
    """

    if not isinstance(payload, dict):
        return []

    extraction = payload
    if "extraction" in payload and isinstance(payload.get("extraction"), dict):
        extraction = payload["extraction"]

    fields_obj = None
    if isinstance(extraction.get("fields"), dict):
        fields_obj = extraction.get("fields")
    elif isinstance(extraction, dict):
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


@router.get("/anomalies", response_model=AnomaliesDashboardResponse)
async def get_dashboard_anomalies(
    window_seconds: int = 7 * 24 * 3600,
    low_confidence_threshold: float = 0.6,
    low_confidence_ratio_threshold: float = 0.25,
    manual_review_rate_threshold: float = 0.30,
    min_extraction_completed_events: int = 5,
    current_user: User = Depends(get_current_user),
) -> AnomaliesDashboardResponse:
    if window_seconds <= 0:
        raise HTTPException(status_code=400, detail="window_seconds must be > 0")

    tenant_id = current_user.tenant_id
    since = datetime.utcnow() - timedelta(seconds=window_seconds)

    anomalies: list[AnomalyItem] = []

    # We reuse AuditEvent as the single persistence source.
    # extraction_completed / extraction_retrieved carry extraction fields.
    extraction_events = await AuditEvent.find(
        {
            "tenant_id": tenant_id,
            "event_type": {"$in": ["extraction_completed", "extraction_retrieved"]},
            "created_at": {"$gte": since},
        }
    ).to_list()

    extraction_docs_with_confidence = 0
    low_confidence_docs = 0

    for ev in extraction_events:
        confidences = _parse_confidences_from_extraction_payload(ev.payload)
        if not confidences:
            continue
        extraction_docs_with_confidence += 1
        avg_doc_conf = sum(confidences) / len(confidences)
        if avg_doc_conf < low_confidence_threshold:
            low_confidence_docs += 1

    low_ratio = (
        low_confidence_docs / extraction_docs_with_confidence
        if extraction_docs_with_confidence > 0
        else 0.0
    )

    if extraction_docs_with_confidence > 0 and low_ratio >= low_confidence_ratio_threshold:
        severity: Literal["warning", "critical"] = (
            "critical" if low_ratio >= min(1.0, low_confidence_ratio_threshold * 2) else "warning"
        )
        anomalies.append(
            AnomalyItem(
                key="low_confidence_ratio",
                severity=severity,
                message=(
                    f"Low-confidence documents ratio is elevated: {low_ratio:.2%} "
                    f"(threshold {low_confidence_ratio_threshold:.2%})."
                ),
                metrics={
                    "low_confidence_docs": low_confidence_docs,
                    "total_docs_with_confidence": extraction_docs_with_confidence,
                    "low_confidence_ratio": low_ratio,
                    "low_confidence_threshold": low_confidence_threshold,
                },
            )
        )

    # Manual review metrics.
    review_events = await AuditEvent.find(
        {
            "tenant_id": tenant_id,
            "event_type": {"$in": ["review_approved", "review_requested", "review_retrieved"]},
            "created_at": {"$gte": since},
        }
    ).to_list()

    manual_reviews = sum(1 for ev in review_events if ev.event_type == "review_approved")
    total_reviews = len(review_events)
    manual_rate = (manual_reviews / total_reviews) if total_reviews > 0 else 0.0

    if total_reviews > 0 and manual_rate >= manual_review_rate_threshold:
        severity: Literal["warning", "critical"] = (
            "critical" if manual_rate >= min(1.0, manual_review_rate_threshold * 2) else "warning"
        )
        anomalies.append(
            AnomalyItem(
                key="manual_review_rate",
                severity=severity,
                message=(
                    f"Manual review rate is elevated: {manual_rate:.2%} "
                    f"(threshold {manual_review_rate_threshold:.2%})."
                ),
                metrics={
                    "manual_reviews": manual_reviews,
                    "total_reviews": total_reviews,
                    "manual_review_rate": manual_rate,
                },
            )
        )

    # Throughput / freshness guardrail.
    extraction_completed_count = sum(
        1 for ev in extraction_events if ev.event_type == "extraction_completed"
    )
    if extraction_completed_count < min_extraction_completed_events:
        # If there is little extraction activity, it can indicate pipeline outage.
        anomalies.append(
            AnomalyItem(
                key="low_extraction_throughput",
                severity="warning",
                message=(
                    f"Low extraction throughput in window: {extraction_completed_count} "
                    f"completed events < min {min_extraction_completed_events}."
                ),
                metrics={
                    "extraction_completed_events": extraction_completed_count,
                    "min_extraction_completed_events": min_extraction_completed_events,
                },
            )
        )

    thresholds = AnomalyThresholds(
        low_confidence_ratio=low_confidence_ratio_threshold,
        manual_review_rate=manual_review_rate_threshold,
        min_extraction_completed_events=min_extraction_completed_events,
    )

    return AnomaliesDashboardResponse(
        window_seconds=window_seconds,
        tenant_id=tenant_id,
        thresholds=thresholds,
        anomalies=anomalies,
    )

