from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from sqlalchemy.sql import Select

from auth.models import RefreshSession


class RefreshSessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, session: RefreshSession) -> RefreshSession:
        self.db.add(session)
        return session

    def get_by_id(self, session_id: UUID) -> RefreshSession | None:
        stmt = select(RefreshSession).where(RefreshSession.id == session_id)
        return self.db.scalars(stmt).one_or_none()

    def get_by_token_hash(self, token_hash: str) -> RefreshSession | None:
        stmt = select(RefreshSession).where(
            RefreshSession.token_hash == token_hash,
        )
        return self.db.scalars(stmt).one_or_none()

    def get_active_by_token_hash(
        self,
        token_hash: str,
    ) -> RefreshSession | None:
        stmt = self._active_by_token_hash_statement(token_hash)
        return self.db.scalars(stmt).one_or_none()

    def get_active_by_token_hash_for_update(
        self,
        token_hash: str,
    ) -> RefreshSession | None:
        stmt = self._active_by_token_hash_statement(
            token_hash,
        ).with_for_update()
        return self.db.scalars(stmt).one_or_none()

    def revoke(
        self,
        session: RefreshSession,
        revoked_at: datetime,
    ) -> RefreshSession:
        session.revoked_at = revoked_at
        self.db.add(session)
        return session

    def revoke_family(
        self,
        family_id: UUID,
        revoked_at: datetime,
    ) -> int:
        stmt = (
            update(RefreshSession)
            .where(
                RefreshSession.family_id == family_id,
                RefreshSession.revoked_at.is_(None),
            )
            .values(revoked_at=revoked_at)
            .execution_options(synchronize_session="fetch")
        )
        result = self.db.execute(stmt)
        return result.rowcount

    def list_by_family_id(
        self,
        family_id: UUID,
    ) -> list[RefreshSession]:
        stmt = (
            select(RefreshSession)
            .where(RefreshSession.family_id == family_id)
            .order_by(
                RefreshSession.created_at.asc(),
                RefreshSession.id.asc(),
            )
        )
        return list(self.db.scalars(stmt).all())

    @staticmethod
    def _active_by_token_hash_statement(
        token_hash: str,
    ) -> Select[tuple[RefreshSession]]:
        return select(RefreshSession).where(
            RefreshSession.token_hash == token_hash,
            RefreshSession.revoked_at.is_(None),
            RefreshSession.expires_at > func.now(),
        )
