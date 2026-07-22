from core.exception_handlers import AppError


class EmailAlreadyRegisteredError(AppError):
    code = "EMAIL_ALREADY_REGISTERED"
    message = "Email is already registered"


class UserNotFoundError(AppError):
    code = "USER_NOT_FOUND"
    message = "User not found"
