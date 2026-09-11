from fastapi.testclient import TestClient

from main import app


EXPECTED_OPENAPI_PATHS = {
    "/api/offers/",
    "/api/offers/{offer_id}",
    "/api/auth/email/request",
    "/api/auth/email/verify-code",
    "/api/auth/email/consume-link",
    "/api/auth/token/refresh",
    "/api/auth/logout",
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


def test_refresh_openapi_contract_requires_idempotency_key() -> None:
    schema = app.openapi()
    refresh_request = schema["components"]["schemas"]["RefreshTokenRequest"]
    refresh_operation = schema["paths"]["/api/auth/token/refresh"]["post"]

    assert refresh_operation["requestBody"]["required"] is True
    assert refresh_request["required"] == [
        "refresh_token",
        "idempotency_key",
    ]
    assert refresh_request["properties"]["refresh_token"] == {
        "type": "string",
        "maxLength": 512,
        "minLength": 32,
        "title": "Refresh Token",
    }
    assert refresh_request["properties"]["idempotency_key"] == {
        "type": "string",
        "maxLength": 128,
        "minLength": 16,
        "title": "Idempotency Key",
    }


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
