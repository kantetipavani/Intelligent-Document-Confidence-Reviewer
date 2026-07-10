from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.alerts import evaluate_confidence_alerts, maybe_send_alerts
from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/alerts/confidence")
async def run_confidence_alerts(
    window_seconds: int = Query(
        settings.confidence_alert_window_seconds_default, gt=0
    ),
    low_confidence_threshold: float = Query(
        settings.confidence_low_avg_threshold, ge=0.0, le=1.0
    ),
    manual_review_rate_threshold: float = Query(
        settings.confidence_manual_review_rate_threshold, ge=0.0, le=1.0
    ),
    min_extraction_completed_events: int = Query(
        settings.confidence_min_extraction_completed_events, ge=0
    ),
    # Manual spike alert guard: require at least this many review-related events in window.
    min_review_events: int = Query(settings.confidence_min_review_events, ge=0),
    send: bool = Query(
        False, description="If true, sends alerts to CONFIDENCE_ALERT_WEBHOOK_URL"
    ),
    current_user: User = Depends(get_current_user),
) -> dict:

    tenant_id = current_user.tenant_id

    evaluation = await evaluate_confidence_alerts(
        tenant_id=tenant_id,
        window_seconds=window_seconds,
        low_confidence_threshold=low_confidence_threshold,
        manual_review_rate_threshold=manual_review_rate_threshold,
        min_extraction_completed_events=min_extraction_completed_events,
        min_review_events=min_review_events,
    )

    if not send:
        return {"sent": False, "evaluation": evaluation}

    # send optional
    send_result = await maybe_send_alerts(tenant_id=tenant_id, evaluation_payload=evaluation)
    return {"sent": send_result.fired, "reason": send_result.reason, "evaluation": evaluation}

