from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.tenant import Tenant

router = APIRouter()


class TenantCreate(BaseModel):
    name: str


@router.post("")
async def create_tenant(payload: TenantCreate) -> dict:
    doc = Tenant(name=payload.name)
    await doc.insert()
    return {"tenant_id": str(doc.id)}


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: str) -> dict:
    tenant = await Tenant.get(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="tenant not found")
    return {"tenant_id": str(tenant.id), "name": tenant.name}

