from __future__ import annotations

from beanie import Document
from pydantic import Field
from typing import Any, Optional
from datetime import datetime


class ReviewVersion(Document):
    tenant_id: str = Field(min_length=1)
    document_id: str = Field(min_length=1)
    extraction_run_id: str = Field(min_length=1)

    version_number: int = Field(ge=1)

    reviewer_user_id: Optional[str] = Field(default=None)
    action: str = Field(default="ai_pass")  # ai_pass|review|approve

    # Immutable snapshot of extraction fields (including confidence)
    snapshot: dict[str, Any]

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "review_versions"

