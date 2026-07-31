import pytest

from users.repository import UserRepository


class FakeSession:
    def __init__(self, commit_error: Exception | None = None) -> None:
        self.commit_error = commit_error
        self.added: object | None = None
        self.commit_calls = 0
        self.rollback_calls = 0
        self.refreshed: object | None = None

    def add(self, value: object) -> None:
        self.added = value

    def commit(self) -> None:
        self.commit_calls += 1

        if self.commit_error is not None:
            raise self.commit_error

    def rollback(self) -> None:
        self.rollback_calls += 1

    def refresh(self, value: object) -> None:
        self.refreshed = value


def test_save_commits_and_refreshes_user() -> None:
    session = FakeSession()
    repository = UserRepository(session)  # type: ignore[arg-type]
    user = object()

    result = repository.save(user)  # type: ignore[arg-type]

    assert result is user
    assert session.added is user
    assert session.commit_calls == 1
    assert session.rollback_calls == 0
    assert session.refreshed is user


def test_save_rolls_back_when_commit_fails() -> None:
    error = RuntimeError("commit failed")
    session = FakeSession(commit_error=error)
    repository = UserRepository(session)  # type: ignore[arg-type]

    with pytest.raises(RuntimeError, match="commit failed"):
        repository.save(object())  # type: ignore[arg-type]

    assert session.rollback_calls == 1
    assert session.refreshed is None
