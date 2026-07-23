from __future__ import annotations

from beanie import init_beanie

try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ModuleNotFoundError:  # pragma: no cover
    AsyncIOMotorClient = None  # type: ignore[assignment]

from app.core.config import settings
from app.models.audit_event import AuditEvent
from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.models.password_reset_otp import PasswordResetOTP
from app.models.review_version import ReviewVersion
from app.models.tenant import Tenant
from app.models.user import User


async def init_db() -> None:
    # Allow importing/starting the API in minimal environments (like unit tests)
    # where Mongo/Motor isn't installed.
    if AsyncIOMotorClient is None:  # pragma: no cover
        raise ModuleNotFoundError("motor")

    # Ensure Mongo is reachable before Beanie initialization.
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await client.admin.command({"ping": 1})

    await init_beanie(
        database=client[settings.mongodb_db],
        document_models=[
            Tenant,
            Document,
            ExtractionRun,
            ReviewVersion,
            User,
            AuditEvent,
            PasswordResetOTP,
        ],
    )

