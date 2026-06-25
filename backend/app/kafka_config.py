from __future__ import annotations

import os


def kafka_bootstrap_servers() -> str:
    return os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")


def kafka_topic_extraction_requests() -> str:
    return os.getenv("KAFKA_TOPIC_EXTRACTION_REQUESTS", "invoice_extraction_requested")


def kafka_consumer_group_id() -> str:
    return os.getenv("KAFKA_CONSUMER_GROUP_ID", "idc-extraction-consumer")

