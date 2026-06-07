from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine

from app import models  # noqa: F401
from app.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)

_USER_COLUMNS = {
    "cedula": "VARCHAR",
    "phone": "VARCHAR",
    "photo_url": "VARCHAR",
    "created_at": "DATETIME",
}

_NOTIFICATION_COLUMNS = {
    "kind": "VARCHAR",
    "title": "VARCHAR",
    "task_id": "INTEGER",
}


def _sqlite_column_names(conn, table: str) -> set[str]:
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def migrate_db() -> None:
    SQLModel.metadata.create_all(engine)
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    with engine.connect() as conn:
        existing = _sqlite_column_names(conn, "user")
        for column, sql_type in _USER_COLUMNS.items():
            if column not in existing:
                conn.execute(text(f'ALTER TABLE "user" ADD COLUMN {column} {sql_type}'))

        notification_cols = _sqlite_column_names(conn, "notification")
        for column, sql_type in _NOTIFICATION_COLUMNS.items():
            if column not in notification_cols:
                conn.execute(text(f'ALTER TABLE notification ADD COLUMN {column} {sql_type}'))

        conn.commit()


def create_db_and_tables():
    migrate_db()

def get_session():
    with Session(engine) as session:
        yield session