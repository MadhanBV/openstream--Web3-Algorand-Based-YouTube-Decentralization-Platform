import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.video import Video
from app.models.view import View


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Creates and returns a primary test creator user."""
    user = User(
        username="studio_creator_alice",
        email="studio_alice@openstream.io",
        hashed_password=hash_password("Password123!"),
        display_name="Alice Creator",
        is_creator=True,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    """Provides Authorization headers for the test creator."""
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}


def test_get_creator_analytics_unauthorized(client: TestClient):
    """Analytics requires authentication."""
    response = client.get("/api/v1/creator/analytics")
    assert response.status_code == 401


def test_get_creator_analytics_empty(client: TestClient, test_user: User, auth_headers: dict[str, str]):
    """Analytics for a creator with no videos returns zeroed metrics."""
    response = client.get("/api/v1/creator/analytics", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_views"] == 0
    assert data["total_qualified_views"] == 0
    assert data["total_watch_hours"] == 0.0
    assert data["total_videos"] == 0
    assert "revenue_breakdown" in data
    assert "wallet_status" in data
    assert len(data["daily_trends"]) == 30


def test_get_creator_analytics_with_data(
    client: TestClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: Session,
):
    """Analytics accurately aggregates video views, watch time, and rewards."""
    # Create video
    video = Video(
        creator_id=test_user.id,
        title="Creator Studio Test Video",
        ipfs_cid="QmTestCid123",
        duration_seconds=120,
        status="ready",
        visibility="public",
        views_count=2,
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)

    # Add 2 views: one qualified (45s), one unqualified (15s)
    v1 = View(
        video_id=video.id,
        watch_duration_seconds=45,
        is_qualified=True,
        is_valid=True,
    )
    v2 = View(
        video_id=video.id,
        watch_duration_seconds=15,
        is_qualified=False,
        is_valid=True,
    )
    db_session.add_all([v1, v2])
    db_session.commit()

    response = client.get("/api/v1/creator/analytics?days=7", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_views"] == 2
    assert data["total_qualified_views"] == 1
    assert data["total_watch_seconds"] == 60
    assert data["total_videos"] == 1
    assert len(data["top_videos"]) >= 1
    assert data["top_videos"][0]["id"] == video.id
    assert len(data["daily_trends"]) == 7


def test_get_creator_videos(
    client: TestClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: Session,
):
    """GET /api/v1/creator/videos returns all owned videos including unlisted."""
    v_pub = Video(
        creator_id=test_user.id,
        title="Public Video",
        status="ready",
        visibility="public",
    )
    v_unlisted = Video(
        creator_id=test_user.id,
        title="Unlisted Video",
        status="ready",
        visibility="unlisted",
    )
    db_session.add_all([v_pub, v_unlisted])
    db_session.commit()

    response = client.get("/api/v1/creator/videos", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    titles = [v["title"] for v in data]
    assert "Public Video" in titles
    assert "Unlisted Video" in titles


def test_request_settlement_no_wallet(
    client: TestClient,
    test_user: User,
    auth_headers: dict[str, str],
    db_session: Session,
):
    """Requesting settlement without connected wallet fails with 400."""
    test_user.wallet_address = None
    db_session.commit()

    response = client.post("/api/v1/creator/request-settlement", headers=auth_headers)
    assert response.status_code == 400
    assert "No Algorand wallet address" in response.json()["detail"]
