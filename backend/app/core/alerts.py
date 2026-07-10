from __future__ import annotations
import json
import os
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Literal, Optional

from app.models.audit_event import AuditEvent


@dataclass(frozen=True)
class AlertResult:
    fired: bool
    alerts: list[dict[str, Any]]
    reason: str = ""


def _post_json_webhook(*, url: str, payload: dict[str, Any], timeout_s: int = 5) -> None:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:  # nosec B310
        _ = resp.read()


def _extract_confidences_from_audit_payload(payload: Any) -> list[float]:
    if not isinstance(payload, dict):
        return []

    extraction = payload
    if isinstance(payload.get("extraction"), dict):
        extraction = payload["extraction"]

    # payload might be {extraction: {fields:{...}}} or already fields map
    fields_obj = None
    if isinstance(extraction.get("fields"), dict):
        fields_obj = extraction.get("fields")
    elif isinstance(extraction, dict):
        fields_obj = {k: v for k, v in extraction.items() if isinstance(v, dict)}

    if not isinstance(fields_obj, dict):
        return []

    out: list[float] = []
    for _, field_data in fields_obj.items():
        if not isinstance(field_data, dict):
            continue
        c = field_data.get("confidence")
        try:
            if c is None:
                continue
            out.append(float(c))
        except Exception:
            continue

    return out


def _compute_dashboard_metrics(*, tenant_id: str, window_seconds: int) -> dict[str, Any]:
    since = datetime.utcnow() - timedelta(seconds=window_seconds)

    # extraction docs
    extraction_events = AuditEvent.find(
        {
            "tenant_id": tenant_id,
            "event_type": {"$in": ["extraction_completed", "extraction_retrieved"]},
            "created_at": {"$gte": since},
        }
    )

    # Beanie find returns awaitable for to_list
    # computed in async function calling this helper.
    raise RuntimeError("_compute_dashboard_metrics must be called via compute_* async wrapper")


async def evaluate_confidence_alerts(
    *,
    tenant_id: str,
    window_seconds: int,
    low_confidence_threshold: float,
    manual_review_rate_threshold: float,
    min_extraction_completed_events: int = 5,
    # Manual spike guard: only evaluate manual alerts when review volume exists.
    min_review_events: int = 1,
) -> dict[str, Any]:
    """Compute metrics and return whether alerts should fire."""

    since = datetime.utcnow() - timedelta(seconds=window_seconds)

    extraction_events = await AuditEvent.find(
        {
            "tenant_id": tenant_id,
            "event_type": {"$in": ["extraction_completed", "extraction_retrieved"]},
            "created_at": {"$gte": since},
        }
    ).to_list()

    extraction_docs_with_confidence = 0
    low_confidence_docs = 0
    total_conf_sum = 0.0

    for ev in extraction_events:
        confidences = _extract_confidences_from_audit_payload(ev.payload)
        if not confidences:
            continue
        extraction_docs_with_confidence += 1
        avg_doc_conf = sum(confidences) / len(confidences)
        total_conf_sum += avg_doc_conf
        if avg_doc_conf < low_confidence_threshold:
            low_confidence_docs += 1

    average_confidence = (
        total_conf_sum / extraction_docs_with_confidence if extraction_docs_with_confidence > 0 else 0.0
    )

    # Manual review rate
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

    # guardrails
    extraction_completed_count = sum(1 for ev in extraction_events if ev.event_type == "extraction_completed")

    should_conf_alert = (
        extraction_completed_count >= min_extraction_completed_events
        and extraction_docs_with_confidence > 0
        and average_confidence < low_confidence_threshold
    )

    should_manual_alert = total_reviews >= min_review_events and manual_review_rate >= manual_review_rate_threshold

    alerts: list[dict[str, Any]] = []

    if should_conf_alert:
        alerts.append(
            {
                "type": "low_average_confidence",
                "severity": "critical" if average_confidence < low_confidence_threshold / 2 else "warning",
                "message": f"Average confidence dropped to {average_confidence:.2%} (threshold {low_confidence_threshold:.2%}).",
                "metrics": {
                    "average_confidence": average_confidence,
                    "threshold": low_confidence_threshold,
                    "tenant_id": tenant_id,
                    "window_seconds": window_seconds,
                },
            }
        )

    if should_manual_alert:
        alerts.append(
            {
                "type": "manual_review_rate_spike",
                "severity": "critical" if manual_review_rate >= min(1.0, manual_review_rate_threshold * 2) else "warning",
                "message": f"Manual review rate is elevated to {manual_review_rate:.2%} (threshold {manual_review_rate_threshold:.2%}).",
                "metrics": {
                    "manual_review_rate": manual_review_rate,
                    "threshold": manual_review_rate_threshold,
                    "tenant_id": tenant_id,
                    "window_seconds": window_seconds,
                    "manual_reviews": manual_reviews,
                    "total_reviews": total_reviews,
                },
            }
        )

    return {
        "window_seconds": window_seconds,
        "tenant_id": tenant_id,
        "average_confidence": average_confidence,
        "manual_review_rate": manual_review_rate,
        "manual_reviews": manual_reviews,
        "total_reviews": total_reviews,
        "alerts": alerts,
    }


async def maybe_send_alerts(*, tenant_id: str, evaluation_payload: dict[str, Any]) -> AlertResult:
    webhook_url = os.getenv("CONFIDENCE_ALERT_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return AlertResult(fired=False, alerts=[], reason="webhook not configured")

    alerts = evaluation_payload.get("alerts") or []
    if not alerts:
        return AlertResult(fired=False, alerts=[], reason="no threshold breach")

    payload = {
        "event": "confidence_threshold_alert",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "evaluation": evaluation_payload,
        "tenant_id": tenant_id,
        "alerts": alerts,
    }

    _post_json_webhook(url=webhook_url, payload=payload)
    return AlertResult(fired=True, alerts=alerts, reason="sent")

