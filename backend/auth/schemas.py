from pydantic import BaseModel, ConfigDict, Field, EmailStr
from users.schemas import UserRead

from typing import Literal

from uuid import UUID
from enum import Enum

class AuthNextStep(str, Enum):
    COMPLETE_PROFILE = "complete_profile"
    EXPLORE = "explore"

class AuthRequrest(BaseModel):
    model_config = ConfigDict(extra="forbid")

class EmailAuthRequest(AuthRequrest):
    email: EmailStr

class EmailChallangeResponse(BaseModel):
    challange_id: UUID
    message: str
    expires_in_seconds: int = Field(gt=0)
    resend_after_seconds: int = Field(ge=0)

class VerifyCodeRequest(AuthRequrest):
    challange_id: UUID
    code: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
    )

class ConsumeLinkRequest(AuthRequrest):
    challange_id: UUID
    token: str = Field(
        min_length=32,
        max_length=256,
        pattern=r"^[A-Za-z0-9_-]+$",
    )

class AuthSessionResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserRead
    next_step: AuthNextStep
    