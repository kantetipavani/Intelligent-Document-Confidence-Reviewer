from __future__ import annotations
from app.api.ws import router as ws_router
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.activity import router as activity_router
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.documents import router as documents_router
from app.api.extraction import router as extraction_router
from app.api.health import router as health_router
from app.api.logout import router as logout_router
from app.api.metrics import router as metrics_router
from app.api.reviews import router as reviews_router
from app.api.status import router as status_router
from app.api.tenants import router as tenants_router
from app.api.versions import router as versions_router

from app.core.config import settings
from app.db.init_db import init_db

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    from aiokafka import AIOKafkaProducer

    # OpenTelemetry (optional)
    from app.core.otel import configure_otel
    from app.core.tracing import configure_tracing


    from app.kafka_config import kafka_bootstrap_servers


    @asynccontextmanager
    async def lifespan(app: FastAPI):
        producer: AIOKafkaProducer | None = None

        # Local dev: Kafka host ("kafka") is not resolvable on a non-Docker run.
        # Default to disabled unless explicitly enabled.
        kafka_enabled = os.getenv("KAFKA_ENABLED", "false").lower() in {"1", "true", "yes", "on"}
        if kafka_enabled:

            try:
                producer = AIOKafkaProducer(bootstrap_servers=kafka_bootstrap_servers())
                # Fail fast so uvicorn startup isn't blocked for a long time.
                await producer.start()
                app.state.kafka_producer = producer
                logger.info("Kafka producer initialized")
            except Exception:
                # Kafka is optional in dev. Routes will fall back to direct processing.
                logger.exception(
                    "Failed to initialize Kafka producer; continuing without it. bootstrap=%s",
                    kafka_bootstrap_servers(),
                )
                app.state.kafka_producer = None
        else:
            app.state.kafka_producer = None

        yield

        try:
            if producer is not None:
                await producer.stop()
        except Exception:
            logger.exception("Failed to stop Kafka producer")

    app = FastAPI(
        title="Intelligent Document Confidence Reviewer",
        lifespan=lifespan,
    )

    configure_otel(app)
    configure_tracing(app)


    # Dev-friendly CORS so browser preflight (OPTIONS) works reliably.

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    async def _startup() -> None:
        # Initialize MongoDB + Beanie models so `await doc.insert()` works.
        if not settings.skip_db:
            try:
                await init_db()
            except Exception as exc:
                settings.skip_db = True
                logger.warning(
                    "MongoDB initialization failed; running without persistence: %s",
                    exc,
                )

        # Start Kafka consumers (event-driven extraction/audit/review).
        # If Kafka is not reachable, we log and continue with legacy paths.
        kafka_enabled = os.getenv("KAFKA_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
        if kafka_enabled:
            try:
                from app.kafka.consumers.extraction_consumer import run_extraction_consumer
                from app.kafka.consumers.audit_consumer import run_audit_consumer
                from app.kafka.consumers.review_consumer import run_review_consumer

                stop_event = asyncio.Event()
                asyncio.create_task(run_extraction_consumer(stop_event=stop_event))
                asyncio.create_task(run_audit_consumer(stop_event=stop_event))
                asyncio.create_task(run_review_consumer(stop_event=stop_event))
            except Exception:
                logger.exception("Failed to start Kafka consumers")

        # Legacy in-process worker (kept for backward compatibility).
        try:
            from app.workers.extraction_worker import extraction_worker_loop

            asyncio.create_task(extraction_worker_loop())
        except Exception:
            logger.exception("Failed to start extraction worker")


    app.include_router(health_router, prefix="/health", tags=["health"])
    app.include_router(metrics_router, prefix="/metrics", tags=["metrics"])
    app.include_router(status_router, prefix="/documents", tags=["documents"])

    # WebSocket endpoints (token via query param)
    app.include_router(ws_router, tags=["websocket"])

    app.include_router(tenants_router, prefix="/tenants", tags=["tenants"])
    app.include_router(documents_router, prefix="/documents", tags=["documents"])

    app.include_router(extraction_router, prefix="/extraction", tags=["extraction"])
    app.include_router(versions_router, prefix="/versions", tags=["versions"])
    app.include_router(reviews_router, prefix="/reviews", tags=["reviews"])
    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    app.include_router(activity_router, prefix="/activity", tags=["activity"])
    app.include_router(logout_router, prefix="/auth", tags=["auth"])

    # Confidence dashboard (tenant scoped; uses audit events as a lightweight datasource)
    from app.api.confidence_dashboard import router as confidence_dashboard_router

    app.include_router(
        confidence_dashboard_router,
        prefix="/dashboard",
        tags=["dashboard"],
    )

    return app



app = create_app()

