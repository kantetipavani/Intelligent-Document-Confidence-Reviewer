from __future__ import annotations

import os


def celery_broker_url() -> str:
    return os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")


def celery_result_backend() -> str:
    return os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/1")

