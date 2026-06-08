from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.activity import record_event
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
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


@router.get("/me")
async def read_current_user(current_user: User = Depends(get_current_user)) -> dict:
    return {
        "email": current_user.email,
        "tenant_id": current_user.tenant_id,
        "role": getattr(current_user, "role", "user"),
    }


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
        role="user",
    )
    await user.insert()

    access_token = create_access_token(subject=email, tenant_id=payload.tenant_id, role=user.role)
    return AuthResponse(access_token=access_token, token_type="bearer", email=email)


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordPayload,
    current_user: User = Depends(get_current_user),
) -> dict:
    email = normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    if email != current_user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only change own password")
    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="password must be at least 6 characters")
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    current_user.password_hash = hash_password(payload.new_password)
    await current_user.save()

    try:
        await record_event(
            event_type="change_password",
            user_email=current_user.email,
            tenant_id=current_user.tenant_id,
            payload={"email": current_user.email, "action": "password_changed"},
        )
    except Exception:
        pass

    return {"status": "ok"}


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginPayload) -> AuthResponse:
    email = normalize_email(payload.email)
    user = await User.find_one(User.email == email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    try:
        await record_event(
            event_type="login",
            user_email=email,
            tenant_id=getattr(user, "tenant_id", None),
            payload={"email": email},
        )
    except Exception:
        pass

    access_token = create_access_token(subject=email, tenant_id=user.tenant_id, role=getattr(user, "role", "user"))
    return AuthResponse(access_token=access_token, token_type="bearer", email=email)



