from __future__ import annotations

from fastapi import APIRouter, Depends


from app.api.activity import record_event
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)) -> dict:
    # Authenticated logout: ensures event is tenant-scoped to the caller.
    try:
        await record_event(
            event_type="logout",
            user_email=current_user.email,
            tenant_id=current_user.tenant_id,
            payload={"email": current_user.email},
        )
    except Exception:
        pass

    # Frontend still clears localStorage/token.
    return {"status": "ok"}



