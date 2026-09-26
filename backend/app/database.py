"""SQLAlchemy engine/session setup. Works with both SQLite and PostgreSQL."""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine = create_engine(
    settings.DATABASE_URL,
    # SQLite + FastAPI's threadpool needs this flag; ignored by Postgres.
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_pre_ping=True,  # avoids stale connections after Render cold starts
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
