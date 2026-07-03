from __future__ import annotations
from passlib.context import CryptContext
from pydantic_settings import BaseSettings

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str = "mongodb://localhost:27017" 
    mongodb_db: str = "idc_dev"
    skip_db: bool = False

    jwt_secret: str = "your_secret_key_here"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60

    # Anthropic (legacy)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-haiku-latest"
    anthropic_max_tokens: int = 800

    # Gemini (primary)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    gemini_max_output_tokens: int = 800

    # When true, backend skips calling any hosted LLM and uses local extraction only.
    # This prevents failures in environments without LLM credits/network.
    skip_llm: bool = False

    # ----------------------------
    # Tenant-aware rate limiting
    # ----------------------------
    # Fixed-window limiter (simple + predictable). Keyed by tenant_id + endpoint.
    rate_limit_window_seconds: int = 60

    # Default limits per tenant (requests per window)
    rate_limit_upload_default: int = 10
    rate_limit_trigger_default: int = 10

    # Optional overrides as JSON mapping tenant_id -> {"upload": int, "trigger": int}
    # Example:
    #   {"tenantA": {"upload": 2, "trigger": 1}, "tenantB": {"upload": 20}}
    rate_limit_overrides_json: str = ""




settings = Settings()


