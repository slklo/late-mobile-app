from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.orm import Session

from auth.exceptions import (
    AuthenticationServiceUnavailableError,
    AuthenticationTokenError,
)
from core.database import get_db
from users.models import User
from users.repository import UserRepository
from users.security import decode_access_token

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


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise AuthenticationTokenError()

    user_id = decode_access_token(credentials.credentials)

    if user_id is None:
        raise AuthenticationTokenError()

    user = UserRepository(db).get_by_id(user_id)

    if user is None or not user.is_active:
        raise AuthenticationTokenError()

    return user