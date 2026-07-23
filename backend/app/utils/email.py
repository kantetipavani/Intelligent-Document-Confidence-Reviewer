import aiosmtplib

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings


async def send_email(
    to_email: str,
    subject: str,
    body: str,
):
    """Send an HTML email.

    If SMTP credentials are not configured, this falls back to a dev-safe mode:
    - logs the email content to backend stdout
    - does NOT raise (so OTP/password reset flows keep working locally)

    To enforce strict behavior, set SMTP_STRICT=true (or smtp_strict=True in .env).
    """

    if not settings.smtp_email or not settings.smtp_password:
        if settings.smtp_strict:
            raise Exception("SMTP_EMAIL or SMTP_PASSWORD not configured.")

        # Dev fallback: just log.
        print(
            "[DEV OTP EMAIL FALLBACK] SMTP is not configured. "
            "E-mail not actually sent.\n"
            f"To: {to_email}\nSubject: {subject}\nBody: {body}\n"
        )
        return

    message = MIMEMultipart()

    message["From"] = settings.smtp_email
    message["To"] = to_email
    message["Subject"] = subject

    message.attach(
        MIMEText(body, "html")
    )

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_email,
        password=settings.smtp_password,
        start_tls=True,
    )

