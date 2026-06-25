from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from aiokafka import AIOKafkaConsumer

from app.kafka.topics import REVIEW_EVENTS
from app.core.config import settings

logger = logging.getLogger(__name__)


async def _send_email_stub(*, to_email: str | None, subject: str, body: str) -> None:
    # This repo currently has no email service wired.
    # Keep this as a safe stub; replace with aiosmtplib implementation when SMTP config exists.
    logger.info("(stub) send email to=%s subject=%s body=%s", to_email, subject, body[:200])


async def run_review_consumer(*, stop_event: asyncio.Event) -> None:
    consumer = AIOKafkaConsumer(
        REVIEW_EVENTS,
        bootstrap_servers=settings.kafka_bootstrap_servers(),
        group_id=settings.kafka_consumer_group_id("review"),
        enable_auto_commit=False,
        auto_offset_reset="earliest",
    )

    await consumer.start()
    retries: int = 0

    try:
        while not stop_event.is_set():
            try:
                msg = await consumer.getone()
                envelope = json.loads(msg.value.decode("utf-8"))
                payload: dict[str, Any] = envelope.get("payload") or {}

                event_type = envelope.get("event_type")
                if event_type == "DOCUMENT_APPROVED":
                    await _send_email_stub(
                        to_email=payload.get("document_owner_email"),
                        subject="Document approved",
                        body=f"Document {payload.get('document_id')} approved. Reason: {payload.get('reason','')}" ,
                    )
                elif event_type == "DOCUMENT_REJECTED":
                    await _send_email_stub(
                        to_email=payload.get("document_owner_email"),
                        subject="Document rejected",
                        body=f"Document {payload.get('document_id')} rejected. Reason: {payload.get('reason','')}",
                    )
                # Best-effort: broadcast review completion to document watchers + tenant dashboards.
                try:
                    from app.websocket.connection_manager import connection_manager

                    if event_type in {"DOCUMENT_APPROVED", "DOCUMENT_REJECTED"}:
                        document_id = payload.get("document_id")
                        tenant_id = payload.get("tenant_id")

                        if document_id and tenant_id:
                            await connection_manager.broadcast_to_document(
                                str(document_id),
                                {
                                    "event": "REVIEW_DECISION",
                                    "document_id": str(document_id),
                                    "status": "APPROVED"
                                    if event_type == "DOCUMENT_APPROVED"
                                    else "REJECTED",
                                },
                            )
                            await connection_manager.broadcast_to_tenant(
                                str(tenant_id),
                                {
                                    "event": "REVIEW_DECISION",
                                    "document_id": str(document_id),
                                    "status": "APPROVED"
                                    if event_type == "DOCUMENT_APPROVED"
                                    else "REJECTED",
                                },
                            )
                except Exception:
                    pass

                await consumer.commit()
                retries = 0

            except Exception:
                logger.exception(
                    "review_consumer failed; topic=%s partition=%s offset=%s",
                    getattr(msg, "topic", None) if "msg" in locals() else None,
                    getattr(msg, "partition", None) if "msg" in locals() else None,
                    getattr(msg, "offset", None) if "msg" in locals() else None,
                )
                retries += 1
                if retries >= 3 and "msg" in locals():
                    await consumer.seek(msg.topic, msg.partition, msg.offset + 1)
                    retries = 0

    finally:
        await consumer.stop()

