from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from users.schemas import UserRead

from typing import Literal

from uuid import UUID
from enum import Enum

class AuthNextStep(str, Enum):
    COMPLETE_PROFILE = "complete_profile"
    EXPLORE = "explore"

class AuthRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

class EmailAuthRequest(AuthRequest):
    email: EmailStr

class EmailChallengeResponse(BaseModel):
    challenge_id: UUID
    message: str
    expires_in_seconds: int = Field(gt=0)
    resend_after_seconds: int = Field(ge=0)

class VerifyCodeRequest(AuthRequest):
    challenge_id: UUID
    code: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
    )

class ConsumeLinkRequest(AuthRequest):
    challenge_id: UUID
    token: str = Field(
        min_length=32,
        max_length=256,
        pattern=r"^[A-Za-z0-9_-]+$",
    )

class RefreshTokenRequest(AuthRequest):
    refresh_token: str = Field(
        min_length=32,
        max_length=512,
    )

class RefreshTokenResponse(BaseModel):
    access_token: str = Field(min_length=1)
    refresh_token: str = Field(
        min_length=32,
        max_length=512,
    )
    token_type: Literal["bearer"] = "bearer"
    access_expires_in_seconds: int = Field(gt=0)
    refresh_expires_in_seconds: int = Field(gt=0)

class LogoutRequest(AuthRequest):
    refresh_token: str = Field(
        min_length=32,
        max_length=512,
    )

class CompleteProfileRequest(AuthRequest):
    full_name: str = Field(
        min_length=1,
        max_length=150,
    )

    @field_validator("full_name", mode="before")
    @classmethod
    def _strip_full_name(cls, value: object) -> object:
        if not isinstance(value, str):
            return value

        return value.strip()

class AuthSessionResponse(RefreshTokenResponse):
    user: UserRead
    next_step: AuthNextStep
