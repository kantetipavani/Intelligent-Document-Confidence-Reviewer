from __future__ import annotations

from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/dashboard/stats")
async def dashboard_stats(current_user: User = Depends(get_current_user)) -> dict:
    # Minimal placeholder (no persisted statistics model exists in this scaffold yet).
    return {"tenant_id": current_user.tenant_id, "stats": {}}

