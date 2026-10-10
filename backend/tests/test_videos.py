import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.video import Video


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Creates and returns a primary test creator user."""
    user = User(
        username="creator_alice",
        email="alice@openstream.io",
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
def other_user(db_session: Session) -> User:
    """Creates and returns a second test user."""
    user = User(
        username="viewer_bob",
        email="bob@openstream.io",
        hashed_password=hash_password("Password123!"),
        display_name="Bob Viewer",
        is_creator=False,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    """Provides Authorization headers for the primary test user."""
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_auth_headers(other_user: User) -> dict[str, str]:
    """Provides Authorization headers for the second test user."""
    token = create_access_token(subject=other_user.id)
    return {"Authorization": f"Bearer {token}"}


class TestVideoCreation:
    """Tests for POST /api/v1/videos."""

    def test_create_video_authenticated_success(
        self, client: TestClient, test_user: User, auth_headers: dict[str, str]
    ):
        """Authenticated creators can successfully create a video draft."""
        payload = {
            "title": "Decentralized Video Streaming 101",
            "description": "An introduction to IPFS and Algorand.",
            "duration_seconds": 320,
            "visibility": "public",
        }
        response = client.post("/api/v1/videos", json=payload, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["description"] == payload["description"]
        assert data["duration_seconds"] == payload["duration_seconds"]
        assert data["visibility"] == "public"
        assert data["status"] == "draft"  # Enforces safe initial draft status
        assert data["creator_id"] == test_user.id  # Derived from token
        assert data["views_count"] == 0
        assert data["likes_count"] == 0
        assert data["ipfs_cid"] is None
        assert data["creator"]["username"] == test_user.username

    def test_create_video_unauthenticated_rejected(self, client: TestClient):
        """Unauthenticated requests are rejected with 401."""
        payload = {
            "title": "Unauthorized Video",
        }
        response = client.post("/api/v1/videos", json=payload)
        assert response.status_code == 401

    def test_create_video_invalid_metadata_rejected(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        """Invalid inputs (empty title, negative duration, invalid visibility) are rejected with 422."""
        # Empty / whitespace title
        res1 = client.post(
            "/api/v1/videos",
            json={"title": "   "},
            headers=auth_headers,
        )
        assert res1.status_code == 422

        # Negative duration
        res2 = client.post(
            "/api/v1/videos",
            json={"title": "Valid Title", "duration_seconds": -5},
            headers=auth_headers,
        )
        assert res2.status_code == 422

        # Invalid visibility enum
        res3 = client.post(
            "/api/v1/videos",
            json={"title": "Valid Title", "visibility": "hidden_secret"},
            headers=auth_headers,
        )
        assert res3.status_code == 422


class TestVideoListingAndRetrieval:
    """Tests for GET /api/v1/videos and GET /api/v1/videos/{video_id}."""

    def test_public_listing_excludes_drafts_and_private(
        self, client: TestClient, db_session: Session, test_user: User
    ):
        """Public list only returns videos with status='ready' and visibility='public'."""
        # 1. Public + Ready (should appear)
        v1 = Video(
            creator_id=test_user.id,
            title="Public Ready Video",
            visibility="public",
            status="ready",
            ipfs_cid="QmPublicReady111",
        )
        # 2. Public + Draft (should NOT appear)
        v2 = Video(
            creator_id=test_user.id,
            title="Public Draft Video",
            visibility="public",
            status="draft",
        )
        # 3. Public + Processing (should NOT appear)
        v3 = Video(
            creator_id=test_user.id,
            title="Public Processing Video",
            visibility="public",
            status="processing",
        )
        # 4. Private + Ready (should NOT appear)
        v4 = Video(
            creator_id=test_user.id,
            title="Private Ready Video",
            visibility="private",
            status="ready",
            ipfs_cid="QmPrivateReady222",
        )
        # 5. Unlisted + Ready (should NOT appear in public catalog)
        v5 = Video(
            creator_id=test_user.id,
            title="Unlisted Ready Video",
            visibility="unlisted",
            status="ready",
            ipfs_cid="QmUnlistedReady333",
        )

        db_session.add_all([v1, v2, v3, v4, v5])
        db_session.commit()

        response = client.get("/api/v1/videos")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Public Ready Video"

    def test_get_video_by_id_public_and_unlisted(
        self, client: TestClient, db_session: Session, test_user: User
    ):
        """Public and unlisted ready videos are accessible unauthenticated."""
        pub_video = Video(
            creator_id=test_user.id,
            title="Public Clip",
            visibility="public",
            status="ready",
            ipfs_cid="QmClip1",
        )
        unlisted_video = Video(
            creator_id=test_user.id,
            title="Unlisted Clip",
            visibility="unlisted",
            status="ready",
            ipfs_cid="QmClip2",
        )
        db_session.add_all([pub_video, unlisted_video])
        db_session.commit()

        # Public video
        res_pub = client.get(f"/api/v1/videos/{pub_video.id}")
        assert res_pub.status_code == 200
        assert res_pub.json()["title"] == "Public Clip"
        assert res_pub.json()["creator"]["username"] == test_user.username

        # Unlisted video
        res_unlisted = client.get(f"/api/v1/videos/{unlisted_video.id}")
        assert res_unlisted.status_code == 200
        assert res_unlisted.json()["title"] == "Unlisted Clip"

    def test_get_video_private_and_draft_authorization(
        self,
        client: TestClient,
        db_session: Session,
        test_user: User,
        other_user: User,
        auth_headers: dict[str, str],
        other_auth_headers: dict[str, str],
    ):
        """Private and draft videos are only accessible by their creator."""
        priv_video = Video(
            creator_id=test_user.id,
            title="Alice Private Journal",
            visibility="private",
            status="ready",
            ipfs_cid="QmPrivate1",
        )
        draft_video = Video(
            creator_id=test_user.id,
            title="Alice Work in Progress",
            visibility="public",
            status="draft",
        )
        db_session.add_all([priv_video, draft_video])
        db_session.commit()

        # 1. Unauthenticated -> 404
        assert client.get(f"/api/v1/videos/{priv_video.id}").status_code == 404
        assert client.get(f"/api/v1/videos/{draft_video.id}").status_code == 404

        # 2. Non-owner authenticated -> 404
        assert client.get(f"/api/v1/videos/{priv_video.id}", headers=other_auth_headers).status_code == 404
        assert client.get(f"/api/v1/videos/{draft_video.id}", headers=other_auth_headers).status_code == 404

        # 3. Owner authenticated -> 200 OK
        res_owner_priv = client.get(f"/api/v1/videos/{priv_video.id}", headers=auth_headers)
        assert res_owner_priv.status_code == 200
        assert res_owner_priv.json()["title"] == "Alice Private Journal"

        res_owner_draft = client.get(f"/api/v1/videos/{draft_video.id}", headers=auth_headers)
        assert res_owner_draft.status_code == 200
        assert res_owner_draft.json()["title"] == "Alice Work in Progress"

    def test_get_nonexistent_video_returns_404(self, client: TestClient):
        """Requesting a missing video returns 404."""
        response = client.get("/api/v1/videos/999999")
        assert response.status_code == 404


class TestVideoUpdateAndDeletion:
    """Tests for PATCH and DELETE /api/v1/videos/{video_id}."""

    def test_owner_can_update_video_metadata(
        self,
        client: TestClient,
        db_session: Session,
        test_user: User,
        auth_headers: dict[str, str],
    ):
        """Video creator can update title, description, visibility, and status."""
        video = Video(
            creator_id=test_user.id,
            title="Initial Title",
            description="Initial Description",
            visibility="private",
            status="draft",
        )
        db_session.add(video)
        db_session.commit()

        patch_payload = {
            "title": "Updated Title",
            "description": "Updated Description",
            "visibility": "public",
            "status": "ready",
            "thumbnail_cid": "QmThumbnailNew123",
            "duration_seconds": 600,
        }
        response = client.patch(
            f"/api/v1/videos/{video.id}",
            json=patch_payload,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["description"] == "Updated Description"
        assert data["visibility"] == "public"
        assert data["status"] == "ready"
        assert data["thumbnail_cid"] == "QmThumbnailNew123"
        assert data["duration_seconds"] == 600

    def test_non_owner_cannot_update_video(
        self,
        client: TestClient,
        db_session: Session,
        test_user: User,
        other_auth_headers: dict[str, str],
    ):
        """Another user cannot update someone else's video (403 Forbidden)."""
        video = Video(
            creator_id=test_user.id,
            title="Alice's Video",
            visibility="public",
            status="ready",
        )
        db_session.add(video)
        db_session.commit()

        response = client.patch(
            f"/api/v1/videos/{video.id}",
            json={"title": "Hacked Title"},
            headers=other_auth_headers,
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "Not authorized to modify this video"

    def test_owner_can_delete_video(
        self,
        client: TestClient,
        db_session: Session,
        test_user: User,
        auth_headers: dict[str, str],
    ):
        """Owner can successfully delete their video record."""
        video = Video(
            creator_id=test_user.id,
            title="Video to Delete",
            visibility="public",
            status="ready",
        )
        db_session.add(video)
        db_session.commit()

        response = client.delete(f"/api/v1/videos/{video.id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify record no longer exists
        get_res = client.get(f"/api/v1/videos/{video.id}")
        assert get_res.status_code == 404

    def test_non_owner_cannot_delete_video(
        self,
        client: TestClient,
        db_session: Session,
        test_user: User,
        other_auth_headers: dict[str, str],
    ):
        """Another user cannot delete someone else's video (403 Forbidden)."""
        video = Video(
            creator_id=test_user.id,
            title="Alice's Safe Video",
            visibility="public",
            status="ready",
        )
        db_session.add(video)
        db_session.commit()

        response = client.delete(
            f"/api/v1/videos/{video.id}",
            headers=other_auth_headers,
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "Not authorized to delete this video"


class TestPaginationAndFiltering:
    """Tests for pagination and filters on GET /api/v1/videos."""

    def test_pagination_and_creator_filter(
        self,
        client: TestClient,
        db_session: Session,
        test_user: User,
        other_user: User,
    ):
        """Pagination returns correct slices, page numbers, and respects creator_id filter."""
        # Create 5 videos for Alice
        alice_videos = [
            Video(
                creator_id=test_user.id,
                title=f"Alice Episode {i}",
                visibility="public",
                status="ready",
            )
            for i in range(1, 6)
        ]
        # Create 2 videos for Bob
        bob_videos = [
            Video(
                creator_id=other_user.id,
                title=f"Bob Episode {i}",
                visibility="public",
                status="ready",
            )
            for i in range(1, 3)
        ]
        db_session.add_all(alice_videos + bob_videos)
        db_session.commit()

        # Page 1 with page_size=3 (Total 7)
        res_p1 = client.get("/api/v1/videos?page=1&page_size=3")
        assert res_p1.status_code == 200
        d1 = res_p1.json()
        assert d1["total"] == 7
        assert d1["page"] == 1
        assert d1["page_size"] == 3
        assert d1["total_pages"] == 3
        assert len(d1["items"]) == 3

        # Page 3 with page_size=3 (Remaining 1 item)
        res_p3 = client.get("/api/v1/videos?page=3&page_size=3")
        assert res_p3.status_code == 200
        d3 = res_p3.json()
        assert len(d3["items"]) == 1

        # Filter by creator_id=Alice
        res_alice = client.get(f"/api/v1/videos?creator_id={test_user.id}")
        assert res_alice.status_code == 200
        da = res_alice.json()
        assert da["total"] == 5
        assert all(item["creator_id"] == test_user.id for item in da["items"])


class TestVideoStream:
    """Tests for GET /api/v1/videos/{video_id}/stream and /api/v1/videos/cid/{cid}/stream."""

    def test_stream_nonexistent_video_404(self, client: TestClient):
        res = client.get("/api/v1/videos/999999/stream")
        assert res.status_code == 404

    def test_stream_video_without_cid_404(
        self,
        client: TestClient,
        db_session: Session,
        test_user: User,
    ):
        video = Video(
            creator_id=test_user.id,
            title="Draft Video",
            status="draft",
            ipfs_cid=None,
        )
        db_session.add(video)
        db_session.commit()

        res = client.get(f"/api/v1/videos/{video.id}/stream")
        assert res.status_code == 404

