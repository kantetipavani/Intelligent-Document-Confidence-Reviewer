from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.models.user import User

# Passlib bcrypt can fail if the installed `bcrypt` wheel is incompatible.
# Avoid hard-crashing the app by allowing graceful fallback to pure-python. 
# This is critical for login/register in dev environments.
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__ident="2b",
)



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
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


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

    user = await User.find_one(User.email == email)
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

