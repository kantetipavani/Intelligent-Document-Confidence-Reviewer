# API Documentation

Complete reference for all INDCR backend endpoints.

## Base URL
```
Development: http://localhost:8000
Production: https://api.indcr.com (example)
```

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

**Token Format:**
```json
{
  "sub": "user@example.com",
  "user_id": "507f1f77bcf86cd799439011",
  "exp": 1625097600
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message",
  "status_code": 400,
  "error_type": "validation_error"
}
```

### Common Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Validation Error - Schema validation failed |
| 500 | Internal Server Error - Unexpected error |
| 503 | Service Unavailable - LLM/DB down |

---

## Endpoints

### 🔐 Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com"
}
```

**Errors:**
- 409: User already exists
- 422: Invalid email/password format

---

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "user_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Errors:**
- 401: Invalid credentials
- 404: User not found

---

#### Logout User
```http
POST /auth/logout
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 📄 Documents

#### Upload Invoice
```http
POST /documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Fields:
  - tenant_id (string): default or custom tenant
  - filename (string): original filename
  - user_email (string): uploader email
  - file (file): PDF/DOC/TXT file
```

**Response (201):**
```json
{
  "document_id": "507f1f77bcf86cd799439011",
  "filename": "invoice_2024_01_15.pdf",
  "tenant_id": "default",
  "uploaded_by": "user@example.com",
  "status": "extracted",
  "created_at": "2024-01-15T10:30:00Z",
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
    },
    "date": {
      "value": "2024-01-10",
      "confidence": 0.93
    }
  }
}
```

**Errors:**
- 400: Missing required fields
- 413: File too large
- 415: Unsupported file type

---

#### Get Document by ID
```http
GET /documents/{document_id}
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "document_id": "507f1f77bcf86cd799439011",
  "filename": "invoice_2024_01_15.pdf",
  "tenant_id": "default",
  "uploaded_by": "user@example.com",
  "status": "extracted",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z",
  "latest_extraction_id": "extraction_001",
  "versions_count": 1
}
```

**Errors:**
- 404: Document not found

---

#### List Documents
```http
GET /documents/list?tenant_id=default&limit=20&skip=0
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `tenant_id` | string | Filter by tenant (default: "default") |
| `limit` | integer | Results per page (default: 20) |
| `skip` | integer | Pagination offset (default: 0) |
| `user_email` | string | Filter by uploader email |
| `status` | string | Filter by status (extracted, pending, approved) |

**Response (200):**
```json
{
  "documents": [
    {
      "document_id": "507f1f77bcf86cd799439011",
      "filename": "invoice_001.pdf",
      "status": "extracted",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "document_id": "507f1f77bcf86cd799439012",
      "filename": "invoice_002.pdf",
      "status": "approved",
      "created_at": "2024-01-15T11:00:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "skip": 0
}
```

---

#### Delete Document
```http
DELETE /documents/{document_id}
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Document deleted successfully",
  "document_id": "507f1f77bcf86cd799439011"
}
```

**Errors:**
- 404: Document not found
- 403: Insufficient permissions

---

### 🔍 Extraction

#### Trigger Extraction
```http
POST /extraction/extract
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_id": "507f1f77bcf86cd799439011",
  "re_extract": false,
  "model": "claude-3-5-haiku-latest"
}
```

**Response (200):**
```json
{
  "extraction_id": "extraction_001",
  "document_id": "507f1f77bcf86cd799439011",
  "status": "completed",
  "model_used": "claude-3-5-haiku-latest",
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
    },
    "date": {
      "value": "2024-01-10",
      "confidence": 0.93
    },
    "gstin": {
      "value": "27AABCT1234H1Z0",
      "confidence": 0.85
    }
  },
  "created_at": "2024-01-15T10:30:00Z",
  "processing_time_ms": 2340
}
```

**Errors:**
- 404: Document not found
- 503: LLM service unavailable

---

#### Get Extraction
```http
GET /extraction/{extraction_id}
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "extraction_id": "extraction_001",
  "document_id": "507f1f77bcf86cd799439011",
  "status": "completed",
  "model_used": "claude-3-5-haiku-latest",
  "extraction": { ... },
  "created_at": "2024-01-15T10:30:00Z",
  "processing_time_ms": 2340
}
```

---

### 📋 Versions

#### Get Latest Extraction
```http
GET /versions/latest/{document_id}
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "version": 1,
  "extraction_id": "extraction_001",
  "document_id": "507f1f77bcf86cd799439011",
  "extraction": { ... },
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Errors:**
- 404: No extraction found for document

---

#### List Document Versions
```http
GET /versions/list/{document_id}?limit=20&skip=0
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "document_id": "507f1f77bcf86cd799439011",
  "versions": [
    {
      "version": 3,
      "extraction_id": "extraction_003",
      "created_at": "2024-01-15T12:00:00Z",
      "status": "draft"
    },
    {
      "version": 2,
      "extraction_id": "extraction_002",
      "created_at": "2024-01-15T11:30:00Z",
      "status": "approved"
    },
    {
      "version": 1,
      "extraction_id": "extraction_001",
      "created_at": "2024-01-15T10:30:00Z",
      "status": "pending_review"
    }
  ],
  "total": 3
}
```

---

#### Compare Versions
```http
POST /versions/compare
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_id": "507f1f77bcf86cd799439011",
  "version_a": 1,
  "version_b": 2
}
```

**Response (200):**
```json
{
  "document_id": "507f1f77bcf86cd799439011",
  "version_a": 1,
  "version_b": 2,
  "differences": [
    {
      "field": "invoice_total",
      "version_a_value": "INR 12,500.00",
      "version_b_value": "INR 12,750.00",
      "changed": true
    },
    {
      "field": "vendor_name",
      "version_a_value": "Acme Supplies",
      "version_b_value": "Acme Supplies",
      "changed": false
    }
  ]
}
```

---

### ✅ Reviews

#### Approve Extraction
```http
POST /reviews/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "extraction_id": "extraction_001",
  "document_id": "507f1f77bcf86cd799439011",
  "approved_by": "user@example.com",
  "notes": "Verified and correct"
}
```

**Response (200):**
```json
{
  "message": "Extraction approved",
  "review_id": "review_001",
  "extraction_id": "extraction_001",
  "status": "approved",
  "approved_at": "2024-01-15T13:00:00Z"
}
```

---

#### Reject Extraction
```http
POST /reviews/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "extraction_id": "extraction_001",
  "document_id": "507f1f77bcf86cd799439011",
  "rejected_by": "user@example.com",
  "reason": "Incorrect vendor name",
  "correction": {
    "vendor_name": "ABC Corporation"
  }
}
```

**Response (200):**
```json
{
  "message": "Extraction rejected",
  "review_id": "review_002",
  "extraction_id": "extraction_001",
  "status": "rejected",
  "rejected_at": "2024-01-15T13:05:00Z"
}
```

---

### 📊 Activity & Audit

#### Get User Activity
```http
GET /activity/by-email/{user_email}?limit=50&skip=0
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Results per page (default: 50) |
| `skip` | integer | Pagination offset (default: 0) |
| `event_type` | string | Filter by event type |
| `start_date` | ISO string | Filter from date |
| `end_date` | ISO string | Filter to date |

**Response (200):**
```json
{
  "user_email": "user@example.com",
  "activity": [
    {
      "event_id": "event_001",
      "event_type": "extraction_completed",
      "user_email": "user@example.com",
      "document_id": "507f1f77bcf86cd799439011",
      "payload": {
        "extraction_id": "extraction_001",
        "fields_count": 5,
        "processing_time_ms": 2340
      },
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "event_id": "event_002",
      "event_type": "review_approved",
      "user_email": "user@example.com",
      "document_id": "507f1f77bcf86cd799439011",
      "payload": {
        "extraction_id": "extraction_001",
        "status": "approved"
      },
      "created_at": "2024-01-15T13:00:00Z"
    }
  ],
  "total": 2,
  "limit": 50,
  "skip": 0
}
```

**Event Types:**
- `user_registered`
- `user_logged_in`
- `user_logged_out`
- `document_uploaded`
- `extraction_started`
- `extraction_completed`
- `extraction_failed`
- `review_approved`
- `review_rejected`
- `document_deleted`

---

#### Get Document Audit Trail
```http
GET /activity/audit/{document_id}
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "document_id": "507f1f77bcf86cd799439011",
  "audit_trail": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "action": "uploaded",
      "actor": "user@example.com",
      "details": "Invoice uploaded"
    },
    {
      "timestamp": "2024-01-15T10:31:00Z",
      "action": "extraction_started",
      "actor": "system",
      "details": "Extraction initiated"
    },
    {
      "timestamp": "2024-01-15T10:33:00Z",
      "action": "extraction_completed",
      "actor": "system",
      "details": "Fields extracted: 5"
    },
    {
      "timestamp": "2024-01-15T13:00:00Z",
      "action": "approved",
      "actor": "user@example.com",
      "details": "Document approved"
    }
  ]
}
```

---

### 👥 Tenants

#### Create Tenant
```http
POST /tenants
Authorization: Bearer <token>
Content-Type: application/json

{
  "tenant_id": "tenant_acme",
  "name": "ACME Corporation",
  "description": "ACME Corp invoice processing"
}
```

**Response (201):**
```json
{
  "tenant_id": "tenant_acme",
  "name": "ACME Corporation",
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

#### Get Tenant
```http
GET /tenants/{tenant_id}
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "tenant_id": "tenant_acme",
  "name": "ACME Corporation",
  "description": "ACME Corp invoice processing",
  "users_count": 5,
  "documents_count": 42,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### 💚 Health

#### Health Check
```http
GET /health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T15:30:00Z",
  "database": "connected",
  "llm_service": "available",
  "version": "0.1.0"
}
```

**Errors:**
- 503: Service unavailable (DB or LLM down)

---

## Batch Operations (Future)

### Batch Upload
```http
POST /documents/batch-upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Files: [invoice_1.pdf, invoice_2.pdf, invoice_3.pdf]
```

### Batch Extract
```http
POST /extraction/batch-extract
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_ids": ["id_1", "id_2", "id_3"]
}
```

---

## Rate Limiting (Future)

- **Standard**: 100 requests/minute per user
- **Extraction**: 10 extract calls/minute per user
- **Bulk Operations**: Custom limits

Response Header when rate limited:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642264800
```

---

## Webhooks (Future)

### Event Subscriptions
```http
POST /webhooks/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "event_type": "extraction_completed",
  "callback_url": "https://your-app.com/webhook",
  "secret": "webhook-secret-key"
}
```

### Webhook Payload
```json
{
  "event_id": "evt_001",
  "event_type": "extraction_completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "document_id": "507f1f77bcf86cd799439011",
    "extraction_id": "extraction_001",
    "status": "completed"
  }
}
```

---

## API Client Examples

### Using cURL

**Upload and Extract:**
```bash
curl -X POST "http://localhost:8000/documents/upload" \
  -F "tenant_id=default" \
  -F "filename=invoice.pdf" \
  -F "user_email=user@example.com" \
  -F "file=@invoice.pdf" \
  -H "Authorization: Bearer $TOKEN"
```

### Using Python (requests)

```python
import requests

BASE_URL = "http://localhost:8000"
TOKEN = "your_jwt_token"

headers = {"Authorization": f"Bearer {TOKEN}"}

# Upload
with open("invoice.pdf", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/documents/upload",
        headers=headers,
        files={"file": f},
        data={
            "tenant_id": "default",
            "filename": "invoice.pdf",
            "user_email": "user@example.com"
        }
    )
    document = response.json()
    doc_id = document["document_id"]

# Get activity
activity = requests.get(
    f"{BASE_URL}/activity/by-email/user@example.com",
    headers=headers
)
print(activity.json())
```

### Using JavaScript (fetch)

```javascript
const TOKEN = "your_jwt_token";
const BASE_URL = "http://localhost:8000";

async function uploadInvoice(file) {
  const formData = new FormData();
  formData.append("tenant_id", "default");
  formData.append("filename", file.name);
  formData.append("user_email", "user@example.com");
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/documents/upload`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`
    },
    body: formData
  });

  return response.json();
}

async function getActivity(email) {
  const response = await fetch(
    `${BASE_URL}/activity/by-email/${email}`,
    {
      headers: {
        "Authorization": `Bearer ${TOKEN}`
      }
    }
  );
  return response.json();
}
```

---

## Pagination

All list endpoints support pagination:

```http
GET /documents/list?limit=20&skip=40
```

**Response:**
```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "skip": 40,
  "has_more": true
}
```

---

## Filtering & Sorting (Future)

```http
GET /documents/list?sort=-created_at&status=approved&tenant_id=default
```

**Query Parameters:**
- `sort`: Field name (prefix with `-` for descending)
- `status`: Filter by status
- `date_from`: ISO date
- `date_to`: ISO date

---

## API Versioning

Current: **v1**

Future versions will be accessed via:
```
http://localhost:8000/api/v2/documents
```

---

## SDK & Libraries

### Python SDK (Future)
```bash
pip install indcr-sdk
```

```python
from indcr import Client

client = Client(api_key="your_key", base_url="http://localhost:8000")
doc = client.documents.upload("invoice.pdf", tenant_id="default")
extraction = client.extraction.extract(doc.id)
```

### JavaScript/TypeScript SDK (Future)
```bash
npm install indcr-js
```

```typescript
import { IndcrClient } from "indcr-js";

const client = new IndcrClient({ apiKey: "your_key" });
const doc = await client.documents.upload(file);
const extraction = await client.extraction.extract(doc.id);
```
