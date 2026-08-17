from auth.challenge_repository import ChallengeRepository
from auth.dependencies import (
    get_auth_service,
    get_challenge_repository,
    get_session_service,
)
from auth.session_service import SessionService
from auth.service import AuthService


def test_challenge_repository_receives_redis_client() -> None:
    redis = object()

    repository = get_challenge_repository(redis)  # type: ignore[arg-type]

    assert isinstance(repository, ChallengeRepository)
    assert repository.redis is redis


def test_auth_service_receives_prebuilt_dependencies() -> None:
    users = object()
    user_service = object()
    challenges = object()
    sessions = object()

    service = get_auth_service(
        users=users,  # type: ignore[arg-type]
        user_service=user_service,  # type: ignore[arg-type]
        challenges=challenges,  # type: ignore[arg-type]
        sessions=sessions,  # type: ignore[arg-type]
    )

    assert isinstance(service, AuthService)
    assert service.users is users
    assert service.user_service is user_service
    assert service.challenges is challenges
    assert service.sessions is sessions


def test_session_service_receives_prebuilt_dependencies() -> None:
    db = object()
    refresh_sessions = object()
    users = object()

    service = get_session_service(
        db=db,  # type: ignore[arg-type]
        refresh_sessions=refresh_sessions,  # type: ignore[arg-type]
        users=users,  # type: ignore[arg-type]
    )

    assert isinstance(service, SessionService)
    assert service.db is db
    assert service.refresh_sessions is refresh_sessions
    assert service.users is users
