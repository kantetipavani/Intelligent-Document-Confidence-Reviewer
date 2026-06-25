from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.models.user import User

# Passlib bcrypt can fail if the installed `bcrypt` wheel is incompatible.
# The error seen in logs is typically:
#   AttributeError: module 'bcrypt' has no attribute '__about__'
#
# Avoid hard-crashing the app by catching bcrypt backend load failures and
# falling back to an importable configuration.
#
# NOTE: If bcrypt is truly broken, login/register should fail gracefully
# (HTTP 401/400) rather than crash the whole app.
# Create CryptContext lazily with fallback.
# passlib's bcrypt handler may raise during backend load if bcrypt wheels are incompatible.
try:
    pwd_context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__ident="2b",
    )
except Exception:  # pragma: no cover
    pwd_context = None


def _get_pwd_context() -> CryptContext:
    global pwd_context
    if pwd_context is not None:
        return pwd_context
    # If context creation failed at import time, re-attempt on-demand.
    # If it still fails, let hashing/verification raise a clear error.
    pwd_context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__ident="2b",
    )
    return pwd_context




def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None

    # Expected: "Bearer <token>"
    parts = authorization.split(" ", 1)
    if len(parts) != 2:
        return None

    scheme, token = parts
    if scheme.lower() != "bearer":
        return None

    return token


class TokenPayload:
    email: str
    tenant_id: str
    role: str
    exp: int


def hash_password(password: str) -> str:
    ctx = _get_pwd_context()
    try:
        return ctx.hash(password)
    except Exception as exc:  # pragma: no cover
        # If passlib bcrypt backend fails to load due to bcrypt install mismatch,
        # avoid server crash: raise a clean auth error.
        raise HTTPException(status_code=500, detail="Password hashing backend unavailable") from exc


def verify_password(plain_password: str, password_hash: str) -> bool:
    ctx = _get_pwd_context()
    try:
        return ctx.verify(plain_password, password_hash)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail="Password verification backend unavailable") from exc


def create_access_token(
    subject: str,
    tenant_id: str,
    role: str = "user",
    expires_delta: timedelta | None = None,
) -> str:
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.jwt_expiration_minutes)
    )
    payload: dict[str, Any] = {
        "sub": subject,
        "email": subject,
        "tenant_id": tenant_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(
    authorization: str | None = Header(default=None, convert_underscores=False),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_bearer_token(authorization)
    if token is None:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )

        email = payload.get("email") or payload.get("sub")
        tenant_id = payload.get("tenant_id")
        role = payload.get("role")

        if email is None or tenant_id is None or role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # If Beanie/Mongo wasn't initialized, avoid hard 500.
    # This keeps /documents/upload usable for extraction UI flows.
    try:
        user = await User.find_one({"email": email})
    except Exception:
        raise credentials_exception

    if not user or user.tenant_id != tenant_id:
        raise credentials_exception

    return user


def require_role(*roles: str) -> Callable[[User], Any]:
    async def _require_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges",
            )
        return current_user

    return _require_role

def validate_ws_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except JWTError:
        raise WebSocketException(code=4001)

