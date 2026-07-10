from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from beanie import PydanticObjectId

from app.models.audit_event import AuditEvent
from app.models.document import Document


@dataclass(frozen=True)
class AtlasSearchConfig:
    index_name: str
    query_field: str
    tenant_field: str
    date_field: str
    confidence_field: str


def _default_config() -> AtlasSearchConfig:
    # These env vars are optional; defaults target the scaffold fields.
    import os

    return AtlasSearchConfig(
        index_name=os.getenv("ATLAS_SEARCH_INDEX", "documents_source_text"),
        query_field=os.getenv("ATLAS_TEXT_FIELD", "source_text"),
        tenant_field=os.getenv("ATLAS_TENANT_FIELD", "tenant_id"),
        date_field=os.getenv("ATLAS_DATE_FIELD", "created_at"),
        confidence_field=os.getenv("ATLAS_CONFIDENCE_FIELD", "confidence"),
    )


def _parse_confidence_from_audit_payload(payload: Any) -> Optional[float]:
    """Best-effort extraction of a representative confidence from AuditEvent payload."""
    if not isinstance(payload, dict):
        return None

    extraction = payload.get("extraction") if isinstance(payload.get("extraction"), dict) else payload

    fields_obj: Any = None
    if isinstance(extraction, dict):
        if isinstance(extraction.get("fields"), dict):
            fields_obj = extraction.get("fields")
        else:
            fields_obj = {k: v for k, v in extraction.items() if isinstance(v, dict)}

    if not isinstance(fields_obj, dict):
        return None

    confidences: list[float] = []
    for _, field_data in fields_obj.items():
        if not isinstance(field_data, dict):
            continue
        c = field_data.get("confidence")
        if c is None:
            continue
        try:
            confidences.append(float(c))
        except Exception:
            continue

    if not confidences:
        return None

    return sum(confidences) / len(confidences)


async def atlas_or_fallback_full_text_search(
    *,
    q: str,
    tenant_id: str,
    from_: Optional[datetime],
    to: Optional[datetime],
    min_confidence: Optional[float],
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    """Run Atlas Search if available, otherwise fallback.

    Returns list of items: {document_id, filename, score, created_at}
    """

    cfg = _default_config()

    # --- Atlas Search implementation ---
    # NOTE: Beanie can aggregate, but we keep the stage explicit.
    try:
        search_stage: dict[str, Any] = {
            "$search": {
                "index": cfg.index_name,
                "compound": {
                    "must": [
                        {
                            "text": {
                                "query": q,
                                "path": cfg.query_field,
                                "fuzzy": {"maxEdits": 1},
                            }
                        }
                    ],
                    "filter": [
                        {"equals": {"path": cfg.tenant_field, "value": tenant_id}},
                    ],
                },
            }
        }

        # date filter
        if from_ is not None or to is not None:
            range_spec: dict[str, Any] = {}
            if from_ is not None:
                range_spec["gte"] = from_
            if to is not None:
                range_spec["lte"] = to

            search_stage["$search"]["compound"]["filter"].append(
                {"range": {"path": cfg.date_field, **range_spec}}
            )

        # confidence filter
        if min_confidence is not None:
            search_stage["$search"]["compound"]["filter"].append(
                {"range": {"path": cfg.confidence_field, "gte": float(min_confidence)}}
            )

        pipeline: list[dict[str, Any]] = [
            search_stage,
            # project the fields we need
            {
                "$project": {
                    "_id": 0,
                    "document_id": "$_id",
                    "filename": 1,
                    "created_at": 1,
                    "score": {"$meta": "searchScore"},
                }
            },
            {"$sort": {"score": -1}},
            {"$skip": int(offset)},
            {"$limit": int(limit)},
        ]

        # Beanie aggregate
        results = []
        async for doc in Document.get_motor_collection().aggregate(pipeline, allowDiskUse=True):
            results.append(doc)
        return results

    except Exception:
        # --- fallback: best-effort match over AuditEvent payloads ---
        mongo_filter: dict[str, Any] = {
            "tenant_id": tenant_id,
            "event_type": {"$in": ["extraction_completed", "extraction_retrieved"]},
        }

        if from_ is not None:
            mongo_filter.setdefault("created_at", {})
            mongo_filter["created_at"]["$gte"] = from_
        if to is not None:
            mongo_filter.setdefault("created_at", {})
            mongo_filter["created_at"]["$lte"] = to

        candidates = (
            await AuditEvent.find(mongo_filter)
            .sort("-created_at")
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        q_lower = q.lower()
        items: list[dict[str, Any]] = []

        for ev in candidates:
            doc_id = ev.payload.get("document_id") if isinstance(ev.payload, dict) else None
            filename = ev.payload.get("filename") if isinstance(ev.payload, dict) else None
            if not doc_id or not isinstance(doc_id, str):
                continue

            avg_conf = _parse_confidence_from_audit_payload(ev.payload)
            if min_confidence is not None:
                if avg_conf is None or avg_conf < float(min_confidence):
                    continue

            extraction = ev.payload.get("extraction") if isinstance(ev.payload, dict) else None
            haystack = ""
            if isinstance(extraction, dict):
                fields = extraction.get("fields")
                if isinstance(fields, dict):
                    parts: list[str] = []
                    for _, field_data in fields.items():
                        if isinstance(field_data, dict) and "value" in field_data:
                            parts.append(str(field_data.get("value") or ""))
                    haystack = " ".join(parts)
                else:
                    haystack = str(extraction)
            else:
                haystack = str(ev.payload)

            if q_lower not in haystack.lower():
                continue

            score = 1.0
            if haystack:
                score = float(haystack.lower().count(q_lower))

            items.append(
                {
                    "document_id": doc_id,
                    "filename": filename if isinstance(filename, str) else None,
                    "score": score,
                    "created_at": ev.created_at,
                }
            )

        items.sort(key=lambda x: x["score"], reverse=True)
        return items[:limit]

