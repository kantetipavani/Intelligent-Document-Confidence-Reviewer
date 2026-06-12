from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.extraction import router as extraction_router
from app.api.status import router as status_router
from app.api.health import router as health_router

from app.api.reviews import router as reviews_router
from app.api.tenants import router as tenants_router
from app.api.versions import router as versions_router
from app.api.activity import router as activity_router
from app.api.logout import router as logout_router

from app.core.config import settings
from app.db.init_db import init_db


logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title="Intelligent Document Confidence Reviewer")

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
                logger.warning("MongoDB initialization failed; running without persistence: %s", exc)

        # Start background extraction worker.
        # Runs alongside the FastAPI server and consumes from the in-process asyncio queue.
        try:
            from app.workers.extraction_worker import extraction_worker_loop

            asyncio.create_task(extraction_worker_loop())
        except Exception:
            logger.exception("Failed to start extraction worker")


    app.include_router(health_router, prefix="/health", tags=["health"])
    app.include_router(status_router, prefix="/documents", tags=["documents"])

    app.include_router(tenants_router, prefix="/tenants", tags=["tenants"])

    app.include_router(documents_router, prefix="/documents", tags=["documents"])


    app.include_router(extraction_router, prefix="/extraction", tags=["extraction"])
    app.include_router(versions_router, prefix="/versions", tags=["versions"])
    app.include_router(reviews_router, prefix="/reviews", tags=["reviews"])
    app.include_router(auth_router, prefix="/auth", tags=["auth"])
    app.include_router(activity_router, prefix="/activity", tags=["activity"])
    app.include_router(logout_router, prefix="/auth", tags=["auth"])


    return app



app = create_app()

