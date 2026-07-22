from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from users.models import User
from users.repository import UserRepository
from users.schemas import UserCreate, UserProfileUpdate
from users.exceptions import EmailAlreadyRegisteredError, UserNotFoundError

class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = UserRepository(db)

    def create_user(self, data: UserCreate) -> User:
        email = data.email.lower().strip()

        existing_user = self.repository.get_by_email(email)

        if existing_user is not None:
            raise EmailAlreadyRegisteredError()

        user = User(
            email=email,
            full_name=data.full_name,
        )

        self.repository.add(user)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise EmailAlreadyRegisteredError() from exc

        self.db.refresh(user)

        return user

    def get_user_by_id(self, user_id: int) -> User:
        user = self.repository.get_by_id(user_id)

        if user is None:
            raise UserNotFoundError()

        return user

    def update_profile(self, user_id: int, data: UserProfileUpdate) -> User:
        user = self.get_user_by_id(user_id)

        user.full_name = data.full_name
        self.db.commit()
        self.db.refresh(user)

        return user
