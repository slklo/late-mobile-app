import pytest
from pydantic import ValidationError

from core.config import Settings
from auth.token_service import create_access_token, decode_access_token


VALID_SETTINGS = {
    "database_url": "postgresql+psycopg://user:pass@db:5432/app",
    "redis_url": "redis://redis:6379/0",
    "jwt_secret": (
        "ProductionJwtSigningKeyForLatePlate2026WithEnoughLength"
    ),
    "auth_challenge_secret": (
        "ProductionChallengeHmacKeyForLatePlate2026Strong"
    ),
}

DEVELOPMENT_SETTINGS = {
    **VALID_SETTINGS,
    "app_environment": "development",
    "jwt_secret": "development-jwt-key-with-at-least-32-chars",
    "auth_challenge_secret": "development-challenge-key-32-chars",
}


# def test_missing_required_settings_fail_with_clear_validation_error() -> None:
#     with pytest.raises(ValidationError) as exc_info:
#         Settings(_env_file=None)

#     error_locations = {
#         ".".join(str(part) for part in error["loc"])
#         for error in exc_info.value.errors()
#     }

#     assert {
#         "database_url",
#         "redis_url",
#         "jwt_secret",
#         "auth_challenge_secret",
#     }.issubset(error_locations)


def test_production_rejects_weak_challenge_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(
            **{
                **VALID_SETTINGS,
                "app_environment": "production",
                "auth_challenge_secret": "too-short",
            },
            _env_file=None,
        )


def test_production_accepts_strong_auth_secrets() -> None:
    settings = Settings(
        **{
            **VALID_SETTINGS,
            "app_environment": "production",
        },
        _env_file=None,
    )

    assert settings.jwt_secret.get_secret_value() == (
        VALID_SETTINGS["jwt_secret"]
    )
    assert settings.auth_challenge_secret.get_secret_value() == (
        VALID_SETTINGS["auth_challenge_secret"]
    )
    assert VALID_SETTINGS["jwt_secret"] not in repr(settings.jwt_secret)
    assert (
        VALID_SETTINGS["auth_challenge_secret"]
        not in repr(settings.auth_challenge_secret)
    )


@pytest.mark.parametrize(
    "jwt_secret",
    [
        "too-short",
        "secret",
        "jwt-secret",
        "change-me",
        "changeme",
        "dev-secret",
        "test-secret",
        "your-secret-here",
        "lateplate-secret",
        "change-me-change-me-change-me-change-me-change-me",
    ],
)
def test_production_rejects_weak_or_default_jwt_secret(
    jwt_secret: str,
) -> None:
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            **{
                **VALID_SETTINGS,
                "app_environment": "production",
                "jwt_secret": jwt_secret,
            },
            _env_file=None,
        )

    assert f"input_value='{jwt_secret}'" not in str(exc_info.value)


@pytest.mark.parametrize(
    "auth_challenge_secret",
    [
        "change-me-change-me-change-me-change-me",
        "changeme-changeme-changeme-changeme",
        "your-secret-here-your-secret-here",
        "dev-secret-dev-secret-dev-secret",
        "test-secret-test-secret-test-secret",
        "lateplate-secret-lateplate-secret",
    ],
)
def test_production_rejects_default_auth_challenge_secret(
    auth_challenge_secret: str,
) -> None:
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            **{
                **VALID_SETTINGS,
                "app_environment": "production",
                "auth_challenge_secret": auth_challenge_secret,
            },
            _env_file=None,
        )

    assert (
        f"input_value='{auth_challenge_secret}'"
        not in str(exc_info.value)
    )


def test_development_allows_simpler_jwt_secret() -> None:
    settings = Settings(
        **DEVELOPMENT_SETTINGS,
        _env_file=None,
    )

    assert settings.jwt_secret.get_secret_value() == (
        DEVELOPMENT_SETTINGS["jwt_secret"]
    )


def test_production_requires_absolute_lifetime_not_shorter_than_refresh() -> None:
    with pytest.raises(ValidationError):
        Settings(
            **{
                **VALID_SETTINGS,
                "app_environment": "production",
                "refresh_token_expire_days": 30,
                "refresh_session_absolute_lifetime_days": 29,
            },
            _env_file=None,
        )


def test_access_token_roundtrip_still_works_with_secret_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = Settings(
        **DEVELOPMENT_SETTINGS,
        _env_file=None,
    )
    monkeypatch.setattr("auth.token_service.settings", settings)

    token = create_access_token(42)

    assert decode_access_token(token) == 42


def test_refresh_rotation_settings_validate_bounds() -> None:
    settings = Settings(
        **{
            **VALID_SETTINGS,
            "refresh_rotation_grace_seconds": 0,
            "refresh_idempotency_key_min_length": 16,
            "refresh_idempotency_key_max_length": 128,
        },
        _env_file=None,
    )

    assert settings.refresh_rotation_grace_seconds == 0
    assert settings.refresh_idempotency_key_min_length == 16
    assert settings.refresh_idempotency_key_max_length == 128

    with pytest.raises(ValidationError):
        Settings(
            **{
                **VALID_SETTINGS,
                "refresh_rotation_grace_seconds": -1,
            },
            _env_file=None,
        )


def test_refresh_session_absolute_lifetime_settings_validate_bounds() -> None:
    settings = Settings(
        **{
            **VALID_SETTINGS,
            "refresh_session_absolute_lifetime_days": 90,
        },
        _env_file=None,
    )

    assert settings.refresh_session_absolute_lifetime_days == 90

    with pytest.raises(ValidationError):
        Settings(
            **{
                **VALID_SETTINGS,
                "refresh_session_absolute_lifetime_days": 0,
            },
            _env_file=None,
        )

    with pytest.raises(ValidationError):
        Settings(
            **{
                **VALID_SETTINGS,
                "refresh_session_absolute_lifetime_days": -1,
            },
            _env_file=None,
        )


def test_refresh_idempotency_key_max_length_cannot_be_below_minimum() -> None:
    with pytest.raises(ValidationError):
        Settings(
            **{
                **VALID_SETTINGS,
                "refresh_idempotency_key_min_length": 32,
                "refresh_idempotency_key_max_length": 16,
            },
            _env_file=None,
        )


# TODO: Enable before production shipping when HTTPS / Universal Links /
# App Links are represented as a hard production contract.
# def test_production_runtime_requires_tls_configuration() -> None:
#     settings = Settings(
#         **{
#             **VALID_SETTINGS,
#             "app_environment": "production",
#             "auth_magic_link_app_url": "lateplate://auth/email/link",
#         },
#         _env_file=None,
#     )

#     assert settings.auth_magic_link_app_url.startswith("https://")
