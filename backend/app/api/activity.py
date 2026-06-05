from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.audit_event import AuditEvent
from app.models.user import normalize_email

router = APIRouter()


class ActivityQuery(BaseModel):
    email: str


@router.get("/me")
async def get_my_activity() -> list[dict]:
    # Scaffold: no auth middleware wired, so /me isn't reliable.
    # Prefer using /by-email endpoint from the frontend.
    return []



@router.get("/by-email/{email}")
async def get_activity_by_email(email: str, limit: int = 200) -> list[dict]:

    email = normalize_email(email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")

    events = await AuditEvent.find({"user_email": email}).sort("-created_at").limit(limit).to_list()
    return [
        {
            "event_type": e.event_type,
            "user_email": e.user_email,
            "payload": e.payload,
            "created_at": e.created_at,
        }
        for e in events
    ]


async def record_event(
    *,
    event_type: str,
    user_email: str | None,
    tenant_id: str | None = None,
    payload: dict | None = None,
) -> None:
    # Fire-and-forget audit. Keep schema flexible.
    ev = AuditEvent(
        tenant_id=tenant_id,
        user_email=user_email,
        event_type=event_type,
        payload=payload or {},
    )
    await ev.insert()


