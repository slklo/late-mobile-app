from core.exception_handlers import AppError

class AuthenticationTokenError(AppError):
    code = "AUTHENTICATION_TOKEN_ERROR"
    message = "Invalid or expired authentication token"


class AuthenticationServiceUnavailableError(AppError):
    code = "AUTHENTICATION_SERVICE_UNAVAILABLE"
    message = "Authentication is temporarily unavailable"