import logging


MAGIC_LINK_PATH = "/auth/email/link"
REDACTED_MAGIC_LINK_PATH = f"{MAGIC_LINK_PATH}?[REDACTED]"


class RedactMagicLinkAccessLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        arguments = record.args

        if not isinstance(arguments, tuple) or len(arguments) < 3:
            return True

        full_path = arguments[2]

        if (
            isinstance(full_path, str)
            and full_path.startswith(f"{MAGIC_LINK_PATH}?")
        ):
            record.args = (
                *arguments[:2],
                REDACTED_MAGIC_LINK_PATH,
                *arguments[3:],
            )

        return True


def configure_access_log_filters() -> None:
    access_logger = logging.getLogger("uvicorn.access")

    if any(
        isinstance(existing, RedactMagicLinkAccessLogFilter)
        for existing in access_logger.filters
    ):
        return

    access_logger.addFilter(RedactMagicLinkAccessLogFilter())
