import logging

from core.logging_config import (
    REDACTED_MAGIC_LINK_PATH,
    RedactMagicLinkAccessLogFilter,
)


def make_access_record(path: str) -> logging.LogRecord:
    return logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg='%s - "%s %s HTTP/%s" %d',
        args=(
            "127.0.0.1:12345",
            "GET",
            path,
            "1.1",
            302,
        ),
        exc_info=None,
    )


def test_magic_link_query_is_redacted_from_access_log() -> None:
    token = "secret-magic-link-token"
    record = make_access_record(
        "/auth/email/link"
        f"?challenge_id=123&token={token}"
    )

    RedactMagicLinkAccessLogFilter().filter(record)

    assert REDACTED_MAGIC_LINK_PATH in record.getMessage()
    assert token not in record.getMessage()
    assert "challenge_id=123" not in record.getMessage()


def test_other_access_log_paths_are_unchanged() -> None:
    path = "/api/auth/email/consume-link"
    record = make_access_record(path)

    RedactMagicLinkAccessLogFilter().filter(record)

    assert path in record.getMessage()
