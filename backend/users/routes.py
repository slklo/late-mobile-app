from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core.database import get_db
from users.models import User
from users.schemas import AuthTokenResponse, UserLoginRequest, UserRead, UserRegisterRequest
from users.security import create_access_token
from users.service import UserService

from auth.dependencies import get_current_user


router = APIRouter()

@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    data: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    service = UserService(db)
    user = service.register_user(data)
    
    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,  
    }

@router.post(
    "/login",
    response_model=AuthTokenResponse,
)
def login_user(
    data: UserLoginRequest,
    db: Session = Depends(get_db),
):
    service = UserService(db)
    user = service.authenticate_user(data)
    
    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserRead)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user