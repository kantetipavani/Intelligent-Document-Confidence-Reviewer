from __future__ import annotations

import json
import logging
from typing import Any

from confluent_kafka import Producer

from app.kafka_config import kafka_bootstrap_servers

logger = logging.getLogger(__name__)


def make_producer() -> Producer:
    return Producer({"bootstrap.servers": kafka_bootstrap_servers()})


def publish_json(producer: Producer, *, topic: str, payload: dict[str, Any]) -> None:
    data = json.dumps(payload).encode("utf-8")

    # Delivery report callback (best-effort logging only).
    def _delivery_report(err: Exception | None, msg: Any) -> None:
        if err is not None:
            logger.warning("Kafka delivery failed: %s", err)

    producer.produce(topic, value=data, callback=_delivery_report)
    producer.poll(0)

