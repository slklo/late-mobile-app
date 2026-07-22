from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from users.schemas import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
def get_current_user_profile(
    current_user: UserRead = Depends(get_current_user),
):
    return current_user
