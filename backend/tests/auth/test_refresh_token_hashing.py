import re

import pytest

from auth.token_service import (
    generate_refresh_token,
    hash_refresh_idempotency_key,
    hash_refresh_token,
)


def test_generate_refresh_token_returns_distinct_high_entropy_tokens() -> None:
    first = generate_refresh_token()
    second = generate_refresh_token()

    assert first != second
    assert len(first) >= 43
    assert len(second) >= 43
    assert re.fullmatch(r"[A-Za-z0-9_-]+", first)
    assert re.fullmatch(r"[A-Za-z0-9_-]+", second)


def test_generate_refresh_token_rejects_less_than_32_random_bytes() -> None:
    with pytest.raises(ValueError, match="at least 32"):
        generate_refresh_token(31)


def test_hash_refresh_token_is_deterministic_sha256_hex() -> None:
    refresh_token = generate_refresh_token()

    first_hash = hash_refresh_token(refresh_token)
    second_hash = hash_refresh_token(refresh_token)

    assert first_hash == second_hash
    assert first_hash != refresh_token
    assert len(first_hash) == 64
    assert re.fullmatch(r"[0-9a-f]{64}", first_hash)


def test_hash_refresh_idempotency_key_is_deterministic_sha256_hex() -> None:
    idempotency_key = "refresh-attempt-key-123"

    first_hash = hash_refresh_idempotency_key(idempotency_key)
    second_hash = hash_refresh_idempotency_key(idempotency_key)

    assert first_hash == second_hash
    assert first_hash != idempotency_key
    assert len(first_hash) == 64
    assert re.fullmatch(r"[0-9a-f]{64}", first_hash)
