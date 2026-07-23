from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.activity import record_event
from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.user import User, normalize_email
from app.utils.email import send_email

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


class ForgotPasswordPayload(BaseModel):
    email: str


class ResetPasswordPayload(BaseModel):
    token: str | None = None
    email: str | None = None
    otp: str | None = None
    verification_token: str | None = None
    new_password: str


class SendOTPRequest(BaseModel):
    email: str



class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class VerifyOTPResponse(BaseModel):
    status: str = "ok"
    verification_token: str | None = None



class ResetPasswordOTPRequest(BaseModel):
    email: str
    otp: str
    verification_token: str | None = None
    new_password: str




# ----------------------------
# OTP flow (dev/email-OTP)
# ----------------------------


def _generate_otp_6_digits() -> str:
    # Always exactly 6 digits, zero-padded.
    import random

    return f"{random.randint(0, 999999):06d}"


@router.post("/send-otp")
async def send_otp(payload: SendOTPRequest) -> dict:
    """Send OTP to `email`."""

    from app.models.password_reset_otp import PasswordResetOTP

    email = normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")

    # Verify user exists before sending OTP to prevent "User not found" later.
    from beanie.exceptions import CollectionWasNotInitialized as _CollectionNotInit

    try:
        user_exists = await User.find_one({"email": email})
        if not user_exists:
            user_exists = await User.find_one(
                {"email": {"$regex": f"^{email}$", "$options": "i"}}
            )
    except _CollectionNotInit:
        from app.db.init_db import init_db
        await init_db()
        user_exists = await User.find_one({"email": email})
        if not user_exists:
            user_exists = await User.find_one(
                {"email": {"$regex": f"^{email}$", "$options": "i"}}
            )

    if not user_exists:
        # Avoid account enumeration: return generic message but error so frontend can show it.
        raise HTTPException(status_code=400, detail="No account found with this email")

    otp = _generate_otp_6_digits()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Expire any previous unused OTPs for this email to prevent stale OTP conflicts.
    from beanie.exceptions import CollectionWasNotInitialized

    try:
        await PasswordResetOTP.find(
            {"email": email, "used_at": None, "expires_at": {"$gt": datetime.utcnow()}}
        ).update({"$set": {"expires_at": datetime.utcnow()}})
    except CollectionWasNotInitialized:
        from app.db.init_db import init_db

        await init_db()
        await PasswordResetOTP.find(
            {"email": email, "used_at": None, "expires_at": {"$gt": datetime.utcnow()}}
        ).update({"$set": {"expires_at": datetime.utcnow()}})

    # Store/update OTP record.
    # Ensure Beanie is initialized (otherwise Beanie raises CollectionWasNotInitialized)

    try:
        otp_doc = PasswordResetOTP(
            email=email,
            otp=otp,
            expires_at=expires_at,
            used_at=None,
        )
        await otp_doc.insert()
    except CollectionWasNotInitialized:
        from app.db.init_db import init_db

        await init_db()
        otp_doc = PasswordResetOTP(
            email=email,
            otp=otp,
            expires_at=expires_at,
            used_at=None,
        )
        await otp_doc.insert()

    # Deliver via email if SMTP is configured; otherwise fail loudly for now.
    await send_email(
        email,
        "Your OTP",
        f"Your OTP is <b>{otp}</b>. It expires in 10 minutes.",
    )

    return {"message": "OTP sent successfully"}


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(payload: VerifyOTPRequest) -> VerifyOTPResponse:
    from app.models.password_reset_otp import PasswordResetOTP

    email = normalize_email(payload.email)
    otp = str(payload.otp).strip()
    if not otp:
        raise HTTPException(status_code=400, detail="otp required")

    from datetime import datetime
    from beanie.exceptions import CollectionWasNotInitialized

    try:
        otp_doc = await PasswordResetOTP.find_one(
            {"email": email, "otp": otp, "used_at": None, "expires_at": {"$gt": datetime.utcnow()}}
        )
    except CollectionWasNotInitialized:
        from app.db.init_db import init_db

        await init_db()
        otp_doc = await PasswordResetOTP.find_one(
            {"email": email, "otp": otp, "used_at": None, "expires_at": {"$gt": datetime.utcnow()}}
        )

    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if otp_doc.is_expired or otp_doc.used_at is not None:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # OTP is validated but NOT marked used here — it will be marked used
    # in the reset-password endpoint upon successful password change.
    # Generate a one-time verification token (UUID) and store it on the doc
    # so the reset-password endpoint can look it up without sending raw OTP.
    # Use atomic $set to avoid potential Beanie version conflicts with save().
    import uuid
    verification_token = str(uuid.uuid4())
    await PasswordResetOTP.find_one(
        {"_id": otp_doc.id}
    ).update({"$set": {"verification_token": verification_token}})

    return VerifyOTPResponse(status="ok", verification_token=verification_token)


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

    # bcrypt (via passlib) supports max 72 bytes input; long passwords crash hashing.
    # Bytes length matters, not just character count.
    if len(payload.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="password must be at most 72 bytes (use shorter password)",
        )

    existing = await User.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="user already exists")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        tenant_id=payload.tenant_id,
        role="user",
    )
    await user.insert()

    access_token = create_access_token(
        subject=email, tenant_id=payload.tenant_id, role=user.role
    )
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only change own password",
        )
    if not payload.new_password or len(payload.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="password must be at least 6 characters",
        )
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
    import logging

    email = normalize_email(payload.email)
    if payload.password is None or len(payload.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="password must be at least 6 characters",
        )

    # bcrypt (via passlib) supports max 72 bytes input; long passwords crash hashing.
    # Bytes length matters, not just character count.
    if len(payload.password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="password must be at most 72 bytes (use shorter password)",
        )

    # Ensure Beanie has been initialized (otherwise login crashes with
    # `CollectionWasNotInitialized`).
    from beanie.exceptions import CollectionWasNotInitialized

    try:
        user = await User.find_one({"email": email})
        if not user:
            user = await User.find_one(
                {"email": {"$regex": f"^{email}$", "$options": "i"}}
            )
    except CollectionWasNotInitialized:
        try:
            from app.db.init_db import init_db

            await init_db()
            user = await User.find_one({"email": email})
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail="Database not initialized. Please fix MongoDB connection and restart backend.",
            ) from exc

    if not user:
        logging.getLogger(__name__).warning(
            "login failed: user not found for email=%s (normalized=%s)",
            payload.email,
            email,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    try:
        is_valid = verify_password(payload.password, user.password_hash)
    except Exception:
        logging.getLogger(__name__).exception(
            "login failed: password verification error for email=%s tenant_id=%s",
            email,
            getattr(user, "tenant_id", None),
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not is_valid:
        logging.getLogger(__name__).warning(
            "login failed: password mismatch for email=%s tenant_id=%s role=%s",
            email,
            getattr(user, "tenant_id", None),
            getattr(user, "role", None),
        )
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

    access_token = create_access_token(
        subject=email,
        tenant_id=user.tenant_id,
        role=getattr(user, "role", "user"),
    )
    return AuthResponse(access_token=access_token, token_type="bearer", email=email)


def _create_reset_token(email: str) -> str:
    """Create a short-lived reset token (JWT)."""
    expire = datetime.utcnow() + timedelta(minutes=30)
    payload = {
        "sub": email,
        "email": email,
        "exp": expire,
        "type": "password_reset",
    }

    from jose import jwt

    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordPayload) -> dict:
    email = normalize_email(data.email)
    if not email:
        raise HTTPException(status_code=400, detail="email required")

    # Avoid account enumeration: always return success.
    try:
        user = await User.find_one({"email": email})
        if not user:
            user = await User.find_one(
                {"email": {"$regex": f"^{email}$", "$options": "i"}}
            )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Database not initialized") from exc

    if not user:
        return {"message": "Reset link sent successfully"}

    token = _create_reset_token(email)

    import os

    frontend_base_url = (
        os.getenv("NEXT_PUBLIC_BASE_URL")
        or os.getenv("FRONTEND_BASE_URL")
        or "http://localhost:3000"
    )

    reset_link = f"{frontend_base_url}/reset-password?token={token}"

    await send_email(
        email,
        "Reset Password",
        f"Click here to reset your password:<br/><a href=\"{reset_link}\">Reset Password</a>",
    )

    return {"message": "Reset link sent successfully"}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordPayload) -> dict:
    """Reset password.

    Supports two contracts:
    - JWT token flow: { token, new_password }
    - OTP flow (dev): { email, otp, new_password }
    """

    new_password = payload.new_password

    if not new_password or len(new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="password must be at least 6 characters",
        )

    if len(new_password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="password must be at most 72 bytes (use shorter password)",
        )

    # Detect OTP mode by presence of `email` and `otp` in the request payload.
    email = getattr(payload, "email", None)
    otp = getattr(payload, "otp", None)
    verification_token = getattr(payload, "verification_token", None)

    if email is not None and otp is not None:
        import logging as _logging

        _logger = _logging.getLogger(__name__)
        from app.models.password_reset_otp import PasswordResetOTP

        email = normalize_email(email)
        otp_str = str(otp).strip()  # strip whitespace like verify_otp does

        # Look up OTP doc. Prefer verification_token if provided (more secure).
        from beanie.exceptions import CollectionWasNotInitialized
        from datetime import datetime as dt

        try:
            if verification_token:
                otp_doc = await PasswordResetOTP.find_one(
                    {"email": email, "verification_token": verification_token, "used_at": None, "expires_at": {"$gt": dt.utcnow()}}
                )
                # Fallback: if verification_token lookup failed, try OTP-based lookup
                if not otp_doc:
                    otp_doc = await PasswordResetOTP.find_one(
                        {"email": email, "otp": otp_str, "used_at": None, "expires_at": {"$gt": dt.utcnow()}}
                    )
            else:
                otp_doc = await PasswordResetOTP.find_one(
                    {"email": email, "otp": otp_str, "used_at": None, "expires_at": {"$gt": dt.utcnow()}}
                )
        except CollectionWasNotInitialized:
            from app.db.init_db import init_db

            await init_db()
            if verification_token:
                otp_doc = await PasswordResetOTP.find_one(
                    {"email": email, "verification_token": verification_token, "used_at": None, "expires_at": {"$gt": dt.utcnow()}}
                )
                # Fallback: if verification_token lookup failed, try OTP-based lookup
                if not otp_doc:
                    otp_doc = await PasswordResetOTP.find_one(
                        {"email": email, "otp": otp_str, "used_at": None, "expires_at": {"$gt": dt.utcnow()}}
                    )
            else:
                otp_doc = await PasswordResetOTP.find_one(
                    {"email": email, "otp": otp_str, "used_at": None, "expires_at": {"$gt": dt.utcnow()}}
                )

        if not otp_doc:
            _logger.warning("reset_password: OTP not found for email=%s", email)
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

        if otp_doc.is_expired or otp_doc.used_at is not None:
            _logger.warning("reset_password: OTP expired/used for email=%s", email)
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

        # Update password — fetch user with DB init fallback.
        # Use case-insensitive fallback (same as login endpoint) in case of
        # email case mismatch between stored value and URL query chain.
        try:
            user = await User.find_one({"email": email})
            if not user:
                user = await User.find_one(
                    {"email": {"$regex": f"^{email}$", "$options": "i"}}
                )
        except CollectionWasNotInitialized:
            from app.db.init_db import init_db

            await init_db()
            user = await User.find_one({"email": email})
            if not user:
                user = await User.find_one(
                    {"email": {"$regex": f"^{email}$", "$options": "i"}}
                )

        if not user:
            _logger.warning("reset_password: user not found for email=%s", email)
            raise HTTPException(status_code=400, detail="User not found")

        user.password_hash = hash_password(new_password)
        await user.save()
        _logger.info("reset_password: password hash saved for email=%s", email)

        # Post-save verification: fetch user again and verify the new password.
        try:
            saved_user = await User.find_one({"email": email})
        except CollectionWasNotInitialized:
            from app.db.init_db import init_db

            await init_db()
            saved_user = await User.find_one({"email": email})

        if not saved_user:
            _logger.error("reset_password: user lost after save for email=%s", email)
            raise HTTPException(status_code=500, detail="Failed to verify password update")

        verify_ok = verify_password(new_password, saved_user.password_hash)
        if not verify_ok:
            _logger.error("reset_password: password verification FAILED after save for email=%s", email)
            raise HTTPException(status_code=500, detail="Password update verification failed")

        _logger.info("reset_password: password verified OK for email=%s", email)

        # Mark OTP as used (atomic to avoid Beanie save race).
        await PasswordResetOTP.find_one({"_id": otp_doc.id}).update(
            {"$set": {"used_at": dt.utcnow()}}
        )

        try:
            await record_event(
                event_type="reset_password",
                user_email=user.email,
                tenant_id=user.tenant_id,
                payload={"email": user.email, "action": "password_reset"},
            )
        except Exception:
            pass

        return {"status": "ok"}

    # Default: JWT token flow
    token = payload.token
    if not token:
        raise HTTPException(status_code=400, detail="token required")

    from jose import JWTError, jwt

    try:
        decoded = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise HTTPException(status_code=400, detail="Invalid or expired token") from exc

    if decoded.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid token")

    email = normalize_email(decoded.get("email") or decoded.get("sub") or "")
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")

    user = await User.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user.password_hash = hash_password(new_password)
    await user.save()

    try:
        await record_event(
            event_type="reset_password",
            user_email=user.email,
            tenant_id=user.tenant_id,
            payload={"email": user.email, "action": "password_reset"},
        )
    except Exception:
        pass

    return {"status": "ok"}

