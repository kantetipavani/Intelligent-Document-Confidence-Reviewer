from __future__ import annotations

from celery import Celery

from app.celery_config import celery_broker_url, celery_result_backend


def make_celery_app() -> Celery:
    broker_url = celery_broker_url()
    result_backend = celery_result_backend()


    app = Celery(
        "idc_back",  # name is used in worker logs
        broker=broker_url,
        backend=result_backend,
    )

    # Keep config minimal and predictable for Docker.
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        broker_connection_retry_on_startup=True,
    )

    return app


celery_app = make_celery_app()

