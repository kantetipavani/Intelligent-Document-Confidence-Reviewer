from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.activity import record_event
from app.models.user import User, normalize_email

router = APIRouter()


class LogoutPayload(BaseModel):
    email: str | None = None


@router.post("/logout")
async def logout(payload: LogoutPayload | None = None) -> dict:
    # Scaffold logout: frontend clears localStorage.
    # Record event is best-effort (no auth middleware in scaffold).
    email = normalize_email(payload.email) if payload and payload.email else None
    user = await User.find_one(User.email == email) if email else None

    try:
        await record_event(
            event_type="logout",
            user_email=email,
            tenant_id=getattr(user, "tenant_id", None) if user else None,
            payload={"email": email} if email else {},
        )
    except Exception:
        pass

    return {"status": "ok"}


