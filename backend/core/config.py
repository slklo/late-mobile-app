from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PRODUCTION_JWT_SECRET_MIN_LENGTH = 48
INSECURE_SECRET_VALUES = {
    "secret",
    "jwtsecret",
    "devsecret",
    "testsecret",
    "lateplatesecret",
}
INSECURE_SECRET_MARKERS = {
    "changeme",
    "yoursecrethere",
    "devsecret",
    "testsecret",
    "lateplatesecret",
}


def _normalized_secret_marker(value: str) -> str:
    return "".join(
        character
        for character in value.casefold()
        if character.isalnum()
    )


def _contains_insecure_secret_marker(value: str) -> bool:
    normalized = _normalized_secret_marker(value)
    return (
        normalized in INSECURE_SECRET_VALUES
        or any(marker in normalized for marker in INSECURE_SECRET_MARKERS)
    )


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    app_name: str = "LatePlate API"
    app_environment: Literal["development", "test", "production"] = (
        "production"
    )
    
    jwt_secret: SecretStr
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = Field(default=30, gt=0)
    refresh_session_absolute_lifetime_days: int = Field(default=90, gt=0)
    refresh_token_bytes: int = Field(default=32, ge=32)
    refresh_rotation_grace_seconds: int = Field(default=30, ge=0)
    refresh_idempotency_key_min_length: int = Field(default=16, ge=8)
    refresh_idempotency_key_max_length: int = Field(default=128, ge=16)

    auth_challenge_secret: SecretStr = Field(min_length=32)
    auth_challenge_ttl_seconds: int = Field(default=600, gt=0)
    auth_resend_cooldown_seconds: int = Field(default=60, ge=0)
    auth_magic_link_token_bytes: int = Field(default=32, ge=32)
    auth_magic_link_app_url: str = Field(
        default="lateplate://auth/email/link",
        min_length=1,
    )
    auth_code_max_attempts: int = Field(default=5, ge=1)

    @model_validator(mode="after")
    def validate_security_contract(self) -> "Settings":
        if (
            self.refresh_idempotency_key_max_length
            < self.refresh_idempotency_key_min_length
        ):
            raise ValueError(
                "refresh_idempotency_key_max_length must be greater than "
                "or equal to refresh_idempotency_key_min_length",
            )

        if (
            self.app_environment == "production"
            and self.refresh_session_absolute_lifetime_days
            < self.refresh_token_expire_days
        ):
            raise ValueError(
                "refresh_session_absolute_lifetime_days must be greater "
                "than or equal to refresh_token_expire_days in production",
            )

        if self.app_environment == "production":
            self._validate_production_secret(
                self.jwt_secret,
                name="jwt_secret",
                min_length=PRODUCTION_JWT_SECRET_MIN_LENGTH,
            )
            self._validate_production_secret(
                self.auth_challenge_secret,
                name="auth_challenge_secret",
                min_length=32,
            )

        return self

    @staticmethod
    def _validate_production_secret(
        secret: SecretStr,
        *,
        name: str,
        min_length: int,
    ) -> None:
        value = secret.get_secret_value()

        if len(value) < min_length:
            raise ValueError(
                f"{name} must contain at least {min_length} characters "
                "in production",
            )

        if _contains_insecure_secret_marker(value):
            raise ValueError(
                f"{name} must not use a default or placeholder value "
                "in production",
            )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
settings = Settings()
