from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from users.repository import UserRepository
from users.service import UserService


DbSession = Annotated[Session, Depends(get_db)]


def get_user_repository(db: DbSession) -> UserRepository:
    return UserRepository(db)


UserRepositoryDep = Annotated[
    UserRepository,
    Depends(get_user_repository),
]


def get_user_service(repository: UserRepositoryDep) -> UserService:
    return UserService(repository)


UserServiceDep = Annotated[
    UserService,
    Depends(get_user_service),
]
