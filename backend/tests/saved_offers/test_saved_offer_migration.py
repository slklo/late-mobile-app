from importlib import import_module

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import inspect


migration = import_module(
    "migrations.versions.2f6a9c8b1d0e_create_saved_offers",
)


def create_referenced_tables(metadata: sa.MetaData) -> None:
    sa.Table(
        "users",
        metadata,
        sa.Column("id", sa.Integer(), primary_key=True),
    )
    sa.Table(
        "offers",
        metadata,
        sa.Column("id", sa.Integer(), primary_key=True),
    )


def test_saved_offers_migration_creates_contract() -> None:
    engine = sa.create_engine("sqlite+pysqlite:///:memory:")
    metadata = sa.MetaData()
    create_referenced_tables(metadata)
    metadata.create_all(engine)

    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        operations = Operations(context)
        original_op = migration.op
        migration.op = operations

        try:
            migration.upgrade()
        finally:
            migration.op = original_op

        inspector = inspect(connection)
        columns = {
            column["name"]: column
            for column in inspector.get_columns("saved_offers")
        }
        indexes = {
            index["name"]
            for index in inspector.get_indexes("saved_offers")
        }
        unique_constraints = {
            constraint["name"]: constraint
            for constraint in inspector.get_unique_constraints(
                "saved_offers",
            )
        }
        foreign_keys = {
            tuple(foreign_key["constrained_columns"]): foreign_key
            for foreign_key in inspector.get_foreign_keys("saved_offers")
        }

    assert set(columns) == {"id", "user_id", "offer_id", "created_at"}
    assert columns["user_id"]["nullable"] is False
    assert columns["offer_id"]["nullable"] is False
    assert columns["created_at"]["nullable"] is False
    assert "ix_saved_offers_user_id" in indexes
    assert "ix_saved_offers_offer_id" in indexes
    assert "uq_saved_offers_user_id_offer_id" in unique_constraints
    assert foreign_keys[("user_id",)]["referred_table"] == "users"
    assert foreign_keys[("offer_id",)]["referred_table"] == "offers"

    engine.dispose()


def test_saved_offers_migration_downgrade_removes_table() -> None:
    engine = sa.create_engine("sqlite+pysqlite:///:memory:")
    metadata = sa.MetaData()
    create_referenced_tables(metadata)
    metadata.create_all(engine)

    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        operations = Operations(context)
        original_op = migration.op
        migration.op = operations

        try:
            migration.upgrade()
            migration.downgrade()
        finally:
            migration.op = original_op

        tables = inspect(connection).get_table_names()

    assert "saved_offers" not in tables

    engine.dispose()
