from __future__ import annotations

import json
import logging
import signal
import sys
import time
from typing import Any

from confluent_kafka import Consumer, KafkaException, Message

from app.kafka_config import (
    kafka_bootstrap_servers,
    kafka_consumer_group_id,
    kafka_topic_extraction_requests,
)
from app.services.extraction_service import run_extraction_and_prepare_review_version

logger = logging.getLogger(__name__)

TOPIC = kafka_topic_extraction_requests()


def _parse_event(payload: bytes) -> dict[str, Any]:
    raw = payload.decode("utf-8")
    return json.loads(raw)


def _should_retry(exc: Exception) -> bool:
    # Keep it simple: treat transient errors as retryable.
    # If the extraction pipeline is broken, we still want it to fail and let humans inspect.
    return True


def _shutdown(cons: Consumer) -> None:
    try:
        cons.close()
    except Exception:
        pass


def main() -> None:
    consumer = Consumer(
        {
            "bootstrap.servers": kafka_bootstrap_servers(),
            "group.id": kafka_consumer_group_id(),
            "enable.auto.commit": False,  # manual commit for replay safety
            "auto.offset.reset": "earliest",
            "session.timeout.ms": 30000,
            "max.poll.interval.ms": 300000,
        }
    )

    running = True

    def _handle_sig(_signum: int, _frame: Any) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, _handle_sig)
    signal.signal(signal.SIGTERM, _handle_sig)

    consumer.subscribe([TOPIC])
    logger.info("Kafka extraction consumer subscribed topic=%s group.id=%s", TOPIC, kafka_consumer_group_id())

    # We run the async pipeline via asyncio.run for each message.
    import asyncio

    try:
        while running:
            msg: Message | None = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                # Non-fatal errors: keep going.
                err = msg.error()
                logger.warning("Kafka message error: %s", err)
                continue

            assert msg.value() is not None
            event = _parse_event(msg.value())

            tenant_id = event["tenant_id"]
            document_id = event["document_id"]
            extraction_run_id = event["extraction_run_id"]

            # Process; commit only after success.
            try:
                asyncio.run(
                    run_extraction_and_prepare_review_version(
                        tenant_id=tenant_id,
                        document_id=document_id,
                        extraction_run_id=extraction_run_id,
                    )
                )
            except Exception as exc:
                logger.exception(
                    "Kafka consumer failed processing extraction_run_id=%s document_id=%s tenant_id=%s. error=%s",
                    extraction_run_id,
                    document_id,
                    tenant_id,
                    exc,
                )
                # Intentionally do NOT commit offset.
                # Kafka will retry once worker comes back.
                if not _should_retry(exc):
                    # In case you want DLQ behavior later.
                    # For now, just let it keep reprocessing.
                    pass
                time.sleep(1)
                continue

            # Mark offsets as processed.
            try:
                consumer.commit(message=msg, asynchronous=False)
            except KafkaException:
                logger.exception("Kafka commit failed")
                # Even if commit fails, message will likely be reprocessed.
                # Idempotency in extraction_service prevents duplication side-effects.

    finally:
        _shutdown(consumer)
        logger.info("Kafka extraction consumer stopped")


if __name__ == "__main__":
    logging.basicConfig(level="INFO", format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    main()

