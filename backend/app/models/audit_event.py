from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from beanie import Document
from pydantic import Field


class AuditEvent(Document):
    tenant_id: Optional[str] = Field(default=None)
    user_email: Optional[str] = Field(default=None, max_length=255)

    # Examples: login, logout, change_password, extraction_triggered,
    # extraction_completed, review_action, document_retrieved, version_retrieved
    event_type: str = Field(min_length=1, max_length=100)

    # Extra structured data (document_id, filename, version_number, etc.)
    payload: dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audit_events"

