from __future__ import annotations

# Kafka topics (event stream namespaces)
DOCUMENT_EVENTS = "indcr.document.events"  # upload, extraction start/complete/failed
REVIEW_EVENTS = "indcr.review.events"  # field review, approval, rejection
AUDIT_EVENTS = "indcr.audit.events"  # audit log entries

