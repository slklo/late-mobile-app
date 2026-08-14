import logging
from collections.abc import Iterable

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    code = "APP_ERROR"
    message = "Application error"

    def __init__(self, message: str | None = None):
        self.message = message or self.message
        super().__init__(self.message)


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
            }
        },
    )


def _register_many(
    app: FastAPI,
    exceptions: Iterable[type[Exception]],
    status_code: int,
) -> None:
    async def handler(request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, AppError):
            return _error_response(status_code, exc.code, exc.message)

        return _error_response(
            status_code,
            exc.__class__.__name__.upper(),
            str(exc) or exc.__class__.__name__,
        )

    for exception_class in exceptions:
        app.add_exception_handler(exception_class, handler)


def register_exception_handlers(app: FastAPI) -> None:
    from offers.exceptions import OfferNotFoundError
    from auth.exceptions import (
        AuthenticationServiceUnavailableError,
        AuthenticationTokenError,
        EmailChallengeRateLimitedError,
        EmailVerificationAttemptsExceededError,
        InvalidEmailVerificationError,
        InvalidMagicLinkError,
    )
    from users.exceptions import (
        EmailAlreadyRegisteredError,
        UserNotFoundError,
    )

    _register_many(
        app,
        (
            OfferNotFoundError,
            UserNotFoundError,
        ),
        status.HTTP_404_NOT_FOUND,
    )

    _register_many(
        app,
        (EmailAlreadyRegisteredError,),
        status.HTTP_409_CONFLICT,
    )

    _register_many(
        app,
        (AuthenticationTokenError,),
        status.HTTP_401_UNAUTHORIZED,
    )

    _register_many(
        app,
        (
            AuthenticationServiceUnavailableError,
        ),
        status.HTTP_503_SERVICE_UNAVAILABLE
    )

    _register_many(
        app,
        (
            InvalidEmailVerificationError,
            InvalidMagicLinkError,
        ),
        status.HTTP_400_BAD_REQUEST,
    )

    _register_many(
        app,
        (
            EmailChallengeRateLimitedError,
            EmailVerificationAttemptsExceededError,
        ),
        status.HTTP_429_TOO_MANY_REQUESTS,
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception("Unhandled exception path=%s", request.url.path)
        return _error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "INTERNAL_SERVER_ERROR",
            "Internal server error",
        )
