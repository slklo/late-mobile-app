from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.orm import Session

from auth.challenge_repository import ChallengeRepository
from auth.exceptions import (
    AuthenticationServiceUnavailableError,
    AuthenticationTokenError,
)
from auth.service import AuthService
from auth.token_service import decode_access_token
from core.database import get_db
from users.repository import UserRepository
from users.schemas import UserRead
from users.service import UserService

bearer_scheme = HTTPBearer(auto_error=False)


def get_redis(request: Request) -> Redis:
    redis_client: Redis | None = getattr(
        request.app.state,
        "redis",
        None,
    )

    if redis_client is None:
        raise AuthenticationServiceUnavailableError()

    return redis_client


def get_auth_service(
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> AuthService:
    return AuthService(
        users=UserRepository(db),
        user_service=UserService(db),
        challenges=ChallengeRepository(redis),
    )


def get_user_service(
    db: Session = Depends(get_db),
) -> UserService:
    return UserService(db)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> UserRead:
    if credentials is None:
        raise AuthenticationTokenError()

    user_id = decode_access_token(credentials.credentials)

    if user_id is None:
        raise AuthenticationTokenError()

    user = UserRepository(db).get_by_id(user_id)

    if user is None or not user.is_active:
        raise AuthenticationTokenError()

    return UserRead.model_validate(user)
