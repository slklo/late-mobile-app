from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from users.models import User
from users.repository import UserRepository
from users.schemas import UserLoginRequest, UserRegisterRequest
from users.security import hash_password, verify_password
from users.exceptions import EmailAlreadyRegisteredError, InvalidCredentialsError

class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = UserRepository(db)

    def register_user(self, data: UserRegisterRequest) -> User:
        email = data.email.lower().strip()

        existing_user = self.repository.get_by_email(email)

        if existing_user is not None:
            raise EmailAlreadyRegisteredError()

        user = User(
            email=email,
            password_hash=hash_password(data.password),
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
    
    def authenticate_user(self, data: UserLoginRequest) -> User:
        email = data.email.lower().strip()

        user = self.repository.get_by_email(email)

        if user is None:
            raise InvalidCredentialsError()
        
        if not verify_password(data.password, user.password_hash):
            raise InvalidCredentialsError()
        
        if not user.is_active:
            raise InvalidCredentialsError()
        
        return user
    
    
