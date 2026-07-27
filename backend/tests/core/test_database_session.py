import pytest

from core.database import get_db


class FakeSession:
    def __init__(self):
        self.closed = False

    def close(self) -> None:
        self.closed = True


def test_session_is_closed_when_dependency_exits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession()
    monkeypatch.setattr("core.database.SessionLocal", lambda: session)

    dependency = get_db()
    assert next(dependency) is session

    with pytest.raises(StopIteration):
        next(dependency)

    assert session.closed is True


def test_session_is_closed_when_endpoint_raises(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = FakeSession()
    monkeypatch.setattr("core.database.SessionLocal", lambda: session)

    dependency = get_db()
    assert next(dependency) is session

    with pytest.raises(RuntimeError):
        dependency.throw(RuntimeError("endpoint failed"))

    assert session.closed is True
