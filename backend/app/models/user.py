from __future__ import annotations

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field


class User(Document):
    email: str = Field(min_length=3, max_length=255)
    # NOTE: store password hash, not raw password
    password_hash: str
    tenant_id: str = Field(min_length=1)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"

    async def touch(self) -> None:
        self.updated_at = datetime.utcnow()
        await self.save()


# Minimal helper for case-insensitive uniqueness checks.
# Email normalization should be done at API layer.

def normalize_email(email: str) -> str:
    return email.strip().lower()

