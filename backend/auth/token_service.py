from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe

import jwt
from jwt.exceptions import InvalidTokenError

from core.config import settings


def _jwt_secret_value() -> str:
    return settings.jwt_secret.get_secret_value()


def create_access_token(
    user_id: int,
    expires_minutes: int | None = None,
) -> str:
    lifetime_minutes = (
        expires_minutes
        if expires_minutes is not None
        else settings.access_token_expire_minutes
    )
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=lifetime_minutes,
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        _jwt_secret_value(),
        algorithm=settings.jwt_algorithm,
    )


def generate_refresh_token(token_bytes: int = 32) -> str:
    if token_bytes < 32:
        raise ValueError("token_bytes must be at least 32")

    return token_urlsafe(token_bytes)


def hash_refresh_token(refresh_token: str) -> str:
    return sha256(refresh_token.encode("utf-8")).hexdigest()


def hash_refresh_idempotency_key(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token,
            _jwt_secret_value(),
            algorithms=[settings.jwt_algorithm],
        )
        subject = payload.get("sub")

        if subject is None:
            return None

        return int(subject)
    except (InvalidTokenError, ValueError):
        return None
