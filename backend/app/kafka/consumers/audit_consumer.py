from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from aiokafka import AIOKafkaConsumer

from app.kafka.topics import AUDIT_EVENTS
from app.models.audit_event import AuditEvent
from app.core.config import settings

logger = logging.getLogger(__name__)


async def _persist_audit_event(*, tenant_id: str | None, event: dict[str, Any]) -> None:
    ev = AuditEvent(
        tenant_id=tenant_id,
        user_email=event.get("user_email"),
        event_type=event.get("event_type") or "unknown",
        payload=event.get("payload") or {},
    )
    await ev.insert()


async def run_audit_consumer(*, stop_event: asyncio.Event) -> None:
    consumer = AIOKafkaConsumer(
        AUDIT_EVENTS,
        bootstrap_servers=settings.kafka_bootstrap_servers(),
        group_id=settings.kafka_consumer_group_id("audit"),
        enable_auto_commit=False,
        auto_offset_reset="earliest",
    )

    await consumer.start()
    retries: int = 0

    try:
        while not stop_event.is_set():
            try:
                msg = await consumer.getone()
                raw = msg.value.decode("utf-8")
                envelope = json.loads(raw)

                tenant_id = envelope.get("tenant_id")
                event = {
                    "event_type": envelope.get("event_type"),
                    "user_email": envelope.get("payload", {}).get("user_email")
                    if isinstance(envelope.get("payload"), dict)
                    else None,
                    "payload": envelope.get("payload") or {},
                }

                await _persist_audit_event(tenant_id=tenant_id, event=event)
                await consumer.commit()
                retries = 0

            except Exception:
                logger.exception(
                    "audit_consumer failed; topic=%s partition=%s offset=%s",
                    getattr(msg, "topic", None) if "msg" in locals() else None,
                    getattr(msg, "partition", None) if "msg" in locals() else None,
                    getattr(msg, "offset", None) if "msg" in locals() else None,
                )
                retries += 1
                if retries >= 3 and "msg" in locals():
                    # Skip the bad message after 3 failures.
                    await consumer.seek(msg.topic, msg.partition, msg.offset + 1)
                    retries = 0

    finally:
        await consumer.stop()

