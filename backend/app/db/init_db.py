import logging
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

logger = logging.getLogger(__name__)


async def init_db() -> None:
    # Allow importing/starting the API in minimal environments (like unit tests)
    # where Mongo/Motor isn't installed.
    if AsyncIOMotorClient is None:  # pragma: no cover
        raise ModuleNotFoundError("motor")

    uri = settings.mongodb_uri
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)

    try:
        await client.admin.command({"ping": 1})
    except Exception as exc:
        # If default or configured URI fails and contains "mongo", try localhost/127.0.0.1
        # which is common when running directly on a host machine with local MongoDB.
        candidates = []
        if "mongo:27017" in uri or "mongodb://mongo" in uri:
            candidates.append(
                uri.replace("mongo:27017", "127.0.0.1:27017").replace("mongodb://mongo", "mongodb://127.0.0.1")
            )
        elif "127.0.0.1" not in uri and "localhost" not in uri:
            candidates.append("mongodb://127.0.0.1:27017")

        connected = False
        for fallback_uri in candidates:
            try:
                logger.info("Attempting MongoDB fallback connection to %s", fallback_uri)
                fallback_client = AsyncIOMotorClient(fallback_uri, serverSelectionTimeoutMS=2000)
                await fallback_client.admin.command({"ping": 1})
                client = fallback_client
                settings.mongodb_uri = fallback_uri
                connected = True
                logger.info("Connected to MongoDB via fallback URI: %s", fallback_uri)
                break
            except Exception:
                continue

        if not connected:
            raise exc

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
    # Reset skip_db if it was previously set due to a transient failure
    settings.skip_db = False

