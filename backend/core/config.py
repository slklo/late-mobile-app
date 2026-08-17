from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    app_name: str = "LatePlate API"
    app_environment: Literal["development", "test", "production"] = (
        "production"
    )
    
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = Field(default=30, gt=0)
    refresh_token_bytes: int = Field(default=32, ge=32)

    auth_challenge_secret: SecretStr = Field(min_length=32)
    auth_challenge_ttl_seconds: int = Field(default=600, gt=0)
    auth_resend_cooldown_seconds: int = Field(default=60, ge=0)
    auth_magic_link_token_bytes: int = Field(default=32, ge=32)
    auth_magic_link_app_url: str = Field(
        default="lateplate://auth/email/link",
        min_length=1,
    )
    auth_code_max_attempts: int = Field(default=5, ge=1)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
settings = Settings()
