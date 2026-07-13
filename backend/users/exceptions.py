from core.exception_handlers import AppError


class EmailAlreadyRegisteredError(AppError):
    code = "EMAIL_ALREADY_REGISTERED"
    message = "Email is already registered"


class InvalidCredentialsError(AppError):
    code = "INVALID_CREDENTIALS"
    message = "Invalid email or password"


class AuthenticationTokenError(AppError):
    code = "AUTHENTICATION_TOKEN_ERROR"
    message = "Invalid or expired token"


class UserNotFoundError(AppError):
    code = "USER_NOT_FOUND"
    message = "User not found"
