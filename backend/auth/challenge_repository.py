from dataclasses import dataclass
from enum import Enum
from hashlib import sha256
from typing import Mapping
from uuid import UUID

from redis.asyncio import Redis
from redis.exceptions import RedisError

from auth.redis_scripts.loader import load_lua_script
from auth.exceptions import AuthenticationServiceUnavailableError

CHALLENGE_KEY_PREFIX = "lateplate:auth:v1:challenge"
RESEND_COOLDOWN_KEY_PREFIX = "lateplate:auth:v1:resend"

INCREMENT_ATTEMPTS_SCRIPT = load_lua_script("increment_attempts.lua")
CONSUME_CHALLENGE_SCRIPT = load_lua_script("consume_challenge.lua")

class ChallengeKind(str, Enum):
    NEW_USER = "new_user"
    EXISTING_USER = "existing_user"

@dataclass(frozen=True, slots=True)
class ChallengeRecord:
    challenge_id: UUID
    email: str
    kind: ChallengeKind
    secret_hash: str
    attempts: int = 0

class ChallengeRepository:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def save_challenge(
        self,
        challenge: ChallengeRecord,
        ttl_seconds: int,
    ) -> None:
        self._validate_ttl(ttl_seconds)

        key = self._challenge_key(challenge.challenge_id)

        mapping = {
            "email": challenge.email,
            "kind": challenge.kind.value,
            "secret_hash": challenge.secret_hash,
            "attempts": str(challenge.attempts),
        }

        try:
            async with self.redis.pipeline(transaction=True) as pipeline:
                pipeline.hset(key, mapping=mapping)
                pipeline.expire(key, ttl_seconds)

                results = await pipeline.execute()
            
            expire_was_set = bool(results[-1])

            if not expire_was_set:
                raise AuthenticationServiceUnavailableError()
            
        except RedisError as exc:
            raise AuthenticationServiceUnavailableError() from exc
        
    async def get_challenge(
        self,
        challenge_id: UUID,
    ) -> ChallengeRecord | None:
        key = self._challenge_key(challenge_id)

        try: 
            values = await self.redis.hgetall(key)
        except RedisError as exc:
            raise AuthenticationServiceUnavailableError() from exc
        
        if not values: 
            return None
        
        return self._deserialize_challenge(
            challenge_id=challenge_id,
            values=values,
        )
    
    async def increment_failed_attempts(
        self,
        challenge_id: UUID,
    ) -> int | None:
        key = self._challenge_key(challenge_id)

        try: 
            result = await self.redis.eval(
                INCREMENT_ATTEMPTS_SCRIPT,
                1,
                key,
            )
        except RedisError as exc:
            raise AuthenticationServiceUnavailableError() from exc
        
        attempts = int(result)

        if attempts == -1:
            return None
        
        return attempts
    

    async def acquire_resend_cooldown(
        self,
        normalized_email: str,
        ttl_seconds: int,
    ) -> bool:
        self._validate_ttl(ttl_seconds)

        key = self._resend_cooldown_key(normalized_email)

        try:
            result = await self.redis.set(
                key,
                "1",
                ex=ttl_seconds,
                nx=True,
            )
        except RedisError as exc:
            raise AuthenticationServiceUnavailableError() from exc
        
        return bool(result)
    
    async def get_resend_cooldown(
        self,
        normalized_email: str,
    ) -> int: 
        key = self._resend_cooldown_key(normalized_email)

        try: 
            ttl = await self.redis.ttl(key)
        except RedisError as exc:
            raise AuthenticationServiceUnavailableError() from exc
        
        if ttl == -2: 
            return 0
        
        if ttl == -1:
            raise AuthenticationServiceUnavailableError()
        
        return ttl
    
    async def consume_challenge(
        self,
        challenge_id: UUID,
    ) -> ChallengeRecord | None:
        key = self._challenge_key(challenge_id)

        try: 
            values = await self.redis.eval(
                CONSUME_CHALLENGE_SCRIPT,
                1,
                key,
            )
        except RedisError as exc:
            raise AuthenticationServiceUnavailableError() from exc
        
        if not values:
            return None
        
        mapping = dict(zip(values[::2], values[1::2], strict=True))

        return self._deserialize_challenge(
            challenge_id=challenge_id,
            values=mapping,
        )
    
    @staticmethod
    def _challenge_key(challenge_id: UUID) -> str:
        return f"{CHALLENGE_KEY_PREFIX}:{challenge_id}"
    
    @staticmethod
    def _resend_cooldown_key(normalized_email: str) -> str:
        email_digest = sha256(
            normalized_email.encode("utf-8")
        ).hexdigest()

        return f"{RESEND_COOLDOWN_KEY_PREFIX}:{email_digest}"
    
    @staticmethod
    def _validate_ttl(ttl_seconds: int) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be greater than zero")
        
    @staticmethod
    def _deserialize_challenge(
        challenge_id: UUID,
        values: Mapping[str, str],
    ) -> ChallengeRecord:
        try:
            return ChallengeRecord(
                challenge_id=challenge_id,
                email=values["email"],
                kind=ChallengeKind(values["kind"]),
                secret_hash=values["secret_hash"],
                attempts=int(values["attempts"]),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise AuthenticationServiceUnavailableError() from exc
