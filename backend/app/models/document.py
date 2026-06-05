from __future__ import annotations

from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime


class Document(Document):
    tenant_id: str = Field(min_length=1)
    filename: str = Field(min_length=1, max_length=500)
    content_type: Optional[str] = Field(default=None, max_length=200)

    # For scaffold: we store extracted text placeholder
    source_text: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "documents"

    async def touch(self) -> None:
        from datetime import datetime

        self.updated_at = datetime.utcnow()
        await self.save()

