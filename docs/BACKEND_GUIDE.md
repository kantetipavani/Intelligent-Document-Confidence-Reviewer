# Backend Developer Guide

Complete guide for FastAPI backend development, setup, and maintenance.

---

## Table of Contents

1. [Setup & Installation](#setup--installation)
2. [Project Structure](#project-structure)
3. [Configuration](#configuration)
4. [Core Modules](#core-modules)
5. [Database Models](#database-models)
6. [Services](#services)
7. [API Routes](#api-routes)
8. [Testing](#testing)
9. [Debugging](#debugging)
10. [Performance Tips](#performance-tips)
11. [Common Tasks](#common-tasks)

---

## Setup & Installation

### Prerequisites

- Python 3.11+
- MongoDB 4.4+
- pip or poetry
- Anthropic API key

### Step 1: Create Virtual Environment

```bash
cd backend
python -m venv .venv
```

Activate (PowerShell):
```powershell
.\.venv\Scripts\Activate.ps1
```

Activate (macOS/Linux):
```bash
source .venv/bin/activate
```

### Step 2: Install Dependencies

Using pip:
```bash
pip install -r requirements.txt
```

Using poetry:
```bash
poetry install
```

### Step 3: Environment Configuration

Create `.env` in `backend/` directory:

```env
# Anthropic LLM Configuration
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-5-haiku-latest

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=idc_dev

# Application Settings
DEBUG=false
LOG_LEVEL=INFO
SKIP_DB=false

# Optional: CORS Settings
FRONTEND_URL=http://localhost:3000
```

### Step 4: Initialize Database

```bash
python app/db/init_db.py
```

This creates indexes and initial collections in MongoDB.

### Step 5: Start Development Server

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Server runs at: `http://localhost:8000`
API docs: `http://localhost:8000/docs`

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app setup
│   │
│   ├── api/                       # Route handlers
│   │   ├── auth.py               # Authentication routes
│   │   ├── documents.py          # Document management
│   │   ├── extraction.py         # Extraction routes
│   │   ├── reviews.py            # Review/approval workflow
│   │   ├── versions.py           # Version management
│   │   ├── tenants.py            # Tenant management
│   │   ├── activity.py           # Activity/audit logs
│   │   └── health.py             # Health checks
│   │
│   ├── core/
│   │   ├── config.py             # Settings & environment
│   │   └── logging.py            # Structured logging
│   │
│   ├── db/
│   │   └── init_db.py            # Database initialization
│   │
│   ├── models/                   # Data models
│   │   ├── user.py              # User model
│   │   ├── tenant.py            # Tenant model
│   │   ├── document.py          # Document model
│   │   ├── extraction_run.py    # Extraction result
│   │   ├── review_version.py    # Review snapshot
│   │   └── audit_event.py       # Audit event log
│   │
│   ├── services/                # Business logic
│   │   ├── llm_service.py       # Claude API wrapper
│   │   └── extraction_service.py # Extraction logic
│   │
│   └── jobs/                    # Background tasks
│
├── tests/
│   ├── test_llm_invoice_extraction.py
│   └── conftest.py              # Pytest fixtures
│
├── pyproject.toml               # Poetry dependencies
├── requirements.txt             # Pip dependencies
├── .env                         # Environment variables
├── .env.example                 # Example env file
└── README.md
```

---

## Configuration

### core/config.py

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Database
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "idc_dev"
    SKIP_DB: bool = False
    
    # LLM
    ANTHROPIC_API_KEY: str
    ANTHROPIC_MODEL: str = "claude-3-5-haiku-latest"
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### Using Settings

```python
from app.core.config import settings

# Access settings
api_key = settings.ANTHROPIC_API_KEY
db_uri = settings.MONGODB_URI
```

---

## Core Modules

### core/logging.py

Structured logging setup:

```python
import structlog

logger = structlog.get_logger()

# Usage
logger.info("user_login", email="user@example.com", timestamp="...")
logger.error("extraction_failed", error="Invalid PDF", document_id="...")
```

### db/init_db.py

Database initialization:

```python
from beanie import init_beanie
import motor.motor_asyncio

async def init_database():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB],
        models=[User, Document, Extraction, ...]
    )
    
    # Create indexes
    await Document.get_motor_collection().create_index([("tenant_id", 1)])
```

---

## Database Models

### models/user.py

```python
from beanie import Document
from pydantic import EmailStr

class User(Document):
    user_id: str = Field(default_factory=lambda: str(ObjectId()))
    email: EmailStr = Field(unique=True)
    full_name: str
    password_hash: str
    tenant_id: str = "default"
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        collection = "users"
```

### models/document.py

```python
class Document(Document):
    document_id: str = Field(default_factory=lambda: str(ObjectId()))
    tenant_id: str = "default"
    filename: str
    file_path: str
    uploaded_by: str
    status: str = "pending"  # pending, extracted, approved, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        collection = "documents"
```

### models/extraction_run.py

```python
class ExtractionRun(Document):
    extraction_id: str = Field(default_factory=lambda: str(ObjectId()))
    document_id: str
    model_used: str = "claude-3-5-haiku-latest"
    extraction: dict  # Extracted fields with confidence
    status: str = "completed"
    processing_time_ms: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        collection = "extraction_runs"
```

### models/audit_event.py

```python
class AuditEvent(Document):
    event_id: str = Field(default_factory=lambda: str(ObjectId()))
    event_type: str  # extraction_completed, review_approved, etc.
    user_email: str
    document_id: str | None = None
    payload: dict  # Event-specific data
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        collection = "audit_events"
```

---

## Services

### services/llm_service.py

Claude API wrapper:

```python
import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

class LLMService:
    def __init__(self, api_key: str, model: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    async def extract_invoice_fields(self, document_text: str) -> dict:
        """Extract invoice fields using Claude."""
        
        prompt = f"""
        Extract the following invoice fields with confidence scores:
        - invoice_number
        - vendor_name
        - invoice_total
        - date
        - gstin
        
        Document content:
        {document_text}
        
        Return JSON format:
        {{
            "invoice_number": {{"value": "...", "confidence": 0.95}},
            ...
        }}
        """
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse response and return structured data
        return parse_extraction_response(response.content[0].text)
```

### services/extraction_service.py

Business logic for extraction:

```python
from app.models import ExtractionRun, Document
from app.services.llm_service import LLMService

class ExtractionService:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
    
    async def extract_document(self, document_id: str) -> ExtractionRun:
        """Extract fields from document."""
        
        # Get document
        doc = await Document.get(document_id)
        
        # Read file content
        document_text = read_document_content(doc.file_path)
        
        # Call LLM
        extraction_data = await self.llm.extract_invoice_fields(document_text)
        
        # Save extraction
        extraction = ExtractionRun(
            document_id=document_id,
            extraction=extraction_data,
            processing_time_ms=...
        )
        await extraction.save()
        
        # Log event
        await log_activity("extraction_completed", document_id, extraction_data)
        
        return extraction
```

---

## API Routes

### api/auth.py

```python
from fastapi import APIRouter, HTTPException
from pydantic import EmailStr

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
async def register(email: EmailStr, password: str, full_name: str):
    """Register new user."""
    # Validate password strength
    # Hash password
    # Create user in DB
    # Return user_id
    pass

@router.post("/login")
async def login(email: EmailStr, password: str):
    """Login user and return JWT token."""
    # Validate credentials
    # Generate JWT token
    # Return token + user info
    pass

@router.post("/logout")
async def logout(email: EmailStr, token: str = Depends(verify_token)):
    """Logout user."""
    # Invalidate token (optional)
    # Log activity
    pass
```

### api/documents.py

```python
@router.post("/upload")
async def upload_document(
    file: UploadFile,
    tenant_id: str = "default",
    filename: str = None,
    user_email: str = None
):
    """Upload invoice file and trigger extraction."""
    
    # Validate file
    # Save to storage
    # Create document record
    # Trigger extraction
    # Return document + extraction data
    pass
```

### api/extraction.py

```python
@router.post("/extract")
async def extract_document(document_id: str):
    """Extract fields from document."""
    # Get document
    # Call extraction service
    # Return extraction data
    pass
```

### api/activity.py

```python
@router.get("/by-email/{email}")
async def get_user_activity(
    email: str,
    limit: int = 50,
    skip: int = 0,
    token: str = Depends(verify_token)
):
    """Get user activity log."""
    # Query audit events
    # Filter by email
    # Apply pagination
    # Return events
    pass
```

---

## Testing

### Running Tests

```bash
cd backend
pytest                          # Run all tests
pytest -v                       # Verbose output
pytest tests/test_specific.py   # Specific test file
pytest -k "extraction"          # Tests matching keyword
pytest --cov=app                # With coverage report
```

### Writing Tests

```python
import pytest
from app.models import User, Document

@pytest.fixture
async def test_user():
    """Fixture for test user."""
    return User(
        email="test@example.com",
        full_name="Test User",
        password_hash="..."
    )

@pytest.mark.asyncio
async def test_user_creation(test_user):
    """Test user creation."""
    await test_user.save()
    retrieved = await User.get(test_user.id)
    assert retrieved.email == "test@example.com"

@pytest.mark.asyncio
async def test_extraction():
    """Test extraction service."""
    from app.services.extraction_service import ExtractionService
    
    service = ExtractionService(mock_llm_service)
    result = await service.extract_document("doc_123")
    
    assert result.status == "completed"
    assert "invoice_number" in result.extraction
```

### Test Fixtures (conftest.py)

```python
import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

@pytest.fixture(scope="session")
async def db():
    """Initialize test database."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["idc_test"]
    
    yield db
    
    # Cleanup
    await client.drop_database("idc_test")

@pytest.fixture
async def mock_llm_service():
    """Mock LLM service."""
    class MockLLM:
        async def extract_invoice_fields(self, text):
            return {
                "invoice_number": {"value": "INV-001", "confidence": 0.95},
                "vendor_name": {"value": "Test Corp", "confidence": 0.92}
            }
    return MockLLM()
```

---

## Debugging

### Enable Debug Mode

Set in `.env`:
```env
DEBUG=true
LOG_LEVEL=DEBUG
```

### Using Python Debugger

```python
import pdb

async def extract_document(document_id: str):
    pdb.set_trace()  # Breakpoint
    doc = await Document.get(document_id)
    # ... rest of code
```

### Using FastAPI Debug Middleware

```python
from fastapi import FastAPI

app = FastAPI()

if settings.DEBUG:
    @app.middleware("http")
    async def debug_middleware(request, call_next):
        print(f"Request: {request.method} {request.url}")
        response = await call_next(request)
        print(f"Response: {response.status_code}")
        return response
```

### Viewing Logs

```bash
# Follow logs in real-time
tail -f logs/app.log

# Filter logs
grep "extraction_completed" logs/app.log

# Count errors
grep "ERROR" logs/app.log | wc -l
```

---

## Performance Tips

### 1. Use Async/Await Properly

```python
# ✅ Good - async all the way
async def process_document(doc_id: str):
    doc = await Document.get(doc_id)
    extraction = await extract_fields(doc)
    return extraction

# ❌ Bad - blocking operations
def process_document(doc_id: str):
    doc = Document.get(doc_id)  # Blocks
    extraction = extract_fields(doc)  # Blocks
    return extraction
```

### 2. Database Indexing

```python
class Document(Document):
    tenant_id: str = Field(index=True)
    user_email: str = Field(index=True)
    created_at: datetime = Field(index=True)
    
    class Settings:
        indexes = [
            ("tenant_id", 1),
            ("user_email", 1),
            ("created_at", -1)
        ]
```

### 3. Connection Pooling

```python
client = motor.motor_asyncio.AsyncIOMotorClient(
    settings.MONGODB_URI,
    maxPoolSize=50,
    minPoolSize=10,
    serverSelectionTimeoutMS=5000
)
```

### 4. Batch Operations

```python
# ✅ Good - batch insert
documents = [Document(...), Document(...), ...]
await Document.insert_many(documents)

# ❌ Bad - loop insert
for doc in documents:
    await doc.save()  # N database calls
```

### 5. Caching

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_extraction_template():
    """Cache extraction template."""
    return {...}
```

---

## Common Tasks

### Adding a New API Endpoint

1. Create route handler in `api/endpoint.py`:
```python
from fastapi import APIRouter

router = APIRouter(prefix="/resource", tags=["resource"])

@router.get("/{id}")
async def get_resource(id: str):
    """Get resource by ID."""
    pass
```

2. Register in `main.py`:
```python
from app.api import resource

app.include_router(resource.router)
```

3. Add tests in `tests/test_resource.py`

### Adding a New Database Model

1. Create model in `models/new_model.py`:
```python
from beanie import Document

class NewModel(Document):
    field_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        collection = "new_models"
```

2. Register in `db/init_db.py`:
```python
from app.models import NewModel

await init_beanie(
    database=...,
    models=[..., NewModel]
)
```

3. Create migrations (if needed)

### Calling External APIs

```python
import httpx

async def call_external_api(url: str, payload: dict):
    """Call external API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()
```

### Error Handling

```python
from fastapi import HTTPException

@router.get("/document/{doc_id}")
async def get_document(doc_id: str):
    doc = await Document.get(doc_id)
    
    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )
    
    return doc
```

### Authentication Middleware

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_token(credentials: HTTPBearer = Depends(security)):
    """Verify JWT token."""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            "secret_key",
            algorithms=["HS256"]
        )
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/protected")
async def protected_route(token = Depends(verify_token)):
    return {"message": "Accessed"}
```

---

## Deployment Checklist

- [ ] Set DEBUG=false
- [ ] Use production MongoDB URI
- [ ] Configure CORS for production domain
- [ ] Set strong JWT secret
- [ ] Enable HTTPS
- [ ] Set up logging/monitoring
- [ ] Configure error tracking (Sentry)
- [ ] Test all API endpoints
- [ ] Run full test suite
- [ ] Review security settings
- [ ] Document environment variables
- [ ] Set up backup strategy

---

## Useful Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Format code
black app/

# Lint code
ruff check app/

# Type check
mypy app/

# Run tests
pytest

# Generate requirements
pip freeze > requirements.txt

# Access MongoDB
mongo mongodb://localhost:27017/idc_dev

# View API docs
# http://localhost:8000/docs

# Generate API schema
python -c "import json; from app.main import app; print(json.dumps(app.openapi()))"
```

---

## Resource Links

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Beanie ODM Docs](https://beanie-odm.readthedocs.io/)
- [Motor Documentation](https://motor.readthedocs.io/)
- [Pydantic Docs](https://docs.pydantic.dev/)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [MongoDB Docs](https://docs.mongodb.com/)

