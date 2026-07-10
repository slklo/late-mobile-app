from sqlalchemy import select
from sqlalchemy.orm import Session

from users.models import User

class UserRepository: 
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        stmt = select(User).where(User.id == user_id)
        return self.db.scalars(stmt).first()
    
    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        return self.db.scalars(stmt).first()
    
    def add(self, user: User) -> User:
        self.db.add(user)
        return user