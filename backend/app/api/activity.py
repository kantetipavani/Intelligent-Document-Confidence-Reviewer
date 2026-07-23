from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.audit_event import AuditEvent
from app.models.user import normalize_email, User

router = APIRouter()


class ActivityQuery(BaseModel):
    email: str


@router.get("")
async def get_all_activity(
    current_user: User = Depends(get_current_user),
    limit: int = 200,
) -> list[dict]:
    # Tenant + user scoped: prevents leaking audit data across tenants.
    email = normalize_email(current_user.email)
    events = await AuditEvent.find({
        "tenant_id": current_user.tenant_id,
        "user_email": email,
    }).sort("-created_at").limit(limit).to_list()

    return [
        {
            "event_type": e.event_type,
            "user_email": e.user_email,
            "tenant": e.tenant_id,
            "payload": e.payload,
            "created_at": e.created_at,
        }
        for e in events
    ]


@router.get("/me")
async def get_my_activity(
    current_user: User = Depends(get_current_user),
    limit: int = 200,
) -> list[dict]:
    # Tenant + user scoped: prevents leaking audit data across tenants.
    email = normalize_email(current_user.email)
    events = await AuditEvent.find({
        "tenant_id": current_user.tenant_id,
        "user_email": email,
    }).sort("-created_at").limit(limit).to_list()

    return [
        {
            "event_type": e.event_type,
            "user_email": e.user_email,
            "tenant": e.tenant_id,
            "payload": e.payload,
            "created_at": e.created_at,
        }
        for e in events
    ]


@router.get("/by-email/{email}")
async def get_activity_by_email(
    email: str,
    limit: int = 200,
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    # Lock down to same tenant and either self or same-user lookup.
    email = normalize_email(email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")

    if email != normalize_email(current_user.email):
        raise HTTPException(status_code=403, detail="Forbidden")

    events = await AuditEvent.find({
        "tenant_id": current_user.tenant_id,
        "user_email": email,
    }).sort("-created_at").limit(limit).to_list()

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


