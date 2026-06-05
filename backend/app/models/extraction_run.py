from __future__ import annotations

from beanie import Document
from pydantic import Field
from typing import Any, Optional
from datetime import datetime


class ExtractionRun(Document):
    tenant_id: str = Field(min_length=1)
    document_id: str = Field(min_length=1)

    status: str = Field(default="queued")  # queued|running|completed|failed
    error: Optional[str] = None

    # Structured output produced by LLM (scaffold stores as JSON/dict)
    result: Optional[dict[str, Any]] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "extraction_runs"

