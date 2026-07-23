import hashlib
import hmac
import secrets


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_magic_link_token(token_bytes: int) -> str:
    if token_bytes < 32:
        raise ValueError("token_bytes must be at least 32")

    return secrets.token_urlsafe(token_bytes)


def hash_challenge_secret(secret: str, *, key: str) -> str:
    if not secret:
        raise ValueError("secret must not be empty")

    if len(key) < 32:
        raise ValueError("key must contain at least 32 characters")

    return hmac.new(
        key.encode("utf-8"),
        secret.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_challenge_secret(
    candidate: str,
    expected_hash: str,
    *,
    key: str,
) -> bool:
    candidate_hash = hash_challenge_secret(candidate, key=key)
    return hmac.compare_digest(candidate_hash, expected_hash)
