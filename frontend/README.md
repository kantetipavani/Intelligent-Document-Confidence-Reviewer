# INDCR - Intelligent Document Confidence Reviewer

A full-stack invoice extraction and review platform powered by AI. Extract invoice data with Claude LLM, review with confidence scores, track document versions, and manage multi-tenant audit trails.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [API Endpoints](#api-endpoints)
- [Features](#features)
- [Architecture](#architecture)
- [Testing](#testing)

---

## Overview

**INDCR** is an intelligent document reviewer that:
- 📄 Extracts invoice data using Claude LLM (Anthropic)
- ✅ Provides per-field confidence scores
- 📊 Displays extracted fields in an interactive dashboard
- 👤 Manages multi-tenant document storage
- 📝 Tracks audit trails and user activity
- 🔄 Maintains document versions with extraction history
- 🔐 Implements user authentication and authorization

### Key Features
- **AI-Powered Extraction**: Claude 3.5 Haiku extracts invoice fields with confidence scores
- **Split-Pane Interface**: PDF viewer + extracted fields in real-time
- **Activity Tracking**: User audit logs and event history
- **Multi-Tenant**: Tenant isolation with document versioning
- **Responsive UI**: Built with Next.js and modern styling
- **API-First**: RESTful backend with FastAPI

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| **Framework** | FastAPI 0.115+ |
| **Language** | Python 3.11+ |
| **Database** | MongoDB + Beanie ODM |
| **LLM** | Anthropic Claude API |
| **Async** | Motor (async MongoDB driver) |
| **Validation** | Pydantic v2 |
| **Server** | Uvicorn |
| **Testing** | pytest, pytest-asyncio |

### Frontend
| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 14 |
| **Language** | TypeScript |
| **Styling** | styled-jsx + CSS |
| **State** | Custom hooks + local storage |
| **HTTP Client** | Axios |
| **PDF Viewer** | React-based PDFViewer component |

---

## Project Structure

```
INDCR/
├── backend/                      # FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI app initialization
│   │   ├── api/                 # Route handlers
│   │   │   ├── activity.py      # User activity & audit logs
│   │   │   ├── auth.py          # Login, register, logout
│   │   │   ├── documents.py     # Upload, retrieve documents
│   │   │   ├── extraction.py    # Extract invoice data
│   │   │   ├── reviews.py       # Review/approval workflow
│   │   │   ├── tenants.py       # Multi-tenant management
│   │   │   ├── versions.py      # Document versioning
│   │   │   ├── health.py        # Health check endpoint
│   │   │   └── logout.py        # User logout
│   │   ├── core/
│   │   │   ├── config.py        # Environment & settings
│   │   │   └── logging.py       # Structured logging
│   │   ├── db/
│   │   │   └── init_db.py       # Database initialization
│   │   ├── models/              # Pydantic & Beanie models
│   │   │   ├── user.py
│   │   │   ├── tenant.py
│   │   │   ├── document.py
│   │   │   ├── extraction_run.py
│   │   │   ├── review_version.py
│   │   │   └── audit_event.py
│   │   ├── services/            # Business logic
│   │   │   ├── extraction_service.py  # LLM extraction
│   │   │   └── llm_service.py         # Claude API wrapper
│   │   └── jobs/                # Background tasks
│   ├── tests/
│   │   └── test_llm_invoice_extraction.py
│   ├── pyproject.toml           # Dependencies & config
│   ├── requirements.txt
│   └── README.md
│
├── frontend/                     # Next.js React application
│   ├── pages/
│   │   ├── _app.tsx             # App wrapper
│   │   ├── index.tsx            # Home/login
│   │   ├── login.tsx            # Login page
│   │   ├── register.tsx         # Registration page
│   │   ├── profile.tsx          # User profile
│   │   ├── dashboard.tsx        # Main dashboard
│   │   ├── file.tsx             # File detail page
│   │   ├── [id].tsx             # Dynamic document view
│   │   └── documents/           # Document listing
│   ├── components/              # React components
│   │   ├── layout.tsx           # Main layout wrapper
│   │   ├── topbar.tsx           # Navigation topbar
│   │   ├── PDFViewer.tsx        # PDF display
│   │   ├── ExtractedFields.tsx  # Extracted data display
│   │   ├── DiffViewer.tsx       # Version comparison
│   │   ├── VersionHistory.tsx   # Document versions
│   │   ├── ConfidenceBadge.tsx  # Confidence indicator
│   │   └── [id].tsx             # Dynamic routes
│   ├── services/
│   │   ├── api.ts               # HTTP client (axios)
│   │   └── auth.ts              # Auth helpers
│   ├── store/
│   │   └── authStore.ts         # Auth state
│   ├── hooks/
│   │   └── useDocuments.ts      # Document hooks
│   ├── styles/                  # CSS modules
│   │   ├── globals.css
│   │   ├── dashboard.css
│   │   ├── document.css
│   │   └── pdfviewer.css
│   ├── package.json
│   ├── tsconfig.json
│   └── next-env.d.ts
│
├── shared/                      # Shared types (optional)
├── README.md                    # This file
└── TODO.md                      # Development roadmap
```

---

## Quick Start

### Prerequisites
- **Python** 3.11+
- **Node.js** 18+
- **MongoDB** 4.4+ (or set `SKIP_DB=true` in `.env` for API-only testing)
- **Anthropic API Key** (from https://console.anthropic.com)

### 1️⃣ Clone & Navigate
```bash
cd "c:\Users\pavan\Documents\INDCR pro1\INDCR"
```

### 2️⃣ Backend + Frontend (Simultaneous)
Open **two terminals**:

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-latest
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=idc_dev
SKIP_DB=false
```

Start server:
```bash
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 3️⃣ Access the App
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)

---

## Backend Setup

### Detailed Steps

1. **Create Virtual Environment**
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure `.env`**
   ```env
   # LLM Configuration
   ANTHROPIC_API_KEY=your_key_here
   ANTHROPIC_MODEL=claude-3-5-haiku-latest
   
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB=idc_dev
   SKIP_DB=false          # Set to true to skip DB (API only)
   
   # Server Configuration
   DEBUG=false
   LOG_LEVEL=INFO
   ```

4. **Run Database Migrations** (if needed)
   ```powershell
   python app/db/init_db.py
   ```

5. **Start Development Server**
   ```powershell
   python -m uvicorn app.main:app --reload --port 8000
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key | Required |
| `ANTHROPIC_MODEL` | Claude model version | `claude-3-5-haiku-latest` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DB` | Database name | `idc_dev` |
| `SKIP_DB` | Skip database (API-only mode) | `false` |
| `DEBUG` | Debug mode | `false` |
| `LOG_LEVEL` | Logging level | `INFO` |

---

## Frontend Setup

### Detailed Steps

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API Endpoint**
   Edit `frontend/services/api.ts`:
   ```typescript
   const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Access at: http://localhost:3000

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

### NPM Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript check |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login user |
| `POST` | `/auth/logout` | Logout user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/documents/upload` | Upload invoice file (PDF/DOC/TXT) |
| `GET` | `/documents/{document_id}` | Get document details |
| `GET` | `/documents/list` | List all documents |

### Extraction
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/extraction/extract` | Trigger extraction on document |
| `GET` | `/extraction/{extraction_id}` | Get extraction result |
| `GET` | `/versions/latest/{document_id}` | Get latest extraction version |

### Versions & Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/versions/list/{document_id}` | List all versions of a document |
| `POST` | `/reviews/approve` | Approve extracted data |
| `POST` | `/reviews/reject` | Reject extracted data |

### Activity & Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/activity/by-email/{email}` | Get user activity log |
| `GET` | `/activity/audit/{document_id}` | Get document audit trail |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

### Example: Upload & Extract
```bash
curl -X POST "http://localhost:8000/documents/upload" \
  -F "tenant_id=default" \
  -F "filename=invoice.pdf" \
  -F "user_email=user@example.com" \
  -F "file=@invoice.pdf"
```

Response:
```json
{
  "document_id": "507f1f77bcf86cd799439011",
  "status": "extracted",
  "extraction": {
    "invoice_number": {
      "value": "INV-1001",
      "confidence": 0.96
    },
    "vendor_name": {
      "value": "Acme Supplies",
      "confidence": 0.91
    },
    "invoice_total": {
      "value": "INR 12,500.00",
      "confidence": 0.88
    }
  }
}
```

---

## Features

### ✅ Implemented
- ✔️ User registration & login with email
- ✔️ Invoice PDF/DOC/TXT upload
- ✔️ Claude LLM extraction with per-field confidence
- ✔️ Multi-tenant document management
- ✔️ Document versioning with history
- ✔️ Activity audit trail & event logging
- ✔️ Responsive split-pane dashboard
- ✔️ Extracted fields display with confidence badges
- ✔️ PDF viewer integration
- ✔️ User profile management

### 🚀 In Progress / Planned
- [ ] Advanced extraction with custom prompts
- [ ] Batch processing for multiple invoices
- [ ] Export to Excel/CSV
- [ ] Email notifications
- [ ] Role-based access control (RBAC)
- [ ] Advanced analytics & reporting
- [ ] OCR preprocessing
- [ ] Custom field mapping

---

## Architecture

### High-Level Flow

```
User (Frontend) 
    ↓
Next.js Dashboard
    ↓ (HTTP/JSON)
FastAPI Backend
    ↓
LLM Service (Anthropic Claude)
    ↓
MongoDB (Storage)
    ↓ (Response)
Extracted Fields → Frontend Display
```

### Key Components

**Frontend:**
- **Dashboard**: Main hub with sidebar navigation
- **Activity Panel**: Shows extraction events and audit logs
- **Extracted Fields**: Displays OCR results with confidence
- **PDF Viewer**: Interactive document preview
- **Auth Store**: Manages user session

**Backend:**
- **API Layer**: RESTful endpoints via FastAPI
- **Services**: Business logic (LLM extraction, versioning)
- **Models**: Pydantic schemas & Beanie ODM models
- **Database**: MongoDB for persistence
- **LLM Integration**: Claude API wrapper with retry logic

---

## Testing

### Backend Tests

Run all tests:
```bash
cd backend
pytest
```

Run specific test:
```bash
pytest tests/test_llm_invoice_extraction.py -v
```

Test coverage:
```bash
pytest --cov=app tests/
```

**Note**: Tests mock the Anthropic API call and do not require a live key.

### Frontend Testing (TBD)
- Unit tests with Jest/Testing Library
- E2E tests with Playwright

---

## Development Workflow

### Making Changes

**Backend:**
1. Edit files in `backend/app/`
2. Dev server auto-reloads
3. Check API docs: http://localhost:8000/docs

**Frontend:**
1. Edit files in `frontend/pages/` or `frontend/components/`
2. Dev server auto-refreshes
3. Check browser: http://localhost:3000

### Code Style

**Backend:**
```bash
cd backend
black .                 # Format code
ruff check .           # Lint
mypy app/              # Type check
```

**Frontend:**
```bash
cd frontend
npm run lint           # ESLint
npm run type-check     # TypeScript
```

---

## Deployment

### Production Backend
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Production Frontend
```bash
cd frontend
npm run build
npm start
```

For cloud deployment (AWS/GCP/Azure), consult platform-specific guides.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **MongoDB connection fails** | Ensure MongoDB is running: `mongod` or set `SKIP_DB=true` |
| **Anthropic API errors** | Verify API key in `.env` and account has credits |
| **Frontend can't reach backend** | Check backend URL in `services/api.ts` |
| **Port 3000/8000 in use** | Change port: `npm run dev -- -p 3001` or `--port 8001` |
| **Module not found errors** | Run `npm install` (frontend) or activate venv (backend) |

---

## Project Maintainers

- **Backend**: Python/FastAPI
- **Frontend**: React/Next.js
- **LLM Integration**: Anthropic Claude API

---

## License

Internal project. All rights reserved.

---

## Support & Documentation

- **API Docs**: http://localhost:8000/docs
- **Backend README**: [backend/README.md](backend/README.md)
- **Frontend Config**: Check `frontend/package.json`
- **MongoDB Docs**: https://docs.mongodb.com/
- **Anthropic API**: https://docs.anthropic.com/

