from auth.challenge_repository import ChallengeRepository
from auth.dependencies import (
    get_auth_service,
    get_challenge_repository,
)
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

    service = get_auth_service(
        users=users,  # type: ignore[arg-type]
        user_service=user_service,  # type: ignore[arg-type]
        challenges=challenges,  # type: ignore[arg-type]
    )

    assert isinstance(service, AuthService)
    assert service.users is users
    assert service.user_service is user_service
    assert service.challenges is challenges
