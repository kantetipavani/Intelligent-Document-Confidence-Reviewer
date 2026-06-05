
<div align="center">
  <h1>🚀 INDCR</h1>
  <h3>Intelligent Document Confidence Reviewer</h3>
  <p><em>AI-Powered Invoice Extraction & Review Platform</em></p>
  
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-00a651?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=for-the-badge&logo=python)](https://www.python.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Latest-00ed64?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
  [![Anthropic](https://img.shields.io/badge/Anthropic%20Claude-API-000000?style=for-the-badge)](https://www.anthropic.com/)
  
  <br/>
  
  **[🎯 Features](#-features) • [⚡ Quick Start](#-quick-start) • [📚 Documentation](./docs/README.md) • [🤝 Contributing](#-contributing) • [📞 Support](#-support--contact)**
  
</div>

---

<div align="center">
  
  > 💡 **Transform your invoice processing with AI-powered extraction and intelligent review workflows**
  
</div>

---

## 📖 Table of Contents

<table>
<tr>
<td>

### 📋 Getting Started
- [🎯 Overview](#-overview)
- [✨ Features](#-features)
- [⚡ Quick Start](#-quick-start)
- [📋 Installation](#-installation-guide)

</td>
<td>

### 🛠️ Development
- [🎮 Running](#-running-the-project)
- [🔌 API Reference](#-api-overview)
- [💾 Database](#-database)
- [✅ Testing](#-testing)

</td>
</tr>
<tr>
<td>

### 📚 Deep Dives
- [🛠️ Tech Stack](#-tech-stack)
- [🏗️ Architecture](#-system-architecture)
- [📁 Project Structure](#-project-structure)
- [🔄 How It Works](#-how-it-works)

</td>
<td>

### 🚀 Deployment & Community
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📚 Documentation](#-documentation)
- [📞 Support](#-support--contact)

</td>
</tr>
</table>

---

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

## 🛠️ Tech Stack

### Backend Architecture
```
┌─────────────────────────────────────────┐
│           FastAPI Backend                │
│  ┌───────────────────────────────────┐   │
│  │ REST API (20+ endpoints)          │   │
│  ├───────────────────────────────────┤   │
│  │ Services (LLM, Extraction, Auth)  │   │
│  ├───────────────────────────────────┤   │
│  │ Beanie ORM (async MongoDB)        │   │
│  └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
         ↕ (Anthropic API)
┌─────────────────────────────────────────┐
│      Claude 3.5 Haiku LLM API            │
└─────────────────────────────────────────┘
         ↕ (Beanie/Motor)
┌─────────────────────────────────────────┐
│        MongoDB Atlas / Self-Hosted       │
└─────────────────────────────────────────┘
```

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

## 🏗️ System Architecture

```
                        User Browser
                             │
                             │ HTTPS
                             ↓
                  ┌─────────────────────┐
                  │  Next.js Frontend    │
                  │ (React Components)   │
                  │  Port 3000           │
                  └──────────┬──────────┘
                             │
                             │ REST API (JSON)
                             │ Bearer Token Auth
                             ↓
                  ┌─────────────────────┐
                  │  FastAPI Backend     │
                  │  Port 8000           │
                  │  ┌───────────────┐   │
                  │  │ API Routes    │   │
                  │  ├───────────────┤   │
                  │  │ Services      │   │
                  │  ├───────────────┤   │
                  │  │ Business Logic│   │
                  │  └───────────────┘   │
                  └──────────┬──────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
        (Write)         (Read)          (LLM)
             │               │               │
             ↓               ↓               ↓
        ┌─────────────┐ ┌──────────┐ ┌────────────┐
        │  MongoDB    │ │ MongoDB  │ │ Anthropic  │
        │  (Write)    │ │ (Read)   │ │ Claude API │
        └─────────────┘ └──────────┘ └────────────┘
```

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
│   │   ├── api/                     # API routes (8 modules)
│   │   │   ├── auth.py             # Authentication endpoints
│   │   │   ├── documents.py        # Document management
│   │   │   ├── extraction.py       # LLM extraction
│   │   │   ├── reviews.py          # Review workflow
│   │   │   ├── versions.py         # Version control
│   │   │   ├── activity.py         # Audit logging
│   │   │   ├── tenants.py          # Multi-tenancy
│   │   │   └── health.py           # Health checks
│   │   ├── services/                # Business logic
│   │   │   ├── llm_service.py      # Claude API wrapper
│   │   │   └── extraction_service.py # Extraction orchestration
│   │   ├── models/                  # Data models (6 models)
│   │   │   ├── user.py
│   │   │   ├── document.py
│   │   │   ├── extraction_run.py
│   │   │   ├── review_version.py
│   │   │   ├── audit_event.py
│   │   │   └── tenant.py
│   │   ├── core/
│   │   │   ├── config.py           # Configuration management
│   │   │   └── logging.py          # Structured logging
│   │   ├── db/
│   │   │   └── init_db.py          # Database initialization
│   │   └── jobs/                    # Background tasks
│   │
│   ├── tests/
│   │   └── test_llm_invoice_extraction.py
│   ├── pyproject.toml              # Project metadata & deps
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment variables
│   └── README.md                   # Backend documentation
│
├── 📂 frontend/                     # Next.js Frontend
│   ├── pages/
│   │   ├── _app.tsx               # App wrapper
│   │   ├── index.tsx              # Landing page
│   │   ├── login.tsx              # Login page
│   │   ├── register.tsx           # Registration page
│   │   ├── dashboard.tsx          # Main dashboard
│   │   ├── profile.tsx            # User profile
│   │   ├── file.tsx               # File details
│   │   ├── [id].tsx               # Document view
│   │   └── documents/             # Document listing
│   │
│   ├── components/
│   │   ├── layout.tsx             # Main layout
│   │   ├── topbar.tsx             # Navigation
│   │   ├── PDFViewer.tsx          # PDF display
│   │   ├── ExtractedFields.tsx    # Fields display
│   │   ├── DiffViewer.tsx         # Version compare
│   │   ├── VersionHistory.tsx     # History panel
│   │   └── ConfidenceBadge.tsx    # Confidence badge
│   │
│   ├── services/
│   │   ├── api.ts                 # HTTP client
│   │   └── auth.ts                # Auth helpers
│   │
│   ├── store/
│   │   └── authStore.ts           # Auth state
│   │
│   ├── hooks/
│   │   └── useDocuments.ts        # Document hooks
│   │
│   ├── styles/
│   │   ├── globals.css            # Global styles
│   │   ├── dashboard.css          # Dashboard styles
│   │   ├── document.css           # Document styles
│   │   └── pdfviewer.css          # Viewer styles
│   │
│   ├── package.json               # NPM dependencies
│   ├── tsconfig.json              # TypeScript config
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

### 📋 Prerequisites

Before you begin, make sure you have:

<table>
<tr>
<td>✅ <b>Node.js</b> 18+</td>
<td>For frontend development</td>
</tr>
<tr>
<td>✅ <b>Python</b> 3.11+</td>
<td>For backend API</td>
</tr>
<tr>
<td>✅ <b>MongoDB</b> 4.4+</td>
<td>Local or <a href="https://www.mongodb.com/cloud/atlas">Atlas</a></td>
</tr>
<tr>
<td>✅ <b>Anthropic API Key</b></td>
<td>From <a href="https://console.anthropic.com">console.anthropic.com</a></td>
</tr>
<tr>
<td>✅ <b>Git</b></td>
<td>For version control</td>
</tr>
</table>

### 🚀 Get Up & Running (5 Minutes)

```bash
# 1️⃣ Clone repository
git clone https://github.com/yourusername/indcr.git
cd INDCR

# 2️⃣ Setup Backend (Terminal 1)
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1           # Windows PowerShell
# OR on Linux/Mac:
source venv/bin/activate                # Linux/Mac

pip install -r requirements.txt
cp .env.example .env
# ⚙️ Edit .env with your keys:
#    ANTHROPIC_API_KEY=sk-ant-...
#    MONGODB_URI=mongodb://...

python -m uvicorn app.main:app --reload --port 8000

# 3️⃣ Setup Frontend (Terminal 2)
cd frontend
npm install
npm run dev

# 4️⃣ Open your browser
# 🎉 Frontend: http://localhost:3000
# 📖 API Docs: http://localhost:8000/docs
```

### 🎯 Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| 🖥️ **Frontend** | http://localhost:3000 | User interface |
| 🔌 **API** | http://localhost:8000 | Backend REST API |
| 📚 **API Docs** | http://localhost:8000/docs | Interactive Swagger UI |
| 📋 **Schema** | http://localhost:8000/openapi.json | OpenAPI specification |

## 📋 Installation Guide

### 🔧 Backend Setup (Detailed)

> 💡 Complete step-by-step setup for the FastAPI backend

```bash
# 1️⃣ Navigate to backend directory
cd backend

# 2️⃣ Create Python virtual environment
python -m venv .venv

# 3️⃣ Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Linux/Mac Bash:
source venv/bin/activate

# 4️⃣ Install all dependencies
pip install -r requirements.txt

# 5️⃣ Create configuration file
cp .env.example .env

# 6️⃣ Edit .env with your settings
```

**Key environment variables:**
```env
# LLM Configuration
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-5-haiku-latest

# Database Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=idc_dev

# Application Settings
LOG_LEVEL=INFO
```

```bash
# 7️⃣ Start the backend server
python -m uvicorn app.main:app --reload --port 8000
```

✅ **Backend Ready!** Visit http://localhost:8000/docs

---

### 🎨 Frontend Setup (Detailed)

> 💡 Complete step-by-step setup for the Next.js frontend

```bash
# 1️⃣ Navigate to frontend directory
cd frontend

# 2️⃣ Install npm dependencies
npm install

# 3️⃣ Create environment configuration
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

# 4️⃣ Start development server
npm run dev

# 5️⃣ Open browser
# Navigate to http://localhost:3000
```

✅ **Frontend Ready!** Your app is running at http://localhost:3000

---

### 📦 Database Setup (Detailed)

> 💡 Setup MongoDB locally or in the cloud

**Option 1: Local MongoDB (Development)**

```bash
# Install MongoDB Community Edition
# Download from: https://www.mongodb.com/try/download/community

# Start MongoDB
mongod

# Verify connection
mongosh mongodb://localhost:27017
```

**Option 2: MongoDB Atlas (Cloud - Recommended)**

```bash
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create a free account
# 3. Create a new cluster (M0 tier is free)
# 4. Get connection string from "Connect" button
# 5. Update MONGODB_URI in .env

# Example:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

✅ **Database Ready!** Collections will be created automatically

## 🎮 Running the Project

### 💻 Development Mode

Open 3 terminals and run:

**Terminal 1: Backend API** 🔌
```bash
cd backend
source venv/bin/activate          # or .\.venv\Scripts\Activate.ps1 on Windows
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2: Frontend UI** 🖥️
```bash
cd frontend
npm run dev
```

**Terminal 3: Database** 📦
```bash
# If using local MongoDB:
mongod

# If using MongoDB Atlas, skip this step (cloud hosted)
```

### 📍 Access Points

<div align="center">

| Service | URL | Description |
|---------|-----|-------------|
| 🖥️ **Frontend** | http://localhost:3000 | Web application |
| 🔌 **API** | http://localhost:8000 | REST backend |
| 📚 **Swagger UI** | http://localhost:8000/docs | Interactive API explorer |
| 🔍 **ReDoc** | http://localhost:8000/redoc | Alternative API docs |

</div>

### 🏗️ Production Build

> **Ready for deployment!**

**Frontend Build:**
```bash
cd frontend
npm run build          # Create optimized build
npm start              # Serve production build
```

**Backend Production:**
```bash
cd backend
gunicorn "app.main:app" -w 4 -k uvicorn.workers.UvicornWorker --port 8000
```

---

## 🔄 How It Works

### User Journey

```
┌─────────────────────────────────────────────────┐
│ 1. USER REGISTRATION / LOGIN                     │
│ - Email and password                             │
│ - JWT token issued                               │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ 2. UPLOAD INVOICE                                │
│ - Select PDF/DOC/TXT file                        │
│ - Submit form                                    │
│ - File uploaded to backend                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ 3. AI EXTRACTION (Backend Process)              │
│ - File content read                              │
│ - Claude LLM called with extraction prompt       │
│ - Fields extracted: invoice_no, vendor, amount   │
│ - Confidence scores calculated                   │
│ - Results stored in MongoDB                      │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ 4. DISPLAY RESULTS (Frontend)                    │
│ - Extracted fields shown with confidence badges  │
│ - PDF displayed in viewer                        │
│ - Activity logged to history                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ 5. REVIEW & APPROVAL (User Action)              │
│ - User reviews extracted fields                  │
│ - Approves or suggests corrections               │
│ - Review recorded in audit trail                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│ 6. VERSION TRACKING & HISTORY                    │
│ - All versions stored                            │
│ - Can compare versions                           │
│ - Complete audit trail maintained                │
└─────────────────────────────────────────────────┘
```

### Data Flow

```
User Upload
    │
    ↓
┌─────────────────┐
│ FormData        │
│ - file          │
│ - tenant_id     │
│ - email         │
└────────┬────────┘
         │
         ↓ (HTTP POST to /documents/upload)
┌─────────────────────────────────────┐
│ Backend                             │
│ ┌─────────────────────────────────┐ │
│ │ 1. Save file                    │ │
│ │ 2. Create document record       │ │
│ │ 3. Read file content            │ │
│ │ 4. Call LLM Service             │ │
│ └────────┬────────────────────────┘ │
└─────────┼──────────────────────────┘
          │
          ↓ (Claude API call)
┌──────────────────────┐
│ Anthropic LLM        │
│ - Invoice extraction │
│ - Confidence scores  │
└──────────┬───────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ Backend                             │
│ ┌─────────────────────────────────┐ │
│ │ 1. Store extraction in DB       │ │
│ │ 2. Create audit event           │ │
│ │ 3. Return results               │ │
│ └─────────────────────────────────┘ │
└────────┬──────────────────────────┘
         │
         ↓ (JSON Response)
┌──────────────────────────────────┐
│ Frontend                         │
│ ┌────────────────────────────────┐│
│ │ 1. Render extracted fields     ││
│ │ 2. Display PDF                 ││
│ │ 3. Show confidence badges      ││
│ │ 4. Add to activity history     ││
│ └────────────────────────────────┘│
└──────────────────────────────────┘
```

---

## 🔌 API Overview

> 📖 **Full documentation:** [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) (20+ endpoints with examples)

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

Response:
{
  "user_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "message": "User registered successfully"
}
```

**Login**
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "secure_password_123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
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

Response:
{
  "document_id": "507f1f77bcf86cd799439011",
  "filename": "invoice-2024-01.pdf",
  "status": "uploaded",
  "created_at": "2024-01-15T10:30:00Z"
}
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

Response:
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

### 📊 Activity & Audit

**Get User Activity**
```bash
GET /activity/by-email/user@example.com?limit=50
Authorization: Bearer <your_token>

Response:
{
  "activities": [
    {
      "event_id": "evt_001",
      "event_type": "extraction_completed",
      "user_email": "user@example.com",
      "document_id": "507f...",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    ...
  ]
}
```

### 📈 Versioning

**Get Latest Extraction**
```bash
GET /versions/latest/507f1f77bcf86cd799439011
Authorization: Bearer <your_token>

Response:
{
  "extraction_id": "extraction_001",
  "version": 1,
  "extraction": { ... },
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Compare Versions**
```bash
POST /versions/compare
Authorization: Bearer <your_token>

{
  "document_id": "507f1f77bcf86cd799439011",
  "version_a": 1,
  "version_b": 2
}

Response:
{
  "differences": {
    "vendor_name": {
      "version_a": "Acme Supplies",
      "version_b": "Acme Supplies Inc",
      "confidence_change": +0.05
    }
  }
}
```

### 📚 Full API Reference

> 📖 See [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for:
> - 20+ complete endpoints
> - Request/response examples in cURL, Python, and JavaScript
> - Error handling and status codes
> - Rate limiting and authentication
> - Real-world usage scenarios

---

## 💾 Database

### MongoDB Collections Overview

> 📊 **Full documentation:** [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)

**INDCR uses 6 core MongoDB collections:**

| Collection | Purpose | Records |
|-----------|---------|---------|
| 👥 **users** | User accounts & authentication | Varies |
| 📄 **documents** | Uploaded invoice metadata | Varies |
| 🤖 **extraction_runs** | LLM extraction results | Varies |
| ✅ **review_versions** | User approvals/rejections | Varies |
| 📋 **audit_events** | Activity & compliance logs | Millions (auto-archived) |
| 🏢 **tenants** | Organization/tenant data | Varies |

### 👥 Users Collection

```javascript
db.users.insertOne({
  user_id: ObjectId("507f1f77bcf86cd799439011"),
  email: "john.doe@example.com",
  full_name: "John Doe",
  password_hash: "$2b$12$...",
  tenant_id: "default",
  role: "user",
  is_active: true,
  created_at: ISODate("2024-01-15T10:00:00Z"),
  updated_at: ISODate("2024-01-15T10:00:00Z")
})
```

### 📄 Documents Collection

```javascript
db.documents.insertOne({
  document_id: ObjectId("507f2f77bcf86cd799439012"),
  tenant_id: "default",
  filename: "invoice-001.pdf",
  file_path: "/uploads/2024-01/invoice-001.pdf",
  uploaded_by: "john.doe@example.com",
  status: "extracted",
  latest_extraction_id: "extraction_001",
  file_size_bytes: 245632,
  created_at: ISODate("2024-01-15T10:30:00Z"),
  updated_at: ISODate("2024-01-15T10:35:00Z")
})
```

### 🤖 Extraction Runs Collection

```javascript
db.extraction_runs.insertOne({
  extraction_id: "extraction_001",
  document_id: ObjectId("507f2f77bcf86cd799439012"),
  tenant_id: "default",
  model_used: "claude-3-5-haiku-latest",
  extraction: {
    invoice_number: {
      value: "INV-2024-001",
      confidence: 0.96,
      source_text: "Invoice Number: INV-2024-001"
    },
    vendor_name: {
      value: "Acme Supplies Inc",
      confidence: 0.91,
      source_text: "Acme Supplies Inc."
    },
    invoice_total: {
      value: "$5,250.00",
      confidence: 0.89,
      source_text: "Total: $5,250.00"
    }
  },
  status: "completed",
  processing_time_ms: 2340,
  token_usage: {
    input_tokens: 1250,
    output_tokens: 350
  },
  created_at: ISODate("2024-01-15T10:30:00Z")
})
```

### ✅ Review Versions Collection

```javascript
db.review_versions.insertOne({
  review_id: "review_001",
  extraction_id: "extraction_001",
  document_id: ObjectId("507f2f77bcf86cd799439012"),
  user_email: "john.doe@example.com",
  status: "approved",
  approved_at: ISODate("2024-01-15T13:00:00Z"),
  notes: "Verified and correct - ready for processing",
  corrections: {
    invoice_number: "INV-2024-001"  // User verified correct
  }
})
```

### 📋 Audit Events Collection

```javascript
db.audit_events.insertOne({
  event_id: ObjectId("507f3f77bcf86cd799439013"),
  event_type: "extraction_completed",
  tenant_id: "default",
  user_email: "john.doe@example.com",
  document_id: ObjectId("507f2f77bcf86cd799439012"),
  action: "extraction_completed",
  resource_type: "document",
  status: "success",
  payload: {
    extraction_id: "extraction_001",
    processing_time_ms: 2340
  },
  created_at: ISODate("2024-01-15T10:30:00Z")
})
```

### 🏢 Tenants Collection

```javascript
db.tenants.insertOne({
  tenant_id: "default",
  name: "Default Tenant",
  description: "Default organization",
  owner_email: "admin@example.com",
  is_active: true,
  settings: {
    max_documents: 10000,
    max_users: 100,
    features: ["extraction", "review", "versioning"]
  },
  created_at: ISODate("2024-01-01T10:00:00Z"),
  updated_at: ISODate("2024-01-15T10:00:00Z")
})
```

---

## 📈 Project Workflow

### 🎯 Feature Development Workflow

<table>
<tr>
<td width="50%">

**Step 1: Create Branch**
```bash
git checkout -b feature/new-feature
```

**Step 2: Develop**
- 🔌 Backend: Add API endpoint
- ⚙️ Services: Implement business logic  
- 💾 Models: Update data schemas
- 🎨 Frontend: Add components
- 🧪 Tests: Write test cases

**Step 3: Test Locally**
```bash
pytest                 # Backend tests
npm test              # Frontend tests
```

</td>
<td width="50%">

**Step 4: Commit Changes**
```bash
git commit -m "feat: add feature"
git commit -m "test: add tests"
git commit -m "docs: update docs"
```

**Step 5: Create Pull Request**
- Write clear description
- Link related issues
- Request review

**Step 6: Code Review**
- Address feedback
- Update code
- Get approval

**Step 7: Merge & Deploy**
```bash
git merge feature/new-feature
git push main
```

</td>
</tr>
</table>

### ⏰ Typical Developer Day

<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">

**Morning ☀️**
- 🔔 Check/respond to issues
- 👀 Review pull requests
- 📞 Standup meeting
- 📧 Email & messages

**Midday 🌤️**
- 💻 Develop features
- 🧪 Write tests
- 🐛 Debug issues
- 🔄 Run integration tests

**Evening 🌙**
- 👥 Code review
- 📚 Documentation
- 📋 Plan tomorrow
- 📊 Metrics & monitoring

</div>

---

## 📚 Documentation

> 📖 **Complete, comprehensive documentation for every role**

### Documentation by Role

| Role | Start Here | Read Time |
|------|-----------|-----------|
| 🎨 **Frontend Developer** | [FRONTEND_GUIDE.md](./docs/FRONTEND_GUIDE.md) | 30-40 min |
| ⚙️ **Backend Developer** | [BACKEND_GUIDE.md](./docs/BACKEND_GUIDE.md) | 30-40 min |
| 🏗️ **DevOps / Deployment** | [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | 40-60 min |
| 🤝 **Contributors** | [CONTRIBUTING.md](./docs/CONTRIBUTING.md) | 20-30 min |
| 🏢 **Architects** | [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 20-30 min |

### Complete Documentation Set

| Document | Content Includes | Read Time |
|----------|-----------------|-----------|
| 📋 **[README](./docs/README.md)** | Docs index & quick links | 5 min |
| 🏗️ **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | System design, diagrams, data flows, components, integrations | 20-30 min |
| 🔌 **[API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)** | 20+ endpoints, request/response examples (cURL, Python, JS) | 30-45 min |
| ⚙️ **[BACKEND_GUIDE.md](./docs/BACKEND_GUIDE.md)** | Setup, structure, models, services, testing, debugging | 30-40 min |
| 🎨 **[FRONTEND_GUIDE.md](./docs/FRONTEND_GUIDE.md)** | Pages, components, hooks, state management, styling | 30-40 min |
| 💾 **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** | All 6 collections, fields, relationships, indexes | 25-35 min |
| 🚀 **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** | Pre-deployment, Docker, Kubernetes, monitoring, scaling | 40-60 min |
| 🤝 **[CONTRIBUTING.md](./docs/CONTRIBUTING.md)** | Code of conduct, workflow, standards, commit guidelines | 20-30 min |

**→ [📖 View Complete Documentation Index](./docs/README.md)**

---

## ✅ Testing

> 🧪 **Ensure code quality and reliability with comprehensive tests**

### 🐍 Backend Testing

```bash
cd backend

# ▶️ Run all tests
pytest

# 🎯 Run specific test file
pytest tests/test_llm_invoice_extraction.py -v

# 📊 Run with coverage report
pytest --cov=app tests/ --cov-report=html

# 👀 Watch mode (auto-rerun on changes)
pytest-watch

# 🔥 Run tests in parallel
pytest -n auto
```

### 🎨 Frontend Testing

```bash
cd frontend

# ▶️ Run all tests
npm test

# 👀 Watch mode
npm test -- --watch

# 📊 Coverage report
npm test -- --coverage

# 🎯 Run specific test
npm test -- testname.test.ts
```

### 🔌 API Testing

**Using cURL** 🔗
```bash
# Get API token
TOKEN=$(curl -s -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.access_token')

# Test API endpoint
curl -X GET "http://localhost:8000/activity/by-email/test@example.com" \
  -H "Authorization: Bearer $TOKEN"
```

**Using Python** 🐍
```python
import requests

BASE_URL = "http://localhost:8000"

# Login
response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "test@example.com",
    "password": "password"
})
token = response.json()["access_token"]

# Test endpoint
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(
    f"{BASE_URL}/activity/by-email/test@example.com",
    headers=headers
)
print(response.json())
```

**Using Postman** 📮
1. Import collection from `docs/postman-collection.json`
2. Set variables in Postman environment
3. Run tests from the collection

---

## 🚀 Deployment

> **Ready for production! Deploy with confidence.**

### 🎯 Quick Deployment

**Frontend (Vercel - Easiest)**
```bash
npm run build              # Build optimized production version
vercel deploy              # Deploy to Vercel (auto HTTPS, CDN, auto-scaling)
```

**Backend (Railway / Render)**
```bash
# Just push to GitHub!
git push main
# Railway/Render auto-deploys from your repo
```

### 📋 Deployment Platforms

| Platform | Frontend | Backend | Database | Cost | Best For |
|----------|----------|---------|----------|------|----------|
| **Vercel** | ✅ | ✗ | ✗ | Free tier | Frontend only |
| **Railway** | ✅ | ✅ | ✅ | $5+/month | Full stack |
| **Render** | ✅ | ✅ | ✗ | Free tier | Small projects |
| **AWS** | ✅ | ✅ | ✅ | Varies | Enterprise |
| **DigitalOcean** | ✅ | ✅ | ✅ | $6+/month | Cost-effective |

**📖 Full deployment guide:** [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

### 🐳 Docker Deployment

```bash
# Build images
docker build -t indcr-backend ./backend
docker build -t indcr-frontend ./frontend

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## 🤝 Contributing

> 💪 **We welcome contributors! Help make INDCR even better.**

### 🎯 How to Contribute

**1. Fork the repository**
```bash
# Click "Fork" button on GitHub
```

**2. Create feature branch**
```bash
git checkout -b feature/amazing-feature
```

**3. Make your changes**
```bash
# Edit files, add features, write tests
```

**4. Commit with clear messages**
```bash
git commit -m "feat: add amazing new feature"
git commit -m "fix: resolve critical bug"
git commit -m "docs: update installation guide"
```

**5. Push to GitHub**
```bash
git push origin feature/amazing-feature
```

**6. Create Pull Request**
- Write clear PR description
- Link related issues
- Request review from maintainers

### 📋 Contribution Areas

| Area | How to Help |
|------|-----------|
| 🐛 **Bug Fixes** | Report issues, submit PRs with fixes |
| ✨ **Features** | Propose features, implement with tests |
| 📚 **Documentation** | Improve docs, add examples, fix typos |
| 🧪 **Testing** | Increase test coverage, add edge cases |
| 🚀 **Performance** | Profile code, optimize bottlenecks |
| 🎨 **UI/UX** | Improve design, enhance user experience |

### 📖 Guidelines

**Code Standards**
- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Use strict mode, ESLint, Prettier
- **Tests**: Aim for 80%+ coverage
- **Commits**: Use conventional commits

**PR Requirements**
- ✅ Tests pass (`pytest`, `npm test`)
- ✅ No linting errors
- ✅ Updated documentation
- ✅ Clear commit messages

**→ [Full Contributing Guide](./docs/CONTRIBUTING.md)**

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE](./LICENSE) file for details.

This means you can:
- ✅ Use for commercial projects
- ✅ Modify the code
- ✅ Distribute freely
- ✅ Include in proprietary software

The only requirement is to include the license notice.

---

## 🙏 Acknowledgments

### Technologies That Power INDCR

| Technology | Role | Website |
|-----------|------|---------|
| **Anthropic Claude** | AI extraction engine | https://www.anthropic.com |
| **FastAPI** | Backend framework | https://fastapi.tiangolo.com |
| **Next.js** | Frontend framework | https://nextjs.org |
| **MongoDB** | Database | https://www.mongodb.com |
| **Python** | Backend language | https://www.python.org |
| **TypeScript** | Frontend language | https://www.typescriptlang.org |

### Special Thanks To

- 🌟 Contributors and maintainers
- 💬 Users providing feedback
- 🐛 Bug reporters and testers
- 📖 Documentation contributors

---

## 📞 Support & Contact

### Get Help

| Channel | Use For | Response Time |
|---------|---------|---------------|
| 🐛 **Issues** | Bug reports, feature requests | 24-48 hours |
| 💬 **Discussions** | Questions, ideas, feedback | 24-48 hours |
| 📧 **Email** | Urgent support | 24 hours |
| 📚 **Docs** | Usage questions, setup help | Instant |

### Resources

- 📚 **Documentation**: [docs/](./docs/README.md) - Complete guides and references
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/indcr/issues) - Report bugs
- 💡 **Ideas**: [GitHub Discussions](https://github.com/yourusername/indcr/discussions) - Share ideas
- 📧 **Email**: support@indcr.com - Direct support
- 🌐 **Website**: https://indcr.dev - Project homepage

### Quick Links

- 🚀 [Quick Start Guide](#-quick-start)
- 📋 [Installation Instructions](#-installation-guide)
- 📖 [Full Documentation](./docs/README.md)
- 🤝 [Contributing Guidelines](./docs/CONTRIBUTING.md)
- 🐛 [Report Issues](https://github.com/yourusername/indcr/issues)

---

<div align="center">

### ⭐ If you find INDCR useful, please consider giving it a star!

It helps us grow the community and motivates future development.

---

### 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/indcr?style=flat-square)
![GitHub forks](https://img.shields.io/github/forks/yourusername/indcr?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/yourusername/indcr?style=flat-square)
![GitHub license](https://img.shields.io/github/license/yourusername/indcr?style=flat-square)

---

<h3>💚 Made with love by the INDCR Team</h3>

<strong>Transform your invoice processing with AI-powered intelligence</strong>

[⬆ Back to Top](#-indcr---intelligent-document-confidence-reviewer)

</div>
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

