from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "idc_dev"
    skip_db: bool = False

    jwt_secret: str = "supersecret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-haiku-latest"
    anthropic_max_tokens: int = 800


settings = Settings()

