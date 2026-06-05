from __future__ import annotations

from beanie import Document
from pydantic import Field


class Tenant(Document):
    name: str = Field(min_length=1, max_length=200)

    class Settings:
        name = "tenants"

