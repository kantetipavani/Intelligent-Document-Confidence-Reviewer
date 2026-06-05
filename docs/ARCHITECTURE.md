# INDCR Project Architecture

## System Overview

INDCR is a three-tier full-stack application for intelligent document review and extraction.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Frontend)                      │
│                     Next.js + React + TypeScript                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Dashboard | Activity | PDF Viewer | Extracted Fields    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↑ ↓ (HTTP/REST)
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (Backend)                   │
│                      FastAPI + Python 3.11+                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Auth API | Document API | Extraction API | Review API   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Services: LLM Service | Extraction Service              │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Core: Config | Logging | Database Management            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↑ ↓ (Driver)
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER (Database)                       │
│                    MongoDB 4.4+ with Beanie ORM                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Collections: Users | Documents | Extractions | Reviews  │   │
│  │            | Versions | Activities | Tenants            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↑ ↓ (API)
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES LAYER                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Anthropic Claude API (LLM Extraction)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend (Next.js)

```
frontend/
├── pages/
│   ├── _app.tsx                 # Global app wrapper
│   ├── index.tsx                # Landing page
│   ├── login.tsx                # Authentication page
│   ├── register.tsx             # Registration page
│   ├── profile.tsx              # User profile
│   ├── dashboard.tsx            # Main dashboard (Sidebar + Content)
│   ├── file.tsx                 # File details
│   └── [id].tsx                 # Dynamic document viewer
│
├── components/
│   ├── layout.tsx               # Main layout wrapper
│   ├── topbar.tsx               # Navigation topbar
│   ├── PDFViewer.tsx            # PDF display component
│   ├── ExtractedFields.tsx      # Extracted data display
│   ├── DiffViewer.tsx           # Version comparison
│   ├── VersionHistory.tsx       # Document versions
│   └── ConfidenceBadge.tsx      # Confidence indicator
│
├── services/
│   ├── api.ts                   # Axios HTTP client
│   └── auth.ts                  # Authentication helpers
│
├── store/
│   └── authStore.ts             # Auth state management
│
├── hooks/
│   └── useDocuments.ts          # Document-related hooks
│
└── styles/
    ├── globals.css              # Global styles
    ├── dashboard.css            # Dashboard styles
    ├── document.css             # Document viewer styles
    └── pdfviewer.css            # PDF viewer styles
```

**Key Flows:**
1. User logs in → token stored → redirected to dashboard
2. User uploads invoice → extraction triggered → results displayed
3. User clicks activity → extracted fields shown in panel
4. User approves/rejects → review logged to audit trail

### Backend (FastAPI)

```
backend/app/
├── main.py                      # FastAPI app setup
│
├── api/                         # Route handlers
│   ├── auth.py                  # Login, register, logout
│   ├── documents.py             # Upload, retrieve documents
│   ├── extraction.py            # Extraction endpoints
│   ├── reviews.py               # Review workflow
│   ├── versions.py              # Document versioning
│   ├── tenants.py               # Multi-tenant management
│   ├── activity.py              # Audit logs
│   └── health.py                # Health checks
│
├── core/
│   ├── config.py                # Settings from .env
│   └── logging.py               # Structured logging
│
├── db/
│   └── init_db.py               # Database initialization
│
├── models/                      # Pydantic & Beanie models
│   ├── user.py                  # User model
│   ├── tenant.py                # Tenant model
│   ├── document.py              # Document model
│   ├── extraction_run.py        # Extraction result
│   ├── review_version.py        # Review snapshot
│   └── audit_event.py           # Audit event
│
├── services/
│   ├── llm_service.py           # Anthropic Claude wrapper
│   └── extraction_service.py    # Extraction logic
│
└── jobs/                        # Background tasks
```

**Key Flows:**
1. POST /auth/login → validate credentials → return JWT
2. POST /documents/upload → save file → trigger extraction → return document_id
3. POST /extraction/extract → call LLM → store results → return extraction_id
4. GET /versions/latest/{doc_id} → fetch latest extraction
5. GET /activity/by-email/{email} → return user's audit events

---

## Data Flow Diagrams

### Document Extraction Flow

```
┌──────────────┐
│ User Upload  │
└──────┬───────┘
       │ (POST /documents/upload)
       ↓
┌──────────────────────┐
│ Backend Receives     │
│ - File              │
│ - Tenant ID         │
│ - User Email        │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Save to MongoDB      │
│ Create Document      │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Call LLM Service     │
│ (Claude API)        │
│ Extract Fields      │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Store Extraction     │
│ - Fields             │
│ - Confidence Scores  │
│ - Metadata           │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Log Activity Event   │
│ - extraction_completed
│ - User Email         │
│ - Timestamp          │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Return to Frontend   │
│ Extraction Data      │
└──────────────────────┘
```

### User Authentication Flow

```
┌──────────────┐
│ User Login   │
└──────┬───────┘
       │ (email + password)
       ↓
┌──────────────────────┐
│ Backend Validates    │
│ - Check User DB      │
│ - Verify Password    │
└──────┬───────────────┘
       │ Valid?
       ├─→ No → Return 401
       │
       ├─→ Yes
       │
       ↓
┌──────────────────────┐
│ Generate JWT Token   │
│ - User ID            │
│ - Email              │
│ - Expiry             │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Return Token         │
│ to Frontend          │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Frontend Storage     │
│ localStorage         │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ Include in Future    │
│ API Calls            │
│ (Authorization Header)
└──────────────────────┘
```

### Activity Tracking Flow

```
┌────────────────────┐
│ User Action        │
│ (Upload/Extract)   │
└────────┬───────────┘
         │
         ↓
┌────────────────────┐
│ Generate Event     │
│ - Event Type       │
│ - Payload Data     │
│ - Timestamp        │
└────────┬───────────┘
         │
         ↓
┌────────────────────┐
│ Save to Activity   │
│ Collection         │
└────────┬───────────┘
         │
         ↓
┌────────────────────┐
│ Frontend Fetch     │
│ GET /activity/...  │
└────────┬───────────┘
         │
         ↓
┌────────────────────┐
│ Display in UI      │
│ Activity List      │
└────────────────────┘
```

---

## Document Versioning

Each document can have multiple extraction versions:

```
Document (ID: doc_123)
├── Version 1 (Extraction Run 1)
│   ├── Timestamp: 2026-01-01 10:00
│   ├── LLM Model: claude-3-5-haiku
│   ├── Fields: { invoice_no, vendor, amount... }
│   └── Status: approved
│
├── Version 2 (Manual Update)
│   ├── Timestamp: 2026-01-01 11:00
│   ├── Changes: { amount: corrected }
│   └── Status: pending_review
│
└── Version 3 (Re-extraction)
    ├── Timestamp: 2026-01-01 12:00
    ├── LLM Model: claude-3-5-haiku
    ├── Fields: { invoice_no, vendor, amount... }
    └── Status: draft
```

**Version Tracking Enables:**
- Compare changes between versions
- Revert to previous versions
- Audit trail of modifications
- A/B testing LLM models

---

## Multi-Tenancy Model

```
Tenant (ID: tenant_A)
├── Users
│   ├── user@company.com
│   └── admin@company.com
│
├── Documents
│   ├── invoice_001.pdf
│   ├── invoice_002.pdf
│   └── invoice_003.pdf
│
└── Activity/Audit Logs
    ├── Event: user@company.com uploaded invoice_001
    └── Event: admin@company.com approved invoice_001

Tenant (ID: tenant_B)
├── Users
│   └── client@other.com
│
├── Documents
│   └── document_X.pdf
│
└── Activity/Audit Logs
    └── Event: client@other.com uploaded document_X
```

**Isolation Benefits:**
- Data security (no cross-tenant leakage)
- Separate audit trails
- Custom configurations per tenant
- Scalable multi-customer SaaS

---

## State Management

### Frontend State
- **Auth Store** (localStorage): JWT token, user email
- **Component State**: Selected activity, extracted fields, loading states
- **Local Storage**: User preferences, session data

### Backend State
- **Database Collections**: Persistent data (documents, users, etc.)
- **Memory**: Request-scoped state, no session storage
- **Cache** (Optional): Could add Redis for performance

---

## Integration Points

### External APIs
1. **Anthropic Claude API**
   - Used for LLM extraction
   - Called by `llm_service.py`
   - Returns structured JSON with confidence scores

### Database
1. **MongoDB**
   - Stores all persistent data
   - Accessed via Beanie ORM
   - Collections: users, documents, extractions, activities, reviews, tenants

### Frontend Libraries
1. **Axios** - HTTP client for API calls
2. **Next.js** - Framework and routing
3. **styled-jsx** - CSS-in-JS styling

---

## Sequence Diagrams

### Complete Invoice Extraction Sequence

```
User                Frontend              Backend             LLM API         MongoDB
 │                    │                     │                   │               │
 │──Upload PDF─────→  │                     │                   │               │
 │                    │──POST /upload────→  │                   │               │
 │                    │                     │──Save Doc─────────────────────→   │
 │                    │                     │ (returns doc_id)                 │
 │                    │                     │←─────────────────────────────────│
 │                    │                     │                   │               │
 │                    │                     │──Extract────────→ │               │
 │                    │                     │                   │               │
 │                    │                     │  (LLM processes)  │               │
 │                    │                     │←─Extracted Data───│               │
 │                    │                     │                   │               │
 │                    │                     │──Save Results────────────────→   │
 │                    │                     │ (returns extraction_id)          │
 │                    │←─Response──────────│←────────────────────────────────│
 │                    │ (extraction data)  │                   │               │
 │  Display Results   │←─────────────────  │                   │               │
 │ (fields + confidence)                   │                   │               │
 │                    │                     │                   │               │
```

---

## Error Handling & Resilience

### Retry Logic
- **LLM Calls**: Exponential backoff (3 attempts)
- **Database Operations**: Connection pooling, timeouts
- **API Calls**: Network error retries

### Error Responses
```
400 Bad Request      - Invalid input
401 Unauthorized     - Missing/invalid token
403 Forbidden        - Insufficient permissions
404 Not Found        - Resource doesn't exist
500 Server Error     - Unexpected error
503 Service Unavailable - LLM/DB down
```

### Logging
- Structured logging using `structlog`
- Log levels: DEBUG, INFO, WARNING, ERROR
- Audit trail for all user actions

---

## Performance Considerations

### Frontend Optimization
- Next.js automatic code splitting
- Component lazy loading
- CSS-in-JS for minimal bundle size
- Caching via localStorage

### Backend Optimization
- Async/await for non-blocking I/O (Motor)
- Connection pooling (MongoDB)
- Request validation (Pydantic)
- Optional caching layer (Redis)

### Database Optimization
- Indexes on frequently queried fields (tenant_id, user_email, document_id)
- TTL indexes for session/temporary data
- Aggregate queries for reporting

---

## Security Measures

1. **Authentication**: JWT tokens
2. **Authorization**: Role-based access (user roles per tenant)
3. **Data Validation**: Pydantic models
4. **CORS**: Configured for frontend domain
5. **Input Sanitization**: Validated on both client & server
6. **Environment Secrets**: API keys stored in .env

---

## Deployment Architecture

```
Production Environment
├── Frontend
│   ├── Vercel/Netlify (Next.js hosting)
│   └── CDN for static assets
│
├── Backend
│   ├── AWS/GCP/Azure VM or Docker
│   └── Uvicorn + Gunicorn for WSGI
│
├── Database
│   ├── MongoDB Atlas (managed)
│   └── Encrypted connections
│
└── Monitoring
    ├── Error tracking (Sentry)
    ├── Performance monitoring (DataDog)
    └── Logs aggregation (ELK Stack)
```

---

## Technology Justifications

| Component | Choice | Why |
|-----------|--------|-----|
| FastAPI | Python framework | Async, type hints, auto docs |
| Next.js | React framework | SSR, static generation, built-in routing |
| MongoDB | NoSQL database | Flexible schema, scalable, document-oriented |
| Beanie | ODM | Type-safe, async support, clean API |
| Claude API | LLM | State-of-art extraction, reasonable cost |
| JWT | Authentication | Stateless, scalable, standard |

---

## Future Enhancements

1. **Caching Layer**: Redis for frequently accessed data
2. **Message Queue**: Celery for async jobs
3. **Real-time Updates**: WebSockets for live notifications
4. **Advanced Search**: Elasticsearch integration
5. **ML Model Optimization**: Custom fine-tuned models
6. **Microservices**: Separate extraction service
