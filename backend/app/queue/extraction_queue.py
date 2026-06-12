from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Optional


# In-process async queue used by a background worker coroutine.
# This is intentionally simple (no external broker) for the current codebase.
extraction_queue: asyncio.Queue["ExtractionJob"] = asyncio.Queue()


@dataclass(frozen=True)
class ExtractionJob:
    tenant_id: str
    document_id: str
    file_bytes: bytes
    filename: str


async def publish_extraction_job(job: ExtractionJob) -> None:
    """Publish a job to the background extraction queue."""
    await extraction_queue.put(job)


def queue_size() -> int:
    try:
        return extraction_queue.qsize()
    except Exception:
        return -1

