from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from aiokafka import AIOKafkaProducer






logger = logging.getLogger(__name__)


async def start_kafka_producer(bootstrap_servers: str) -> AIOKafkaProducer:
    producer = AIOKafkaProducer(bootstrap_servers=bootstrap_servers)
    await producer.start()
    return producer


async def stop_kafka_producer(producer: AIOKafkaProducer | None) -> None:
    if producer is None:
        return
    try:
        await producer.stop()
    except Exception:
        logger.exception("Failed stopping kafka producer")


async def publish(
    topic: str,
    event_type: str,
    payload: dict[str, Any],
    *,
    tenant_id: str | None = None,
    producer: AIOKafkaProducer | None = None,
    headers: dict[str, str] | None = None,
) -> None:
    """Publish a structured JSON event.

    Envelope schema (JSON body):
      {"event_type": ..., "payload": ..., "timestamp": ..., "tenant_id": ...}

    Trace propagation:
    - Trace context is propagated via Kafka headers (W3C tracecontext).
    """


    if producer is None:
        raise RuntimeError("Kafka producer is not initialized")

    envelope = {
        "event_type": event_type,
        "payload": payload,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "tenant_id": tenant_id,
    }

    data = json.dumps(envelope).encode("utf-8")

    # aiokafka accepts headers as List[Tuple[str, bytes]]
    kafka_headers = None
    if headers:
        kafka_headers = [(k, str(v).encode("utf-8")) for k, v in headers.items()]

    await producer.send_and_wait(topic, data, headers=kafka_headers)



