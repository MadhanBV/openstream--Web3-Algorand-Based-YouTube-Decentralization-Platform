from decimal import Decimal
import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.reward import Reward
from app.models.user import User
from app.models.video import Video
from app.models.view import View


@pytest.fixture
def test_creator(db_session: Session) -> User:
    """Fixture providing a test creator."""
    creator = User(
        username="studio_creator",
        email="creator@openstream.io",
        wallet_address="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        is_creator=True,
    )
    db_session.add(creator)
    db_session.commit()
    db_session.refresh(creator)
    return creator


@pytest.fixture
def test_viewer(db_session: Session) -> User:
    """Fixture providing an authenticated viewer."""
    viewer = User(
        username="regular_viewer",
        email="viewer@openstream.io",
        is_creator=False,
    )
    db_session.add(viewer)
    db_session.commit()
    db_session.refresh(viewer)
    return viewer


@pytest.fixture
def test_video(db_session: Session, test_creator: User) -> Video:
    """Fixture providing a ready, public test video."""
    video = Video(
        creator_id=test_creator.id,
        title="Streaming Decentralization",
        ipfs_cid="QmTestVideoCid123456789",
        duration_seconds=120,
        status="ready",
        visibility="public",
        views_count=0,
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)
    return video


def test_start_watch_session_success(client: TestClient, test_video: Video):
    """Verify initializing a watch session returns session token and config."""
    res = client.post(
        "/api/v1/views/sessions/start",
        json={"video_id": test_video.id},
    )
    assert res.status_code == 201
    data = res.json()
    assert "session_id" in data
    assert len(data["session_id"]) >= 16
    assert data["video_id"] == test_video.id
    assert data["heartbeat_interval_seconds"] == 10
    assert data["min_watch_seconds"] == 30


def test_start_watch_session_nonexistent_video(client: TestClient):
    """Verify starting session on invalid video ID returns HTTP 404."""
    res = client.post(
        "/api/v1/views/sessions/start",
        json={"video_id": 999999},
    )
    assert res.status_code == 404


def test_start_watch_session_unready_video(client: TestClient, test_creator: User, db_session: Session):
    """Verify starting session on draft/unready video returns HTTP 400."""
    draft_video = Video(
        creator_id=test_creator.id,
        title="Draft Video",
        status="draft",
        visibility="public",
    )
    db_session.add(draft_video)
    db_session.commit()

    res = client.post(
        "/api/v1/views/sessions/start",
        json={"video_id": draft_video.id},
    )
    assert res.status_code == 400
    assert "not ready" in res.json()["detail"].lower()


def test_heartbeat_accrual_and_qualification(client: TestClient, test_video: Video, test_viewer: User, db_session: Session):
    """Verify incremental heartbeats accrue duration and qualify view upon reaching 30s threshold."""
    token = create_access_token(subject=test_viewer.id)

    # 1. Start session
    start_res = client.post(
        "/api/v1/views/sessions/start",
        json={"video_id": test_video.id},
        headers={"Authorization": f"Bearer {token}"},
    )
    session_id = start_res.json()["session_id"]

    # 2. Simulate 3 active heartbeats of 10 seconds each
    # Manually adjust last_heartbeat_at in test db to simulate elapsed time without real sleeping
    view_record = db_session.query(View).filter(View.session_id == session_id).first()
    assert view_record is not None

    # First heartbeat: 10s watched
    from datetime import datetime, timedelta, timezone
    view_record.last_heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    db_session.commit()

    hb1 = client.post(
        "/api/v1/views/sessions/heartbeat",
        json={"session_id": session_id, "current_time_seconds": 10.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert hb1.status_code == 200
    assert hb1.json()["watch_duration_seconds"] == 10
    assert hb1.json()["is_qualified"] is False

    # Second heartbeat: +10s (total 20s)
    db_session.refresh(view_record)
    view_record.last_heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    db_session.commit()

    hb2 = client.post(
        "/api/v1/views/sessions/heartbeat",
        json={"session_id": session_id, "current_time_seconds": 20.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert hb2.json()["watch_duration_seconds"] == 20
    assert hb2.json()["is_qualified"] is False

    # Third heartbeat: +10s (total 30s) -> Qualifies!
    db_session.refresh(view_record)
    view_record.last_heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=10)
    db_session.commit()

    hb3 = client.post(
        "/api/v1/views/sessions/heartbeat",
        json={"session_id": session_id, "current_time_seconds": 30.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert hb3.json()["watch_duration_seconds"] == 30
    assert hb3.json()["is_qualified"] is True
    assert hb3.json()["status"] == "qualified"

    # Confirm video views_count was incremented in DB
    db_session.refresh(test_video)
    assert test_video.views_count == 1


def test_short_incomplete_session_not_qualified(client: TestClient, test_video: Video, db_session: Session):
    """Verify that watching less than the 30s threshold remains unqualified."""
    start_res = client.post(
        "/api/v1/views/sessions/start",
        json={"video_id": test_video.id},
    )
    session_id = start_res.json()["session_id"]

    view_record = db_session.query(View).filter(View.session_id == session_id).first()
    from datetime import datetime, timedelta, timezone
    view_record.last_heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=12)
    db_session.commit()

    hb = client.post(
        "/api/v1/views/sessions/heartbeat",
        json={"session_id": session_id, "current_time_seconds": 12.0},
    )
    assert hb.json()["watch_duration_seconds"] == 12
    assert hb.json()["is_qualified"] is False

    # Close session
    end_res = client.post(
        "/api/v1/views/sessions/end",
        json={"session_id": session_id, "completed": False},
    )
    assert end_res.status_code == 200

    db_session.refresh(view_record)
    assert view_record.is_qualified is False
    db_session.refresh(test_video)
    assert test_video.views_count == 0


def test_creator_self_view_ineligible_for_rewards(client: TestClient, test_video: Video, test_creator: User, db_session: Session):
    """Verify that a creator watching their own video is flagged as self_view and never qualifies for rewards."""
    token = create_access_token(subject=test_creator.id)

    start_res = client.post(
        "/api/v1/views/sessions/start",
        json={"video_id": test_video.id},
        headers={"Authorization": f"Bearer {token}"},
    )
    session_id = start_res.json()["session_id"]

    view_record = db_session.query(View).filter(View.session_id == session_id).first()
    from datetime import datetime, timedelta, timezone
    view_record.last_heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=35)
    db_session.commit()

    hb = client.post(
        "/api/v1/views/sessions/heartbeat",
        json={"session_id": session_id, "current_time_seconds": 35.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert hb.json()["status"] == "self_view"
    assert hb.json()["is_qualified"] is False

    db_session.refresh(view_record)
    assert view_record.is_qualified is False


def test_view_cooldown_duplicate_prevention(client: TestClient, test_video: Video, test_viewer: User, db_session: Session):
    """Verify that watching the same video twice within 1 hour does not generate duplicate qualified views."""
    token = create_access_token(subject=test_viewer.id)
    from datetime import datetime, timedelta, timezone

    # 1. First watch session qualifies (reaching 30s)
    s1 = client.post("/api/v1/views/sessions/start", json={"video_id": test_video.id}, headers={"Authorization": f"Bearer {token}"})
    sid1 = s1.json()["session_id"]
    v1 = db_session.query(View).filter(View.session_id == sid1).first()
    v1.watch_duration_seconds = 20
    v1.last_heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=12)
    db_session.commit()
    hb1 = client.post("/api/v1/views/sessions/heartbeat", json={"session_id": sid1, "current_time_seconds": 32.0}, headers={"Authorization": f"Bearer {token}"})
    assert hb1.json()["is_qualified"] is True
    assert hb1.json()["status"] == "qualified"

    # 2. Second watch session immediately after by same user
    s2 = client.post("/api/v1/views/sessions/start", json={"video_id": test_video.id}, headers={"Authorization": f"Bearer {token}"})
    sid2 = s2.json()["session_id"]
    v2 = db_session.query(View).filter(View.session_id == sid2).first()
    v2.watch_duration_seconds = 20
    v2.last_heartbeat_at = datetime.now(timezone.utc) - timedelta(seconds=12)
    db_session.commit()
    hb2 = client.post("/api/v1/views/sessions/heartbeat", json={"session_id": sid2, "current_time_seconds": 35.0}, headers={"Authorization": f"Bearer {token}"})
    assert hb2.json()["status"] == "cooldown"
    assert hb2.json()["is_qualified"] is False

    db_session.refresh(v2)
    assert v2.is_qualified is False



def test_calculate_rewards_idempotent(client: TestClient, test_video: Video, test_creator: User, db_session: Session):
    """Verify reward calculation batch creates rewards and guarantees strict idempotency on retry."""
    from datetime import datetime, timezone
    creator_token = create_access_token(subject=test_creator.id)

    # Create 3 qualified views on the video
    now = datetime.now(timezone.utc)
    v1 = View(video_id=test_video.id, is_qualified=True, watch_duration_seconds=45, is_valid=True, created_at=now)
    v2 = View(video_id=test_video.id, is_qualified=True, watch_duration_seconds=60, is_valid=True, created_at=now)
    v3 = View(video_id=test_video.id, is_qualified=True, watch_duration_seconds=90, is_valid=True, created_at=now)
    # Also 1 unqualified view
    v4 = View(video_id=test_video.id, is_qualified=False, watch_duration_seconds=10, is_valid=True, created_at=now)
    db_session.add_all([v1, v2, v3, v4])
    db_session.commit()

    # Execution 1: Should credit exactly 3 qualified views (3 * 0.05 = 0.150000 ALGO)
    calc1 = client.post(
        "/api/v1/rewards/calculate",
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert calc1.status_code == 200
    d1 = calc1.json()
    assert d1["rewards_created"] == 1
    assert d1["total_views_credited"] == 3
    assert Decimal(str(d1["total_amount"])) == Decimal("0.150000")

    # Execution 2 (Retry): Idempotency check -> 0 new rewards created!
    calc2 = client.post(
        "/api/v1/rewards/calculate",
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert calc2.status_code == 200
    d2 = calc2.json()
    assert d2["rewards_created"] == 0
    assert d2["total_views_credited"] == 0
    assert Decimal(str(d2["total_amount"])) == Decimal("0.000000")

    # Check database rewards table
    rewards = db_session.query(Reward).filter(Reward.creator_id == test_creator.id).all()
    assert len(rewards) == 1
    assert rewards[0].amount == Decimal("0.150000")
    assert rewards[0].views_credited == 3
    assert rewards[0].status == "pending"


def test_creator_reward_summary_endpoint(client: TestClient, test_video: Video, test_creator: User, db_session: Session):
    """Verify GET /api/v1/rewards/me returns accurate creator reward metrics."""
    creator_token = create_access_token(subject=test_creator.id)

    # Seed an accrued reward
    r = Reward(
        creator_id=test_creator.id,
        video_id=test_video.id,
        amount=Decimal("2.500000"),
        views_credited=50,
        status="pending",
    )
    db_session.add(r)
    db_session.commit()

    res = client.get(
        "/api/v1/rewards/me",
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["creator_id"] == test_creator.id
    assert Decimal(str(data["pending_rewards_algo"])) == Decimal("2.500000")
    assert Decimal(str(data["total_earned_algo"])) == Decimal("2.500000")
    assert len(data["rewards"]) >= 1


def test_video_view_stats_endpoint(client: TestClient, test_video: Video, db_session: Session):
    """Verify GET /api/v1/views/stats/{video_id} returns aggregate engagement figures."""
    v1 = View(video_id=test_video.id, is_qualified=True, watch_duration_seconds=50, is_valid=True)
    v2 = View(video_id=test_video.id, is_qualified=False, watch_duration_seconds=15, is_valid=True)
    db_session.add_all([v1, v2])
    db_session.commit()

    res = client.get(f"/api/v1/views/stats/{test_video.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["video_id"] == test_video.id
    assert data["total_views"] == 2
    assert data["qualified_views"] == 1
    assert data["total_watch_duration_seconds"] == 65
