# TODO Deliverable: Redis + Celery + Flower integration

## Planned changes
- [ ] Add Redis, Celery worker, and Flower to `docker-compose.yml`.
- [ ] Add Celery app/config in backend.
- [ ] Create a Celery task that runs the existing extraction pipeline.
- [ ] Update extraction API to trigger Celery asynchronously.
- [ ] Ensure status transitions update `ExtractionRun` and create review versions.
- [ ] Update backend dependencies (`backend/requirements.txt`).
- [ ] Update docs / evaluation report text so it matches actual services/workflows built.

## Demo notes
- [ ] Add a README note reminding Docker Desktop must be running.

