import pytest
from pydantic import ValidationError

from core.config import Settings


VALID_SETTINGS = {
    "database_url": "postgresql+psycopg://user:pass@db:5432/app",
    "redis_url": "redis://redis:6379/0",
    "jwt_secret": "jwt-secret-with-at-least-32-characters",
    "auth_challenge_secret": (
        "challenge-secret-with-at-least-32-characters"
    ),
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


# TODO: Re-enable when production JWT secret validation is implemented.
# def test_production_rejects_weak_jwt_secret() -> None:
#     with pytest.raises(ValidationError):
#         Settings(
#             **{
#                 **VALID_SETTINGS,
#                 "app_environment": "production",
#                 "jwt_secret": "too-short",
#             },
#             _env_file=None,
#         )


# TODO: Re-enable when production TLS configuration is represented in settings.
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
