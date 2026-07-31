from users.dependencies import get_user_repository, get_user_service
from users.repository import UserRepository
from users.service import UserService


def test_user_repository_receives_database_session() -> None:
    db = object()

    repository = get_user_repository(db)  # type: ignore[arg-type]

    assert isinstance(repository, UserRepository)
    assert repository.db is db


def test_user_service_receives_repository() -> None:
    repository = object()

    service = get_user_service(repository)  # type: ignore[arg-type]

    assert isinstance(service, UserService)
    assert service.repository is repository
