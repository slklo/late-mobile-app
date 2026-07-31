from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis

from auth.challenge_repository import ChallengeRepository
from auth.exceptions import (
    AuthenticationServiceUnavailableError,
    AuthenticationTokenError,
)
from auth.service import AuthService
from auth.token_service import decode_access_token
from users.dependencies import (
    UserRepositoryDep,
    UserServiceDep,
)
from users.schemas import UserRead

bearer_scheme = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]


def get_redis(request: Request) -> Redis:
    redis_client: Redis | None = getattr(
        request.app.state,
        "redis",
        None,
    )

    if redis_client is None:
        raise AuthenticationServiceUnavailableError()

    return redis_client


RedisDep = Annotated[Redis, Depends(get_redis)]


def get_auth_service(
    users: UserRepositoryDep,
    user_service: UserServiceDep,
    redis: RedisDep,
) -> AuthService:
    return AuthService(
        users=users,
        user_service=user_service,
        challenges=ChallengeRepository(redis),
    )


def get_current_user(
    users: UserRepositoryDep,
    credentials: BearerCredentials,
) -> UserRead:
    if credentials is None:
        raise AuthenticationTokenError()

    user_id = decode_access_token(credentials.credentials)

    if user_id is None:
        raise AuthenticationTokenError()

    user = users.get_by_id(user_id)

    if user is None or not user.is_active:
        raise AuthenticationTokenError()

    return UserRead.model_validate(user)
