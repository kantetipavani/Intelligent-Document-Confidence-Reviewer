from __future__ import annotations

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.tenant import Tenant
from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.models.review_version import ReviewVersion
from app.models.user import User
from app.models.audit_event import AuditEvent


async def init_db() -> None:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.mongodb_db],
        document_models=[Tenant, Document, ExtractionRun, ReviewVersion, User, AuditEvent],
    )



