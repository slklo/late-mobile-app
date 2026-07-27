from fastapi.testclient import TestClient

from main import app


EXPECTED_OPENAPI_PATHS = {
    "/api/offers/",
    "/api/offers/{offer_id}",
    "/api/auth/email/request",
    "/api/auth/email/verify-code",
    "/api/auth/email/consume-link",
    "/api/auth/me/profile",
    "/api/auth/me",
    "/auth/email/link",
    "/health",
}


def test_application_starts_with_valid_settings() -> None:
    assert app.title == "LatePlate API"


def test_all_public_paths_are_registered_in_openapi_schema() -> None:
    schema = app.openapi()

    assert EXPECTED_OPENAPI_PATHS.issubset(set(schema["paths"]))


def test_health_returns_200() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unknown_origin_does_not_receive_cors_allow_origin() -> None:
    with TestClient(app) as client:
        response = client.options(
            "/health",
            headers={
                "Origin": "https://unknown.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert "access-control-allow-origin" not in response.headers
