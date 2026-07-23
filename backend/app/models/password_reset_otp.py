from __future__ import annotations

from datetime import datetime

from beanie import Document
from pydantic import Field


class PasswordResetOTP(Document):
    """Store OTPs for forgot-password.

    Notes:
    - OTPs are numeric codes.
    - We also store email so we can query without needing the user model.
    - We store a type discriminator to keep the collection future-proof.
    """

    email: str = Field(min_length=3, max_length=255)
    otp: str = Field(min_length=4, max_length=10)  # allow 4-10 digits
    expires_at: datetime
    used_at: datetime | None = None
    verification_token: str | None = None  # one-time token returned after OTP verification

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "password_reset_otps"

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() >= self.expires_at

    def mark_used(self) -> None:
        self.used_at = datetime.utcnow()

