# Intelligent Document Confidence Reviewer

AI-assisted document extraction and review platform built with FastAPI, Next.js, MongoDB, WebSockets, and optional Kafka workers.

## What It Does

- Upload PDF, DOC, DOCX, and TXT files
- Extract invoice and document fields with confidence scores
- Review extracted values in a dashboard UI
- Track extraction versions and audit activity
- Support multi-tenant isolation and role-based access
- Stream live updates over WebSockets

## Project Docs

- [Full project documentation](docs/PROJECT_DOCUMENTATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API_DOCUMENTATION.md)
- [Backend guide](docs/BACKEND_GUIDE.md)
- [Frontend guide](docs/FRONTEND_GUIDE.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Contributing guide](docs/CONTRIBUTING.md)

## Repository Layout

- `backend/` - FastAPI app, workers, models, services, and tests
- `frontend/` - Next.js app, components, hooks, and pages
- `docs/` - Architecture, API, and developer documentation
- `postman/` - API collection
- `results/` - Load-test output and CSV reports
- `shared/` - Shared helper assets

## Quick Start

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\.env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
copy ..\.env.example .env.local
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`

## Key Features

- JWT-based authentication and password reset flows
- Tenant-scoped document storage and extraction
- Synchronous upload-time extraction for immediate UI feedback
- Optional asynchronous extraction pipeline via Kafka or background tasks
- Review versioning and confidence dashboards
- Activity and audit tracking
- WebSocket delivery for document status updates

## Development Notes

- Backend config is loaded from environment variables in `backend/app/core/config.py`
- Frontend API base URL comes from `NEXT_PUBLIC_API_URL`
- The project includes unit tests, smoke tests, and Locust load-test scripts

## License

No license file is currently included in the repository.
