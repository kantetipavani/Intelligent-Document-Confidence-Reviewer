from __future__ import annotations

# Celery worker entrypoint.
# Usage (in container):
#   celery -A app.celery_worker_entrypoint.celery_app worker -l INFO -Q extraction

from app.celery_app import celery_app

# Ensure tasks are registered.
import app.tasks.extraction_tasks  # noqa: F401


