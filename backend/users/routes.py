from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from core.database import get_db
from users.exceptions import AuthenticationTokenError
from users.repository import UserRepository
from users.schemas import AuthTokenResponse, UserLoginRequest, UserRead, UserRegisterRequest
from users.security import create_access_token, decode_access_token
from users.service import UserService

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)

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
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise AuthenticationTokenError()

    token = credentials.credentials
    user_id = decode_access_token(token)

    if user_id is None:
        raise AuthenticationTokenError()
    
    user = UserRepository(db).get_by_id(user_id)

    if user is None or not user.is_active:
        raise AuthenticationTokenError("User not found or inactive")
    
    return user
