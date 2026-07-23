import logging

from fastapi import APIRouter, Depends, status

from auth.dependencies import get_auth_service, get_current_user
from auth.schemas import EmailAuthRequest, EmailChallengeResponse
from auth.service import AuthService, ChallengeDelivery
from core.config import settings
from users.schemas import UserRead

logger = logging.getLogger(__name__)

router = APIRouter()


def _log_development_challenge(delivery: ChallengeDelivery) -> None:
    if settings.app_environment != "development":
        return

    logger.warning(
        "Development auth challenge: challenge_id=%s kind=%s secret=%s",
        delivery.challenge_id,
        delivery.kind.value,
        delivery.secret,
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


@router.get("/me", response_model=UserRead)
def get_current_user_profile(
    current_user: UserRead = Depends(get_current_user),
):
    return current_user
