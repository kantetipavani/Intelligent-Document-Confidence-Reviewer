from __future__ import annotations

import argparse
import asyncio
from typing import Any

from app.core.alerts import evaluate_confidence_alerts, maybe_send_alerts


async def run_for_tenant(
    *,
    tenant_id: str,
    window_seconds: int,
    low_confidence_threshold: float,
    manual_review_rate_threshold: float,
    min_extraction_completed_events: int,
    min_review_events: int,
    send: bool,
) -> dict[str, Any]:
    evaluation = await evaluate_confidence_alerts(
        tenant_id=tenant_id,
        window_seconds=window_seconds,
        low_confidence_threshold=low_confidence_threshold,
        manual_review_rate_threshold=manual_review_rate_threshold,
        min_extraction_completed_events=min_extraction_completed_events,
        min_review_events=min_review_events,
    )

    if send:
        send_result = await maybe_send_alerts(
            tenant_id=tenant_id,
            evaluation_payload=evaluation,
        )
        return {
            "tenant_id": tenant_id,
            "sent": send_result.fired,
            "reason": send_result.reason,
            "evaluation": evaluation,
        }

    return {"tenant_id": tenant_id, "sent": False, "evaluation": evaluation}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run confidence threshold alerts")
    parser.add_argument("--tenant-id", required=True, help="Tenant id")
    parser.add_argument("--window-seconds", type=int, default=7 * 24 * 3600)
    parser.add_argument("--low-confidence-threshold", type=float, default=0.6)
    parser.add_argument("--manual-review-rate-threshold", type=float, default=0.30)
    parser.add_argument("--min-extraction-completed-events", type=int, default=5)
    parser.add_argument("--min-review-events", type=int, default=1)
    parser.add_argument(
        "--send",
        action="store_true",
        help="If set, posts to CONFIDENCE_ALERT_WEBHOOK_URL",
    )

    args = parser.parse_args()

    result = asyncio.run(
        run_for_tenant(
            tenant_id=args.tenant_id,
            window_seconds=args.window_seconds,
            low_confidence_threshold=args.low_confidence_threshold,
            manual_review_rate_threshold=args.manual_review_rate_threshold,
            min_extraction_completed_events=args.min_extraction_completed_events,
            min_review_events=args.min_review_events,
            send=args.send,
        )
    )

    # Keep output simple for cron/logging.
    print(result)


if __name__ == "__main__":
    main()

