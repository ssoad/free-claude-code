"""Database configuration and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config.paths import config_dir_path

# Ensure the config directory exists
db_dir = config_dir_path()
db_dir.mkdir(parents=True, exist_ok=True)

db_path = db_dir / "users.db"
DATABASE_URL = f"sqlite:///{db_path}"

# Connect args needed for SQLite to allow multiple threads
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}, echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
