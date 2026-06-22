<div align="center">
  <h1>🚀 INDCR</h1>
  <h3>Intelligent Document Confidence Reviewer</h3>
  <p><em>AI-Powered Invoice Extraction & Review Platform</em></p>
  
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-00a651?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Latest-00ed64?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
  [![Anthropic](https://img.shields.io/badge/Anthropic%20Claude-API-000000?style=for-the-badge)](https://www.anthropic.com/)

  <br/>

  
  **[🎯 Features](#-features) • [⚡ Quick Start](#-quick-start) • [📚 Documentation](./docs/README.md) • [🤝 Contributing](#-contributing) • [📞 Support](#-support)**
  
</div>

<div align="center">
  
  > 💡 **Transform your invoice processing with AI-powered extraction and intelligent review workflows**
  
</div>

## 🎯 Overview

<div align="center">
  
**INDCR** is a **full-stack, AI-powered invoice extraction and review platform** that combines the power of Large Language Models (Claude 3.5 Haiku) with an intuitive user interface.

</div>

### What It Does

<table>
  <tr>
    <td><strong>1️⃣ Upload</strong></td>
    <td>📤 Users upload PDF/DOC/TXT files</td>
  </tr>
  <tr>
    <td><strong>2️⃣ Extract</strong></td>
    <td>🤖 Claude LLM extracts key fields with confidence scores</td>
  </tr>
  <tr>
    <td><strong>3️⃣ Review</strong></td>
    <td>👁️ Users review extracted data in a split-pane interface</td>
  </tr>
  <tr>
    <td><strong>4️⃣ Track</strong></td>
    <td>📊 Track all extraction versions and changes</td>
  </tr>
  <tr>
    <td><strong>5️⃣ Audit</strong></td>
    <td>📋 Complete activity logging for compliance</td>
  </tr>
</table>

### Why Choose INDCR? ✨

| Benefit | Description |
|---------|-------------|
| 🎯 **Accuracy** | AI-powered extraction with per-field confidence scores |
| ⚡ **Speed** | Process invoices in seconds, not minutes |
| 🔍 **Transparency** | See extraction confidence and source text |
| 📊 **Analytics** | Track extraction performance over time |
| 🔐 **Enterprise-Ready** | Multi-tenant, role-based access, audit logs |
| 🌐 **Modern Stack** | REST API, real-time UI, cloud-ready |

---

## ✨ Features

### 🎯 Core Features
- ✅ **AI-Powered Extraction** - Claude 3.5 Haiku extracts invoice fields automatically
- ✅ **Confidence Scoring** - Each field includes a confidence score (0-100%)
- ✅ **Interactive Dashboard** - Beautiful, responsive web interface
- ✅ **PDF/DOC Support** - Upload PDF, DOCX, or TXT files
- ✅ **Split-Pane Viewer** - Side-by-side PDF view and extracted fields
- ✅ **Extraction History** - Version tracking for all extractions
- ✅ **User Authentication** - Secure login with JWT tokens
- ✅ **Activity Logging** - Complete audit trail of all actions
- ✅ **Multi-Tenant Support** - Tenant isolation and management
- ✅ **Field Comparison** - Compare extraction versions side-by-side

### 🚀 Advanced Features
- 📊 **Batch Processing** - Upload multiple documents simultaneously
- 🔄 **Re-extraction** - Re-process documents with updated models
- 📋 **Custom Fields** - Define custom extraction fields per tenant
- 🎯 **Review Workflow** - Approve, reject, or suggest corrections
- 📈 **Analytics Dashboard** - Extraction performance metrics
- 🔔 **Notifications** - Real-time notifications for extraction completion
- 💾 **Backup & Recovery** - Automatic backups and recovery
- 🚀 **Scalable** - Designed for enterprise scale

---

## 🔧 Tech Stack

### 🔧 Backend Stack

| Layer | Technology | Version | Why? |
|-------|-----------|---------|------|
| **Framework** | FastAPI | 0.115+ | 🚀 Fast, modern, async-first |
| **Language** | Python | 3.11+ | 📚 Readable, powerful, productive |
| **Database** | MongoDB | Latest | 📊 Flexible, scalable, document-based |
| **ORM** | Beanie | Latest | ⚡ Async, type-safe MongoDB |
| **LLM** | Claude 3.5 Haiku | Latest | 🤖 Powerful, accurate extraction |
| **Auth** | JWT | Standard | 🔐 Secure, stateless authentication |
| **Server** | Uvicorn | Latest | ⚙️ Lightning-fast ASGI server |

### 🎨 Frontend Stack

| Layer | Technology | Version | Why? |
|-------|-----------|---------|------|
| **Framework** | Next.js | 14 | ⚡ React with SSR & SSG |
| **Language** | TypeScript | 5.0+ | 📝 Type-safe, developer-friendly |
| **Styling** | styled-jsx | Latest | 🎨 Component-scoped CSS |
| **HTTP** | Axios | Latest | 🔌 Promise-based API client |
| **State** | React Hooks | Built-in | 🪝 Simple, powerful state mgmt |

### 🌐 Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API** | REST + JSON | Standard, stateless communication |
| **Container** | Docker | Consistent deployment environment |
| **Async** | Motor | Non-blocking MongoDB driver |
| **Validation** | Pydantic v2 | Type validation & serialization |
| **Testing** | pytest / Jest | Comprehensive test automation |

---

## 📁 Project Structure

```
INDCR/
│
├── 📄 README.md                      # Project overview (this file)
├── 📄 TODO.md                        # Development roadmap
│
├── 📂 backend/                       # FastAPI Backend
│   ├── app/
│   │   ├── main.py                  # FastAPI application setup
│   │   ├── api/                     # API routes
│   │   ├── services/                # Business logic
│   │   ├── models/                  # Data models
│   │   ├── core/                    # Core functions
│   │   ├── db/                      # Database operations
│   │   └── jobs/                    # Background tasks
│   ├── tests/
│   │   └── test_llm_invoice_extraction.py
│   ├── pyproject.toml              # Project metadata & deps
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment variables
│   └── README.md                   # Backend documentation
│
├── 📂 frontend/                     # Next.js Frontend
│   ├── pages/                      # React pages
│   ├── components/                 # Main components
│   ├── services/                   # Service functions
│   ├── store/                      # State storage
│   ├── hooks/                      # Custom hooks
│   ├── styles/                     # Styling files
│   ├── package.json               # NPM dependencies
│   ├── tsconfig.json               # TypeScript config
│   ├── next.config.js             # Next.js config
│   └── README.md                  # Frontend documentation
│
├── 📂 docs/                        # Project documentation
│   ├── README.md                  # Docs index
│   ├── ARCHITECTURE.md            # System design
│   ├── API_DOCUMENTATION.md       # API reference
│   ├── BACKEND_GUIDE.md           # Backend guide
│   ├── FRONTEND_GUIDE.md          # Frontend guide
│   ├── DATABASE_SCHEMA.md         # Data models
│   ├── DEPLOYMENT.md              # Deployment guide
│   └── CONTRIBUTING.md            # Contributing guide
│
└── 📂 shared/                      # Shared resources (optional)
```

---

## ⚡ Quick Start

### 🧪 Frontend (Test) Commands

```bash
# from repo root
cd frontend

# run unit tests (if configured)
npm test

# run in one-shot mode (no watch), when using Jest/Vitest
npm test -- --runInBand

# run typecheck (if available)
npm run typecheck || true

# run lint (if available)
npm run lint || true

# build for production
npm run build
```

### 📋 Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **MongoDB** 4.4+ (or MongoDB Atlas account)
- **Anthropic API Key**
- **Git** for version control

### 🚀 Get Up & Running

```bash
# 1️⃣ Clone repository
git clone https://github.com/yourusername/indcr.git
cd INDCR

# 2️⃣ Setup Backend (Terminal 1)
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1      # Windows PowerShell
# OR on Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env
# Edit .env with your keys:
# ANTHROPIC_API_KEY=sk-ant-...
# MONGODB_URI=mongodb://...

python -m uvicorn app.main:app --reload --port 8000

# 3️⃣ Setup Frontend (Terminal 2)
cd frontend
npm install
npm run dev

# 4️⃣ Open your browser
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### 🎯 Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| 🖥️ **Frontend** | http://localhost:3000 | User interface |
| 🔌 **API** | http://localhost:8000 | Backend REST API |
| 📚 **API Docs** | http://localhost:8000/docs | Interactive Swagger UI |
| 📋 **Schema** | http://localhost:8000/openapi.json | OpenAPI specification |

---

## 📋 Installation Guide

### 🔧 Backend Setup

> 💡 Complete step-by-step setup for the FastAPI backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1      # Windows PowerShell
# OR on Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env
# Edit .env with your settings
```

**Environment variables example**

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-5-haiku-latest
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=idc_dev
LOG_LEVEL=INFO
```

```bash
python -m uvicorn app.main:app --reload --port 8000
```

### 🎨 Frontend Setup

> 💡 Complete step-by-step setup for the Next.js frontend

```bash
cd frontend
npm install
```

Create a file named `.env.local` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Then run:

```bash
npm run dev
```

---

### 📦 Database Setup

> 💡 Setup MongoDB locally or in the cloud

**Option 1: Local MongoDB**

```bash
# Install MongoDB Community Edition
# Start MongoDB service
mongod

# Verify connection
mongosh mongodb://localhost:27017
```

**Option 2: MongoDB Atlas**

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Obtain the connection string
4. Update `MONGODB_URI` in `.env`

Example:

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

---

## 🎮 Running the Project

### 💻 Development Mode

**Terminal 1: Backend API**

```bash
cd backend
.\.venv\Scripts\Activate.ps1      # Windows PowerShell
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2: Frontend UI**

```bash
cd frontend
npm run dev
```

**Terminal 3: Database**

```bash
mongod
```

### 🏗️ Production Build

```bash
cd frontend
npm run build
npm start

cd backend
gunicorn "app.main:app" -w 4 -k uvicorn.workers.UvicornWorker --port 8000
```

---

## 🔌 API Overview

### 🔐 Authentication Endpoints

**Register New User**

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password_123",
  "full_name": "John Doe"
}
```

**Login**

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password_123"
}
```

### 📤 Document Upload

**Upload Invoice**

```bash
POST /documents/upload
Authorization: Bearer <your_token>
Content-Type: multipart/form-data

Form Data:
- file: <PDF/DOCX/TXT file>
- filename: invoice-2024-01.pdf
- tenant_id: default
- user_email: user@example.com
```

### 🤖 AI Extraction

**Extract Invoice Data**

```bash
POST /extraction/extract
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "document_id": "507f1f77bcf86cd799439011",
  "re_extract": false
}
```

### 📈 Extraction Result Sample

```json
{
  "extraction_id": "extraction_001",
  "status": "completed",
  "processing_time_ms": 2340,
  "extraction": {
    "invoice_number": {
      "value": "INV-2024-001",
      "confidence": 0.96
    },
    "vendor_name": {
      "value": "Acme Supplies Inc",
      "confidence": 0.91
    },
    "invoice_total": {
      "value": "$5,250.00",
      "confidence": 0.89
    },
    "invoice_date": {
      "value": "2024-01-15",
      "confidence": 0.94
    }
  }
}
```

---

## ✅ Testing

### 🐍 Backend Testing

```bash
cd backend
pytest
pytest tests/test_llm_invoice_extraction.py -v
pytest --cov=app tests/ --cov-report=html
```

### 🎨 Frontend Testing

```bash
cd frontend
npm test
npm test -- --watch
npm test -- --coverage
```

### 🔌 API Testing

**Using cURL**

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## 🚀 Deployment

**Frontend (Vercel)**

```bash
cd frontend
npm run build
vercel deploy
```

**Backend (Railway / Render)**

```bash
git push main
```

**Docker Deployment**

```bash
docker build -t indcr-backend ./backend
docker build -t indcr-frontend ./frontend
docker-compose up -d
docker-compose logs -f
```

---

"# Intelligant_Document" 
