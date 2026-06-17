from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.celery_app import celery_app
from app.models.extraction_run import ExtractionRun
from app.services.extraction_service import run_extraction_and_prepare_review_version

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.extraction_tasks.run_extraction")
def run_extraction(payload: dict[str, Any]) -> str:
    """Celery entrypoint.

    Celery tasks are sync functions; our extraction pipeline is async.
    We bridge by running an event loop for the coroutine.
    """

    tenant_id = payload["tenant_id"]
    document_id = payload["document_id"]
    extraction_run_id = payload["extraction_run_id"]

    # Ensure extraction pipeline runs as async.
    try:
        asyncio.run(
            run_extraction_and_prepare_review_version(
                tenant_id=tenant_id,
                document_id=document_id,
                extraction_run_id=extraction_run_id,
            )
        )
    except RuntimeError:
        # If an event loop already exists (rare inside Celery worker), fallback.
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(
                run_extraction_and_prepare_review_version(
                    tenant_id=tenant_id,
                    document_id=document_id,
                    extraction_run_id=extraction_run_id,
                )
            )
        finally:
            loop.close()

    return extraction_run_id

