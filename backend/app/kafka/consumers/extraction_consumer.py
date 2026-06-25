from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from aiokafka import AIOKafkaConsumer
from opentelemetry import trace as ot_trace

from app.core.config import settings
from app.kafka.topics import DOCUMENT_EVENTS
from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.services.llm_service import extract_invoice_from_document_bytes
from app.services.version_service import create_review_version
from backend.app.core.tracing import extract_trace_from_headers

logger = logging.getLogger(__name__)


async def run_extraction_consumer(*, stop_event: asyncio.Event) -> None:
    consumer = AIOKafkaConsumer(
        DOCUMENT_EVENTS,
        bootstrap_servers=settings.kafka_bootstrap_servers(),
        group_id=settings.kafka_consumer_group_id("extraction"),
        enable_auto_commit=False,
        auto_offset_reset="earliest",
    )

    await consumer.start()
    retries: int = 0
    tracer = ot_trace.get_tracer(__name__)

    try:
        while not stop_event.is_set():
            try:
                msg = await consumer.getone()
                envelope = json.loads(msg.value.decode("utf-8"))

                event_type = envelope.get("event_type")
                payload: dict[str, Any] = envelope.get("payload") or {}

                if event_type != "DOCUMENT_UPLOADED":
                    await consumer.commit()
                    retries = 0
                    continue

                tenant_id = envelope.get("tenant_id") or payload.get("tenant_id")
                document_id = payload.get("document_id")
                extraction_run_id = payload.get("extraction_run_id")

                # Continue trace context from Kafka headers (if present)
                ctx = None
                token = None
                try:
                    headers = dict(msg.headers) if msg.headers else None
                    ctx = extract_trace_from_headers(headers=headers)
                    from opentelemetry.context import attach

                    token = attach(ctx)
                except Exception:
                    ctx = None
                    token = None

                with tracer.start_as_current_span(
                    "kafka.consume DOCUMENT_UPLOADED",
                    kind=ot_trace.SpanKind.CONSUMER,
                ):
                    doc = await Document.get(str(document_id))
                    if not doc or doc.tenant_id != tenant_id:
                        raise RuntimeError("document not found or tenant mismatch")

                    # For this scaffold, keep extraction input from doc.source_text.
                    file_bytes: bytes | None = None
                    if hasattr(doc, "source_text") and doc.source_text:
                        file_bytes = (doc.source_text).encode("utf-8")

                    run = await ExtractionRun.get(str(extraction_run_id)) if extraction_run_id else None
                    if not run:
                        run = ExtractionRun(
                            tenant_id=tenant_id,
                            document_id=str(document_id),
                            status="queued",
                        )
                        await run.insert()

                    if run.status == "completed" and run.result is not None:
                        await consumer.commit()
                        retries = 0
                        continue

                    run.status = "running"
                    await run.save()

                    # Best-effort WS notifications (no spans)
                    try:
                        from app.websocket.connection_manager import connection_manager

                        await connection_manager.broadcast_to_document(
                            str(document_id),
                            {
                                "type": "document_status",
                                "document_id": str(document_id),
                                "status": "PROCESSING",
                                "extracted_fields_count": len((run.result or {}).get("fields", {}) or {}),
                            },
                        )
                        await connection_manager.broadcast_to_tenant(
                            tenant_id,
                            {
                                "type": "EXTRACTION_STATUS",
                                "event": "EXTRACTION_PROCESSING",
                                "document_id": str(document_id),
                                "status": "PROCESSING",
                            },
                        )
                    except Exception:
                        pass

                    with tracer.start_as_current_span("extract_invoice_from_document_bytes"):
                        extraction_result = await extract_invoice_from_document_bytes(
                            file_bytes=file_bytes or b"",
                            content_type=doc.content_type,
                            filename=doc.filename,
                        )
                        result_dict = extraction_result.model_dump()

                    run.result = result_dict
                    run.status = "completed"
                    run.error = None
                    await run.save()

                    try:
                        from app.websocket.connection_manager import connection_manager

                        await connection_manager.broadcast_to_document(
                            str(document_id),
                            {
                                "event": "EXTRACTION_COMPLETE",
                                "status": "COMPLETE",
                                "document_id": str(document_id),
                                "extracted_fields_count": len(result_dict.get("fields", {}) or {}),
                                "extraction": result_dict.get("fields", result_dict)
                                or result_dict,
                            },
                        )
                        await connection_manager.broadcast_to_tenant(
                            tenant_id,
                            {
                                "event": "EXTRACTION_COMPLETE",
                                "status": "COMPLETE",
                                "document_id": str(document_id),
                            },
                        )
                    except Exception:
                        # WS is best-effort; Kafka/Mongo results are primary.
                        pass

                    await create_review_version(
                        tenant_id=tenant_id,
                        document_id=str(document_id),
                        extraction_run_id=str(run.id),
                        snapshot=result_dict,
                        action="ai_pass",
                        reviewer_user_id=None,
                    )

                    await consumer.commit()
                    retries = 0

                # Detach trace context after span
                if token is not None:
                    from opentelemetry.context import detach

                    detach(token)

            except Exception:
                logger.exception("extraction_consumer failed; skipping after retries")
                retries += 1
                if retries >= 3 and "msg" in locals():
                    await consumer.seek(msg.topic, msg.partition, msg.offset + 1)
                    retries = 0
                await asyncio.sleep(0.5)

    finally:
        await consumer.stop()

