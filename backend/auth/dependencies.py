from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis

from auth.challenge_repository import ChallengeRepository
from auth.exceptions import (
    AuthenticationServiceUnavailableError,
    AuthenticationTokenError,
)
from auth.session_repository import RefreshSessionRepository
from auth.session_service import SessionService
from auth.service import AuthService
from auth.token_service import decode_access_token
from users.dependencies import (
    DbSession,
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


def get_challenge_repository(redis: RedisDep) -> ChallengeRepository:
    return ChallengeRepository(redis)


ChallengeRepositoryDep = Annotated[
    ChallengeRepository,
    Depends(get_challenge_repository),
]


def get_refresh_session_repository(
    db: DbSession,
) -> RefreshSessionRepository:
    return RefreshSessionRepository(db)


RefreshSessionRepositoryDep = Annotated[
    RefreshSessionRepository,
    Depends(get_refresh_session_repository),
]


def get_session_service(
    db: DbSession,
    refresh_sessions: RefreshSessionRepositoryDep,
    users: UserRepositoryDep,
) -> SessionService:
    return SessionService(
        db=db,
        refresh_sessions=refresh_sessions,
        users=users,
    )


SessionServiceDep = Annotated[
    SessionService,
    Depends(get_session_service),
]


def get_auth_service(
    users: UserRepositoryDep,
    user_service: UserServiceDep,
    challenges: ChallengeRepositoryDep,
) -> AuthService:
    return AuthService(
        users=users,
        user_service=user_service,
        challenges=challenges,
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
