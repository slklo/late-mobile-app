from fastapi import APIRouter, Depends, Response, status

from auth.dependencies import get_current_user
from saved_offers.dependencies import get_saved_offer_service
from saved_offers.schemas import SavedOfferRead
from saved_offers.service import SavedOfferService
from users.schemas import UserRead


router = APIRouter()


@router.get("/", response_model=list[SavedOfferRead])
def list_saved_offers(
    service: SavedOfferService = Depends(get_saved_offer_service),
    current_user: UserRead = Depends(get_current_user),
) -> list[SavedOfferRead]:
    return service.list_saved_offers(current_user.id)


@router.post("/{offer_id}/", response_model=SavedOfferRead)
def save_offer(
    offer_id: int,
    service: SavedOfferService = Depends(get_saved_offer_service),
    current_user: UserRead = Depends(get_current_user),
):
    return service.save_offer(
        user_id=current_user.id,
        offer_id=offer_id,
    )


@router.delete(
    "/{offer_id}/",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
def remove_saved_offer(
    offer_id: int,
    service: SavedOfferService = Depends(get_saved_offer_service),
    current_user: UserRead = Depends(get_current_user),
) -> Response:
    service.remove_saved_offer(
        user_id=current_user.id,
        offer_id=offer_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
