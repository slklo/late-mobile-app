from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError

from users.exceptions import EmailAlreadyRegisteredError, UserNotFoundError
from users.models import User
from users.schemas import UserCreate, UserProfileUpdate
from users.service import UserService


class StubUserRepository:
    def __init__(
        self,
        *,
        user: User | None = None,
        save_error: Exception | None = None,
    ) -> None:
        self.user = user
        self.save_error = save_error
        self.requested_email: str | None = None
        self.requested_user_id: int | None = None
        self.saved_user: User | None = None

    def get_by_email(self, email: str) -> User | None:
        self.requested_email = email
        return self.user

    def get_by_id(self, user_id: int) -> User | None:
        self.requested_user_id = user_id
        return self.user

    def save(self, user: User) -> User:
        self.saved_user = user

        if self.save_error is not None:
            raise self.save_error

        self.user = user
        return user


def create_service(repository: StubUserRepository) -> UserService:
    return UserService(repository)  # type: ignore[arg-type]


def make_user(*, full_name: str | None = None) -> User:
    return User(
        id=1,
        email="user@example.com",
        full_name=full_name,
        email_verified_at=None,
        profile_completed_at=None,
    )


def test_create_user_normalizes_email_and_saves_user() -> None:
    repository = StubUserRepository()
    service = create_service(repository)

    user = service.create_user(
        UserCreate(email="User@Example.com", full_name=None),
    )

    assert repository.requested_email == "user@example.com"
    assert repository.saved_user is user
    assert user.email == "user@example.com"
    assert user.email_verified_at is not None
    assert user.profile_completed_at is None


def test_create_user_rejects_existing_email() -> None:
    repository = StubUserRepository(user=make_user())
    service = create_service(repository)

    with pytest.raises(EmailAlreadyRegisteredError):
        service.create_user(UserCreate(email="user@example.com"))

    assert repository.saved_user is None


def test_create_user_translates_unique_constraint_conflict() -> None:
    error = IntegrityError("statement", {}, RuntimeError("duplicate"))
    repository = StubUserRepository(save_error=error)
    service = create_service(repository)

    with pytest.raises(EmailAlreadyRegisteredError):
        service.create_user(UserCreate(email="user@example.com"))


def test_get_user_by_id_rejects_missing_user() -> None:
    repository = StubUserRepository()
    service = create_service(repository)

    with pytest.raises(UserNotFoundError):
        service.get_user_by_id(42)

    assert repository.requested_user_id == 42


def test_update_profile_saves_changed_user() -> None:
    user = make_user()
    repository = StubUserRepository(user=user)
    service = create_service(repository)

    result = service.update_profile(
        user_id=1,
        data=UserProfileUpdate(full_name="New Name"),
    )

    assert result is user
    assert user.full_name == "New Name"
    assert repository.saved_user is user


def test_complete_profile_sets_completion_time_only_once() -> None:
    user = make_user()
    repository = StubUserRepository(user=user)
    service = create_service(repository)

    result = service.complete_profile(1, "New Name")
    completed_at = result.profile_completed_at
    service.complete_profile(1, "Changed Name")

    assert isinstance(completed_at, datetime)
    assert result.profile_completed_at == completed_at
    assert result.full_name == "Changed Name"
