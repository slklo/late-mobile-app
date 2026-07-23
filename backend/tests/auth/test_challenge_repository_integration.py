import asyncio
from uuid import uuid4

import pytest
from redis.asyncio import Redis

from auth.challenge_repository import (
    CHALLENGE_KEY_PREFIX,
    ChallengeKind,
    ChallengeRecord,
    ChallengeRepository,
)
from core.config import settings


pytestmark = pytest.mark.redis_integration


def test_challenge_really_expires_in_redis() -> None:
    async def scenario() -> None:
        redis = Redis.from_url(settings.redis_url, decode_responses=True)
        challenge_id = uuid4()
        repository = ChallengeRepository(redis)

        try:
            await repository.save_challenge(
                ChallengeRecord(
                    challenge_id=challenge_id,
                    email=f"ttl-{uuid4().hex}@example.com",
                    kind=ChallengeKind.NEW_USER,
                    secret_hash="test-secret-hash",
                ),
                ttl_seconds=1,
            )

            assert await repository.get_challenge(challenge_id) is not None

            await asyncio.sleep(1.1)

            assert await repository.get_challenge(challenge_id) is None
        finally:
            await redis.delete(f"{CHALLENGE_KEY_PREFIX}:{challenge_id}")
            await redis.aclose()

    asyncio.run(scenario())


def test_resend_cooldown_uses_set_nx_and_expires() -> None:
    async def scenario() -> None:
        redis = Redis.from_url(settings.redis_url, decode_responses=True)
        repository = ChallengeRepository(redis)
        email = f"cooldown-{uuid4().hex}@example.com"
        cooldown_key = repository._resend_cooldown_key(email)

        try:
            assert await repository.acquire_resend_cooldown(email, 1) is True
            assert await repository.acquire_resend_cooldown(email, 1) is False
            assert await repository.get_resend_cooldown(email) in {0, 1}

            await asyncio.sleep(1.1)

            assert await repository.get_resend_cooldown(email) == 0
            assert await repository.acquire_resend_cooldown(email, 1) is True
        finally:
            await redis.delete(cooldown_key)
            await redis.aclose()

    asyncio.run(scenario())


def test_consume_lua_script_allows_only_one_parallel_winner() -> None:
    async def scenario() -> None:
        redis = Redis.from_url(settings.redis_url, decode_responses=True)
        challenge_id = uuid4()
        repository = ChallengeRepository(redis)

        try:
            await repository.save_challenge(
                ChallengeRecord(
                    challenge_id=challenge_id,
                    email=f"atomic-{uuid4().hex}@example.com",
                    kind=ChallengeKind.EXISTING_USER,
                    secret_hash="test-secret-hash",
                ),
                ttl_seconds=30,
            )

            results = await asyncio.gather(
                *(
                    repository.consume_challenge(challenge_id)
                    for _ in range(10)
                )
            )

            assert sum(result is not None for result in results) == 1
            assert await repository.get_challenge(challenge_id) is None
        finally:
            await redis.delete(f"{CHALLENGE_KEY_PREFIX}:{challenge_id}")
            await redis.aclose()

    asyncio.run(scenario())
