from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.queue.extraction_queue import ExtractionJob, extraction_queue
from app.services.llm_service import extract_invoice_from_document_bytes
from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.services.version_service import create_review_version
from app.models.review_version import ReviewVersion

logger = logging.getLogger(__name__)


async def _get_run_for_document(tenant_id: str, document_id: str) -> ExtractionRun | None:
    runs = await ExtractionRun.find(
        {"tenant_id": tenant_id, "document_id": document_id}
    ).sort("-created_at").limit(1).to_list()
    return runs[0] if runs else None


async def _set_run_status(run: ExtractionRun, *, status: str, error: str | None = None, result: dict[str, Any] | None = None) -> None:
    run.status = status
    run.error = error
    if result is not None:
        run.result = result
    await run.save()


async def extraction_worker_loop(*, poll_forever: bool = True) -> None:
    """Background worker consuming extraction jobs.

    Never crashes the app. Logs errors and continues.
    """

    while True:
        try:
            job: ExtractionJob = await extraction_queue.get()
        except asyncio.CancelledError:
            logger.info("extraction_worker_loop cancelled")
            return

        try:
            doc = await Document.get(job.document_id)
            if not doc or doc.tenant_id != job.tenant_id:
                logger.warning(
                    "Skipping extraction: document missing/tenant mismatch document_id=%s tenant_id=%s",
                    job.document_id,
                    job.tenant_id,
                )
                continue

            run = await _get_run_for_document(job.tenant_id, job.document_id)
            if not run:
                # Create a queued run if missing.
                run = ExtractionRun(
                    tenant_id=job.tenant_id,
                    document_id=job.document_id,
                    status="queued",
                )
                await run.insert()

            await _set_run_status(run, status="running")

            extraction_result = await extract_invoice_from_document_bytes(
                file_bytes=job.file_bytes,
                content_type=doc.content_type,
                filename=job.filename,
            )

            result_dict = extraction_result.model_dump()

            await _set_run_status(run, status="completed", error=None, result=result_dict)

            # Create immutable review version using the extracted snapshot.
            await create_review_version(
                tenant_id=job.tenant_id,
                document_id=job.document_id,
                extraction_run_id=str(run.id),
                snapshot=result_dict,
                action="ai_pass",
                reviewer_user_id=None,
            )

        except Exception:
            logger.exception("Extraction worker failed for job=%s", job)
            try:
                # Best-effort: if we can resolve run, mark failed.
                run = await _get_run_for_document(job.tenant_id, job.document_id)
                if run:
                    await _set_run_status(run, status="failed", error="extraction_failed")
            except Exception:
                logger.exception("Failed to mark extraction run as failed")

        finally:
            try:
                extraction_queue.task_done()
            except Exception:
                pass

        if not poll_forever:
            return

