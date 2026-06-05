from __future__ import annotations

import hashlib

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.user import User, normalize_email

router = APIRouter()


class RegisterPayload(BaseModel):
    email: str
    password: str
    tenant_id: str


class LoginPayload(BaseModel):
    email: str
    password: str


class ChangePasswordPayload(BaseModel):
    email: str
    current_password: str
    new_password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str | None = None


def hash_password(password: str) -> str:
    # Lightweight hash for scaffold purposes.
    # In production use bcrypt/argon2.
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterPayload) -> AuthResponse:
    email = normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    if payload.password is None or len(payload.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="password must be at least 6 characters",
        )

    existing = await User.find_one(User.email == email)
    if existing:
        raise HTTPException(status_code=409, detail="user already exists")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        tenant_id=payload.tenant_id,
    )
    await user.insert()

    # Frontend only checks token existence; keep stub token format.
    return AuthResponse(
        access_token=f"stub-token::{email}",
        token_type="bearer",
        email=email,
    )


@router.post("/change-password")
async def change_password(payload: ChangePasswordPayload) -> dict:
    email = normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="password must be at least 6 characters")

    user = await User.find_one(User.email == email)
    if not user or user.password_hash != hash_password(payload.current_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    user.password_hash = hash_password(payload.new_password)
    await user.save()

    try:
        from app.api.activity import record_event

        await record_event(
            event_type="change_password",
            user_email=email,
            tenant_id=getattr(user, "tenant_id", None),
            payload={"email": email, "action": "password_changed"},
        )
    except Exception:
        pass

    return {"status": "ok"}


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginPayload) -> AuthResponse:
    email = normalize_email(payload.email)
    user = await User.find_one(User.email == email)
    if not user or user.password_hash != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Audit: login
    try:
        from app.api.activity import record_event

        await record_event(
            event_type="login",
            user_email=email,
            tenant_id=getattr(user, "tenant_id", None),
            payload={"email": email},
        )
    except Exception:
        pass

    return AuthResponse(
        access_token=f"stub-token::{email}",
        token_type="bearer",
        email=email,
    )



