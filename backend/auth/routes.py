import logging
from typing import Annotated
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import RedirectResponse

from auth.dependencies import (
    get_auth_service,
    get_current_user,
    get_session_service,
)
from auth.schemas import (
    AuthSessionResponse,
    CompleteProfileRequest,
    ConsumeLinkRequest,
    EmailAuthRequest,
    EmailChallengeResponse,
    LogoutRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
    VerifyCodeRequest,
)
from auth.session_service import SessionService
from auth.service import AuthService, ChallengeDelivery
from core.config import settings
from users.dependencies import get_user_service
from users.schemas import UserRead
from users.service import UserService

logger = logging.getLogger(__name__)

router = APIRouter()
link_router = APIRouter(prefix="/auth", tags=["auth"])


def _log_development_challenge(delivery: ChallengeDelivery) -> None:
    if settings.app_environment != "development":
        return

    logger.warning(
        "Development auth challenge: challenge_id=%s kind=%s secret=%s",
        delivery.challenge_id,
        delivery.kind.value,
        delivery.secret,
    )


@link_router.get(
    "/email/link",
    response_class=RedirectResponse,
    status_code=status.HTTP_302_FOUND,
)
def open_email_link(
    challenge_id: UUID,
    token: Annotated[
        str,
        Query(
            min_length=32,
            max_length=256,
            pattern=r"^[A-Za-z0-9_-]+$",
        ),
    ],
) -> RedirectResponse:
    query = urlencode(
        {
            "challenge_id": str(challenge_id),
            "token": token,
        }
    )

    return RedirectResponse(
        url=f"{settings.auth_magic_link_app_url}?{query}",
        status_code=status.HTTP_302_FOUND,
        headers={
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
        },
    )


@router.post(
    "/email/request",
    response_model=EmailChallengeResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_email_challenge(
    payload: EmailAuthRequest,
    service: AuthService = Depends(get_auth_service),
) -> EmailChallengeResponse:
    result = await service.request_email_challenge(str(payload.email))

    _log_development_challenge(result.delivery)

    return result.response


@router.post(
    "/email/verify-code",
    response_model=AuthSessionResponse,
)
async def verify_email_code(
    payload: VerifyCodeRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    return await service.verify_email_code(
        challenge_id=payload.challenge_id,
        code=payload.code,
    )


@router.post(
    "/email/consume-link",
    response_model=AuthSessionResponse,
)
async def consume_email_link(
    payload: ConsumeLinkRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    return await service.consume_magic_link(
        challenge_id=payload.challenge_id,
        token=payload.token,
    )


@router.post(
    "/token/refresh",
    response_model=RefreshTokenResponse,
)
def refresh_access_token(
    payload: RefreshTokenRequest,
    service: SessionService = Depends(get_session_service),
) -> RefreshTokenResponse:
    tokens = service.refresh_session(
        payload.refresh_token,
        payload.idempotency_key,
    )

    return RefreshTokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        access_expires_in_seconds=tokens.access_expires_in_seconds,
        refresh_expires_in_seconds=tokens.refresh_expires_in_seconds,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def logout(
    payload: LogoutRequest,
    service: SessionService = Depends(get_session_service),
) -> Response:
    service.revoke_session(payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/me/profile",
    response_model=UserRead,
)
def complete_current_user_profile(
    payload: CompleteProfileRequest,
    service: UserService = Depends(get_user_service),
    current_user: UserRead = Depends(get_current_user),
) -> UserRead:
    user = service.complete_profile(
        user_id=current_user.id,
        full_name=payload.full_name,
    )
    return UserRead.model_validate(user)


@router.get("/me", response_model=UserRead)
def get_current_user_profile(
    current_user: UserRead = Depends(get_current_user),
):
    return current_user
