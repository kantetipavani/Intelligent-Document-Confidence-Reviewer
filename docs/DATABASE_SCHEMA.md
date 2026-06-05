# Database Schema & Data Models

Complete reference for MongoDB collections and data structures.

---

## Collections Overview

| Collection | Purpose | Primary Key |
|-----------|---------|------------|
| `users` | User accounts & credentials | `_id` / `email` |
| `documents` | Uploaded invoice files | `_id` / `document_id` |
| `extraction_runs` | LLM extraction results | `_id` / `extraction_id` |
| `review_versions` | User reviews/approvals | `_id` / `review_id` |
| `audit_events` | User actions & system events | `_id` / `event_id` |
| `tenants` | Multi-tenant organizations | `_id` / `tenant_id` |

---

## Collection: `users`

Stores user account information.

### Schema

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "user_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "full_name": "John Doe",
  "password_hash": "$2b$12$...",
  "tenant_id": "default",
  "is_active": true,
  "last_login": "2024-01-15T14:30:00Z",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB primary key (auto-generated) |
| `user_id` | String | Unique user identifier |
| `email` | String | User email (unique) |
| `full_name` | String | User's full name |
| `password_hash` | String | Hashed password (bcrypt) |
| `tenant_id` | String | Associated tenant |
| `is_active` | Boolean | Account active status |
| `last_login` | ISODate | Last login timestamp |
| `created_at` | ISODate | Account creation time |
| `updated_at` | ISODate | Last update time |

### Indexes

```javascript
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "tenant_id": 1 })
db.users.createIndex({ "created_at": -1 })
```

### Example Queries

```javascript
// Find user by email
db.users.findOne({ email: "user@example.com" })

// List all users in a tenant
db.users.find({ tenant_id: "default" })

// Count active users
db.users.countDocuments({ is_active: true })
```

---

## Collection: `documents`

Stores uploaded invoice documents.

### Schema

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "document_id": "507f1f77bcf86cd799439012",
  "tenant_id": "default",
  "filename": "invoice_2024_01_15.pdf",
  "original_filename": "INV-001.pdf",
  "file_path": "/storage/documents/507f1f77bcf86cd799439012.pdf",
  "file_size_bytes": 245678,
  "file_type": "application/pdf",
  "uploaded_by": "user@example.com",
  "status": "extracted",
  "latest_extraction_id": "extraction_001",
  "versions_count": 1,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z",
  "metadata": {
    "source": "upload",
    "scanner_type": null,
    "language": "en"
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB primary key |
| `document_id` | String | Unique document identifier |
| `tenant_id` | String | Tenant ownership |
| `filename` | String | Processed filename |
| `original_filename` | String | Original uploaded filename |
| `file_path` | String | Storage path to file |
| `file_size_bytes` | Number | File size in bytes |
| `file_type` | String | MIME type |
| `uploaded_by` | String | Uploader email |
| `status` | String | One of: pending, extracted, approved, rejected |
| `latest_extraction_id` | String | Most recent extraction ID |
| `versions_count` | Number | Total extraction versions |
| `created_at` | ISODate | Upload time |
| `updated_at` | ISODate | Last update time |
| `metadata` | Object | Additional data |

### Status Values

- `pending` - Awaiting extraction
- `extracted` - Extraction completed
- `approved` - Review approved
- `rejected` - Review rejected

### Indexes

```javascript
db.documents.createIndex({ "tenant_id": 1, "created_at": -1 })
db.documents.createIndex({ "document_id": 1 }, { unique: true })
db.documents.createIndex({ "uploaded_by": 1 })
db.documents.createIndex({ "status": 1 })
```

### Example Queries

```javascript
// Get document by ID
db.documents.findOne({ document_id: "507f1f77bcf86cd799439012" })

// List documents in tenant
db.documents.find({ tenant_id: "default" }).sort({ created_at: -1 })

// Find extracted documents
db.documents.find({ 
  tenant_id: "default",
  status: "extracted"
}).limit(20)
```

---

## Collection: `extraction_runs`

Stores LLM extraction results.

### Schema

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "extraction_id": "extraction_001",
  "document_id": "507f1f77bcf86cd799439012",
  "tenant_id": "default",
  "version": 1,
  "model_used": "claude-3-5-haiku-latest",
  "extraction": {
    "invoice_number": {
      "value": "INV-1001",
      "confidence": 0.96,
      "raw_text": "Invoice #1001"
    },
    "vendor_name": {
      "value": "Acme Supplies",
      "confidence": 0.91,
      "raw_text": "ACME SUPPLIES INC"
    },
    "invoice_total": {
      "value": "INR 12,500.00",
      "confidence": 0.88,
      "raw_text": "Total: INR 12,500.00"
    },
    "date": {
      "value": "2024-01-10",
      "confidence": 0.93,
      "raw_text": "Date: 10/01/2024"
    },
    "gstin": {
      "value": "27AABCT1234H1Z0",
      "confidence": 0.85,
      "raw_text": "GSTIN: 27AABCT1234H1Z0"
    }
  },
  "status": "completed",
  "processing_time_ms": 2340,
  "tokens_used": {
    "input_tokens": 1024,
    "output_tokens": 256
  },
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | MongoDB primary key |
| `extraction_id` | String | Unique extraction ID |
| `document_id` | String | Associated document ID |
| `tenant_id` | String | Tenant ownership |
| `version` | Number | Version number |
| `model_used` | String | LLM model used |
| `extraction` | Object | Extracted fields (see structure) |
| `status` | String | completed, failed, pending |
| `processing_time_ms` | Number | Time taken (milliseconds) |
| `tokens_used` | Object | API token usage |
| `created_at` | ISODate | Extraction time |

### Extraction Field Structure

Each extracted field contains:
```json
{
  "value": "extracted_value",        // Main extracted value
  "confidence": 0.95,                // Confidence score (0-1)
  "raw_text": "original_text"        // Text from document
}
```

### Indexes

```javascript
db.extraction_runs.createIndex({ "document_id": 1 })
db.extraction_runs.createIndex({ "extraction_id": 1 }, { unique: true })
db.extraction_runs.createIndex({ "tenant_id": 1, "created_at": -1 })
db.extraction_runs.createIndex({ "status": 1 })
```

### Example Queries

```javascript
// Get latest extraction for document
db.extraction_runs.findOne(
  { document_id: "507f1f77bcf86cd799439012" },
  { sort: { created_at: -1 } }
)

// Get all versions of a document
db.extraction_runs.find({ 
  document_id: "507f1f77bcf86cd799439012" 
}).sort({ version: -1 })

// Calculate average confidence per field
db.extraction_runs.aggregate([
  { $match: { tenant_id: "default" } },
  { $group: {
      _id: null,
      avg_confidence: { $avg: "$extraction.invoice_number.confidence" }
    }
  }
])
```

---

## Collection: `review_versions`

Stores review/approval records.

### Schema

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "review_id": "review_001",
  "extraction_id": "extraction_001",
  "document_id": "507f1f77bcf86cd799439012",
  "tenant_id": "default",
  "status": "approved",
  "approved_by": "reviewer@example.com",
  "approved_at": "2024-01-15T13:00:00Z",
  "notes": "Verified and correct",
  "corrections": {},
  "confidence_threshold": 0.80
}
```

### Status Values

- `approved` - User approved the extraction
- `rejected` - User rejected the extraction
- `pending_review` - Awaiting review
- `resubmitted` - Resubmitted after rejection

### Example Review (Rejected)

```json
{
  "status": "rejected",
  "rejected_by": "reviewer@example.com",
  "rejected_at": "2024-01-15T13:00:00Z",
  "reason": "Vendor name incorrect",
  "corrections": {
    "vendor_name": "ABC Corporation Limited"
  }
}
```

### Indexes

```javascript
db.review_versions.createIndex({ "extraction_id": 1 })
db.review_versions.createIndex({ "document_id": 1 })
db.review_versions.createIndex({ "status": 1 })
```

---

## Collection: `audit_events`

Stores user actions and system events for audit trails.

### Schema

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439015"),
  "event_id": "evt_001",
  "event_type": "extraction_completed",
  "user_email": "user@example.com",
  "tenant_id": "default",
  "document_id": "507f1f77bcf86cd799439012",
  "extraction_id": "extraction_001",
  "payload": {
    "fields_count": 5,
    "processing_time_ms": 2340,
    "confidence_avg": 0.91,
    "status": "completed"
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Event Types

| Event Type | Triggered | Payload |
|-----------|-----------|---------|
| `user_registered` | User sign-up | email, full_name |
| `user_logged_in` | User login | email, ip_address |
| `user_logged_out` | User logout | email |
| `document_uploaded` | File uploaded | filename, file_size_bytes |
| `extraction_started` | Extraction begins | document_id, model |
| `extraction_completed` | Extraction finishes | extraction_id, processing_time_ms |
| `extraction_failed` | Extraction error | document_id, error_message |
| `review_approved` | User approves | extraction_id, notes |
| `review_rejected` | User rejects | extraction_id, reason |
| `document_deleted` | Document removed | document_id |
| `batch_upload_started` | Bulk upload begins | file_count |
| `batch_upload_completed` | Bulk upload finishes | processed_count, failed_count |

### Indexes

```javascript
db.audit_events.createIndex({ "user_email": 1, "created_at": -1 })
db.audit_events.createIndex({ "document_id": 1 })
db.audit_events.createIndex({ "event_type": 1 })
db.audit_events.createIndex({ "tenant_id": 1, "created_at": -1 })
db.audit_events.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 })
```

### TTL Index

The last index is a TTL index that automatically deletes audit events after 90 days:

```javascript
// Audit logs expire after 90 days (7776000 seconds)
db.audit_events.createIndex(
  { "created_at": 1 },
  { expireAfterSeconds: 7776000 }
)
```

### Example Queries

```javascript
// Get user activity
db.audit_events.find({ 
  user_email: "user@example.com" 
}).sort({ created_at: -1 }).limit(50)

// Get document audit trail
db.audit_events.find({ 
  document_id: "507f1f77bcf86cd799439012" 
}).sort({ created_at: 1 })

// Count events by type
db.audit_events.aggregate([
  { $group: { 
      _id: "$event_type", 
      count: { $sum: 1 } 
    } 
  }
])
```

---

## Collection: `tenants`

Stores multi-tenant organization information.

### Schema

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439016"),
  "tenant_id": "tenant_acme",
  "name": "ACME Corporation",
  "description": "ACME Corp invoice processing tenant",
  "is_active": true,
  "configuration": {
    "extraction_model": "claude-3-5-haiku-latest",
    "confidence_threshold": 0.80,
    "auto_approve": false,
    "custom_fields": []
  },
  "owner_email": "admin@acme.com",
  "users_count": 5,
  "documents_count": 42,
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-15T14:00:00Z"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `tenant_id` | String | Unique tenant identifier |
| `name` | String | Tenant display name |
| `description` | String | Tenant description |
| `is_active` | Boolean | Tenant active status |
| `configuration` | Object | Tenant-specific settings |
| `owner_email` | String | Tenant admin email |
| `users_count` | Number | Number of users |
| `documents_count` | Number | Total documents |

### Indexes

```javascript
db.tenants.createIndex({ "tenant_id": 1 }, { unique: true })
db.tenants.createIndex({ "is_active": 1 })
```

---

## Relationships & Foreign Keys

```
Users (1) ──→ (N) Documents
  └─ tenant_id = Documents.tenant_id

Documents (1) ──→ (N) ExtractionRuns
  └─ document_id = ExtractionRuns.document_id

ExtractionRuns (1) ──→ (N) ReviewVersions
  └─ extraction_id = ReviewVersions.extraction_id

AuditEvents references:
  └─ user_email (Users.email)
  └─ document_id (Documents.document_id)
  └─ extraction_id (ExtractionRuns.extraction_id)
```

---

## Aggregation Examples

### Get user's extraction history with latest review

```javascript
db.extraction_runs.aggregate([
  { $match: { document_id: "507f1f77bcf86cd799439012" } },
  { $lookup: {
      from: "review_versions",
      localField: "extraction_id",
      foreignField: "extraction_id",
      as: "reviews"
    }
  },
  { $sort: { created_at: -1 } },
  { $limit: 10 }
])
```

### Average extraction confidence by tenant

```javascript
db.extraction_runs.aggregate([
  { $match: { status: "completed" } },
  { $group: {
      _id: "$tenant_id",
      avg_invoice_number_confidence: {
        $avg: "$extraction.invoice_number.confidence"
      },
      avg_vendor_name_confidence: {
        $avg: "$extraction.vendor_name.confidence"
      },
      total_extractions: { $sum: 1 }
    }
  },
  { $sort: { total_extractions: -1 } }
])
```

### Documents awaiting review

```javascript
db.documents.aggregate([
  { $match: { 
      status: "extracted",
      tenant_id: "default"
    } 
  },
  { $lookup: {
      from: "extraction_runs",
      localField: "document_id",
      foreignField: "document_id",
      as: "extractions"
    }
  },
  { $lookup: {
      from: "review_versions",
      localField: "latest_extraction_id",
      foreignField: "extraction_id",
      as: "reviews"
    }
  },
  { $match: { reviews: { $size: 0 } } }
])
```

---

## Backup & Recovery

### Export Collection

```bash
mongoexport --db idc_dev --collection documents --out documents.json
```

### Import Collection

```bash
mongoimport --db idc_dev --collection documents --file documents.json
```

### Backup Entire Database

```bash
mongodump --db idc_dev --out ./backup
```

### Restore Entire Database

```bash
mongorestore --db idc_dev ./backup/idc_dev
```

---

## Performance Considerations

1. **Indexing**: Create indexes on frequently queried fields
2. **Aggregation**: Use aggregation pipeline for complex queries
3. **TTL Indexes**: Automatically delete old audit events
4. **Sharding**: Plan for horizontal scaling (future)
5. **Connection Pooling**: Configure for production

---

## Data Validation Rules

| Field | Validation |
|-------|-----------|
| Email | Must be valid email format |
| Password | Min 8 chars, must include uppercase/lowercase/number |
| Confidence | Must be between 0 and 1 |
| File size | Max 50MB |
| Document ID | Unique within tenant |
| Status | Must be predefined value |

---

## Migration Notes

When updating schemas:

1. Add new fields with `default` values
2. Create new indexes before data migration
3. Keep old indexes for backward compatibility
4. Test migrations on staging database first
5. Monitor query performance after changes

