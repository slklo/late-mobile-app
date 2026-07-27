import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from core.exception_handlers import register_exception_handlers


def test_unhandled_exception_returns_generic_error_body() -> None:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/boom")
    def boom():
        raise RuntimeError("database-password=super-secret")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/boom")

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "Internal server error",
        }
    }
    assert "super-secret" not in response.text


def test_postgresql_outage_is_logged_without_leaking_details(
    caplog,
) -> None:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/db-outage")
    def db_outage():
        raise OperationalError(
            "SELECT 1",
            {},
            Exception("could not connect to PostgreSQL"),
        )

    with caplog.at_level(logging.ERROR, logger="core.exception_handlers"):
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get("/db-outage")

    assert response.status_code == 500
    assert response.json()["error"]["message"] == "Internal server error"
    assert "Unhandled exception path=/db-outage" in caplog.text
    assert "could not connect to PostgreSQL" in caplog.text
    assert "could not connect to PostgreSQL" not in response.text
