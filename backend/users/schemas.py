from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    is_active: bool
    created_at: datetime
    email_verified_at: datetime | None
    profile_completed_at: datetime | None


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=150)


class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=150)
