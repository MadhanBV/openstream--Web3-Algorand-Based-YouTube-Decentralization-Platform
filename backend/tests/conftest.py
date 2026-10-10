from collections.abc import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Import models first to register them on Base.metadata
from app.models import User, Video, View, Like, Comment, Reward, Settlement  # noqa: F401
from app.db.base import Base
from app.db.session import get_db
from app.config import get_settings
from app.main import app


@pytest.fixture
def settings():
    """
    Provides access to the application settings.
    """
    return get_settings()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """
    Provides an isolated in-memory test database session for model and route tests.
    Enforces SQLite foreign key constraints to mirror PostgreSQL behavior.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Enable foreign key constraint checking in SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Override get_db in FastAPI app during tests
    app.dependency_overrides[get_db] = lambda: session

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    Provides a FastAPI TestClient instance wired to the isolated in-memory test database.
    """
    with TestClient(app) as test_client:
        yield test_client
