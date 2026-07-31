from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError

from users.exceptions import EmailAlreadyRegisteredError, UserNotFoundError
from users.models import User
from users.repository import UserRepository
from users.schemas import UserCreate, UserProfileUpdate


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def create_user(self, data: UserCreate) -> User:
        email = data.email.lower().strip()
        now = datetime.now(timezone.utc)

        existing_user = self.repository.get_by_email(email)

        if existing_user is not None:
            raise EmailAlreadyRegisteredError()

        user = User(
            email=email,
            full_name=data.full_name,
            email_verified_at=now,
            profile_completed_at=(
                now
                if data.full_name is not None
                and data.full_name.strip()
                else None
            ),
        )

        try:
            return self.repository.save(user)
        except IntegrityError as exc:
            raise EmailAlreadyRegisteredError() from exc

    def get_user_by_id(self, user_id: int) -> User:
        user = self.repository.get_by_id(user_id)

        if user is None:
            raise UserNotFoundError()

        return user

    def update_profile(self, user_id: int, data: UserProfileUpdate) -> User:
        user = self.get_user_by_id(user_id)

        user.full_name = data.full_name
        return self.repository.save(user)

    def complete_profile(self, user_id: int, full_name: str) -> User:
        user = self.get_user_by_id(user_id)
        user.full_name = full_name

        if user.profile_completed_at is None:
            user.profile_completed_at = datetime.now(timezone.utc)

        return self.repository.save(user)
