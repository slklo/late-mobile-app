from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, func, or_, select, update
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

    def get_by_id_for_update(
        self,
        session_id: UUID,
    ) -> RefreshSession | None:
        stmt = (
            select(RefreshSession)
            .where(RefreshSession.id == session_id)
            .with_for_update()
        )
        return self.db.scalars(stmt).one_or_none()

    def get_by_token_hash(self, token_hash: str) -> RefreshSession | None:
        stmt = select(RefreshSession).where(
            RefreshSession.token_hash == token_hash,
        )
        return self.db.scalars(stmt).one_or_none()

    def get_by_token_hash_for_update(
        self,
        token_hash: str,
    ) -> RefreshSession | None:
        stmt = (
            select(RefreshSession)
            .where(RefreshSession.token_hash == token_hash)
            .with_for_update()
        )
        return self.db.scalars(stmt).one_or_none()

    def get_successor_for_update(
        self,
        replaced_by_id: UUID,
    ) -> RefreshSession | None:
        return self.get_by_id_for_update(replaced_by_id)

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

    def mark_rotated(
        self,
        session: RefreshSession,
        *,
        rotated_at: datetime,
        grace_expires_at: datetime,
        replaced_by_id: UUID,
        idempotency_key_hash: str,
    ) -> RefreshSession:
        session.rotated_at = rotated_at
        session.grace_expires_at = grace_expires_at
        session.replaced_by_id = replaced_by_id
        session.last_refresh_idempotency_key_hash = idempotency_key_hash
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

    def list_cleanup_candidate_ids(
        self,
        *,
        cutoff: datetime,
        limit: int,
    ) -> list[UUID]:
        if limit <= 0:
            return []

        stmt = (
            select(RefreshSession.id)
            .where(
                or_(
                    RefreshSession.revoked_at <= cutoff,
                    RefreshSession.expires_at <= cutoff,
                    RefreshSession.absolute_expires_at <= cutoff,
                ),
            )
            .order_by(
                RefreshSession.created_at.asc(),
                RefreshSession.id.asc(),
            )
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def clear_replaced_by_references(
        self,
        session_ids: list[UUID],
    ) -> int:
        if not session_ids:
            return 0

        stmt = (
            update(RefreshSession)
            .where(RefreshSession.replaced_by_id.in_(session_ids))
            .values(replaced_by_id=None)
            .execution_options(synchronize_session="fetch")
        )
        result = self.db.execute(stmt)
        return result.rowcount

    def delete_by_ids(self, session_ids: list[UUID]) -> int:
        if not session_ids:
            return 0

        stmt = (
            delete(RefreshSession)
            .where(RefreshSession.id.in_(session_ids))
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
