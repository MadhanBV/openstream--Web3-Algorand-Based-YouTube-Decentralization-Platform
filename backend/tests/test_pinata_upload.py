import io
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.video import Video
from app.services.pinata import PinataUploadError, PinataService


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Primary creator user fixture."""
    user = User(
        username="creator_clara",
        email="clara@openstream.io",
        hashed_password=hash_password("Password123!"),
        display_name="Clara Studio",
        is_creator=True,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def other_user(db_session: Session) -> User:
    """Second user fixture."""
    user = User(
        username="viewer_dan",
        email="dan@openstream.io",
        hashed_password=hash_password("Password123!"),
        display_name="Dan Viewer",
        is_creator=False,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_auth_headers(other_user: User) -> dict[str, str]:
    token = create_access_token(subject=other_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_video(db_session: Session, test_user: User) -> Video:
    """Creates a draft video record owned by Clara."""
    video = Video(
        creator_id=test_user.id,
        title="Intro to IPFS Pinning",
        description="Learn how files are addressed content-wise.",
        visibility="public",
        status="draft",
        ipfs_cid=None,
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)
    return video


class TestPinataVideoUpload:
    """Test suite for POST /api/v1/videos/{video_id}/upload."""

    def test_upload_video_authenticated_success_mocked(
        self,
        client: TestClient,
        sample_video: Video,
        auth_headers: dict[str, str],
        db_session: Session,
    ):
        """Owner can upload video file; file is pinned to Pinata and CID is saved in PostgreSQL."""
        fake_video_bytes = b"FAKE_MP4_HEADER_DATA_CONTENT_STREAM"
        mock_cid = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"

        with patch("app.api.routes.videos.pinata_service.is_configured", return_value=True), \
             patch("app.api.routes.videos.pinata_service.upload_file", return_value=mock_cid):
            response = client.post(
                f"/api/v1/videos/{sample_video.id}/upload",
                files={"file": ("test_clip.mp4", io.BytesIO(fake_video_bytes), "video/mp4")},
                headers=auth_headers,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_video.id
        assert data["ipfs_cid"] == mock_cid
        assert data["status"] == "ready"
        assert data["playback_url"] is not None
        assert mock_cid in data["playback_url"]
        assert "pinata" in data["playback_url"].lower() or "ipfs" in data["playback_url"].lower()

        # Verify database record updated
        db_video = db_session.get(Video, sample_video.id)
        assert db_video.ipfs_cid == mock_cid
        assert db_video.status == "ready"

    def test_upload_video_unauthenticated_rejected(
        self, client: TestClient, sample_video: Video
    ):
        """Unauthenticated requests are rejected with 401."""
        response = client.post(
            f"/api/v1/videos/{sample_video.id}/upload",
            files={"file": ("test_clip.mp4", io.BytesIO(b"content"), "video/mp4")},
        )
        assert response.status_code == 401

    def test_upload_video_non_owner_rejected(
        self,
        client: TestClient,
        sample_video: Video,
        other_auth_headers: dict[str, str],
    ):
        """Non-owner upload attempt is rejected with 403 Forbidden."""
        response = client.post(
            f"/api/v1/videos/{sample_video.id}/upload",
            files={"file": ("hacked.mp4", io.BytesIO(b"content"), "video/mp4")},
            headers=other_auth_headers,
        )
        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]

    def test_upload_video_nonexistent_returns_404(
        self, client: TestClient, auth_headers: dict[str, str]
    ):
        """Upload attempt for non-existent video ID returns 404."""
        response = client.post(
            "/api/v1/videos/999999/upload",
            files={"file": ("clip.mp4", io.BytesIO(b"content"), "video/mp4")},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_upload_video_invalid_file_type_rejected(
        self, client: TestClient, sample_video: Video, auth_headers: dict[str, str]
    ):
        """Uploading non-video MIME types (like PDF or TXT) is rejected with 400 Bad Request."""
        response = client.post(
            f"/api/v1/videos/{sample_video.id}/upload",
            files={"file": ("document.pdf", io.BytesIO(b"%PDF-1.4..."), "application/pdf")},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    def test_upload_video_empty_file_rejected(
        self, client: TestClient, sample_video: Video, auth_headers: dict[str, str]
    ):
        """Empty 0-byte file upload is rejected with 400 Bad Request."""
        response = client.post(
            f"/api/v1/videos/{sample_video.id}/upload",
            files={"file": ("empty.mp4", io.BytesIO(b""), "video/mp4")},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "empty" in response.json()["detail"]

    def test_upload_video_oversized_file_rejected(
        self,
        client: TestClient,
        sample_video: Video,
        auth_headers: dict[str, str],
    ):
        """Oversized file exceeding configured limit is rejected with 413 Payload Too Large."""
        fake_content = b"X" * 1024  # 1 KB
        with patch("app.api.routes.videos.settings.MAX_UPLOAD_SIZE_BYTES", 500):  # limit to 500 bytes
            response = client.post(
                f"/api/v1/videos/{sample_video.id}/upload",
                files={"file": ("large_video.mp4", io.BytesIO(fake_content), "video/mp4")},
                headers=auth_headers,
            )
        assert response.status_code == 413
        assert "exceeds maximum allowed upload size" in response.json()["detail"]

    def test_upload_video_pinata_failure_sets_failed_status(
        self,
        client: TestClient,
        sample_video: Video,
        auth_headers: dict[str, str],
        db_session: Session,
    ):
        """When Pinata upload raises an error, response is 502 and DB status becomes 'failed'."""
        with patch("app.api.routes.videos.pinata_service.is_configured", return_value=True), \
             patch("app.api.routes.videos.pinata_service.upload_file", side_effect=PinataUploadError("Pinata gateway timeout", status_code=502)):
            response = client.post(
                f"/api/v1/videos/{sample_video.id}/upload",
                files={"file": ("video.mp4", io.BytesIO(b"test-stream-bytes"), "video/mp4")},
                headers=auth_headers,
            )

        assert response.status_code == 502
        assert "IPFS upload failed" in response.json()["detail"]

        # Check DB status transitioned to 'failed'
        db_video = db_session.get(Video, sample_video.id)
        assert db_video.status == "failed"
        assert db_video.ipfs_cid is None

    def test_upload_video_unconfigured_returns_503(
        self,
        client: TestClient,
        sample_video: Video,
        auth_headers: dict[str, str],
    ):
        """When Pinata service is not configured, response is 503 Service Unavailable."""
        with patch("app.api.routes.videos.pinata_service.is_configured", return_value=False):
            response = client.post(
                f"/api/v1/videos/{sample_video.id}/upload",
                files={"file": ("video.mp4", io.BytesIO(b"test-bytes"), "video/mp4")},
                headers=auth_headers,
            )
        assert response.status_code == 503
        assert "not configured" in response.json()["detail"]


class TestPlaybackUrlGeneration:
    """Test suite for playback URL generation and access rules."""

    def test_playback_url_included_for_ready_video(
        self,
        client: TestClient,
        db_session: Session,
        test_user: User,
    ):
        """Public ready video returns valid playback_url containing the gateway and CID."""
        cid = "QmPlaybackTest1234567890"
        video = Video(
            creator_id=test_user.id,
            title="Streaming Ready Clip",
            visibility="public",
            status="ready",
            ipfs_cid=cid,
        )
        db_session.add(video)
        db_session.commit()

        response = client.get(f"/api/v1/videos/{video.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["ipfs_cid"] == cid
        assert data["playback_url"] is not None
        assert data["playback_url"].endswith(f"/{cid}")

    def test_playback_url_not_present_for_draft_without_cid(
        self,
        client: TestClient,
        sample_video: Video,
        auth_headers: dict[str, str],
    ):
        """Draft video without IPFS CID has playback_url=None."""
        response = client.get(f"/api/v1/videos/{sample_video.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["ipfs_cid"] is None
        assert data["playback_url"] is None

    def test_playback_access_control_private_video(
        self,
        client: TestClient,
        db_session: Session,
        test_user: User,
        other_auth_headers: dict[str, str],
        auth_headers: dict[str, str],
    ):
        """Private video with CID is 404 for non-owners, but accessible with playback_url to owner."""
        cid = "QmSecretCid999"
        video = Video(
            creator_id=test_user.id,
            title="Private Clip",
            visibility="private",
            status="ready",
            ipfs_cid=cid,
        )
        db_session.add(video)
        db_session.commit()

        # Non-owner -> 404
        assert client.get(f"/api/v1/videos/{video.id}").status_code == 404
        assert client.get(f"/api/v1/videos/{video.id}", headers=other_auth_headers).status_code == 404

        # Owner -> 200 with playback_url
        res_owner = client.get(f"/api/v1/videos/{video.id}", headers=auth_headers)
        assert res_owner.status_code == 200
        assert res_owner.json()["playback_url"].endswith(f"/{cid}")


class TestPinataServiceUnit:
    """Unit tests directly on PinataService helper methods."""

    def test_service_is_configured_variations(self):
        """is_configured correctly checks JWT or API key+secret."""
        svc = PinataService()

        # With JWT
        with patch.object(svc.settings, "PINATA_JWT", "jwt_token_123"):
            assert svc.is_configured() is True
            headers = svc.get_auth_headers()
            assert headers["Authorization"] == "Bearer jwt_token_123"

        # With API key & secret
        with patch.object(svc.settings, "PINATA_JWT", None), \
             patch.object(svc.settings, "PINATA_API_KEY", "key_abc"), \
             patch.object(svc.settings, "PINATA_API_SECRET", "secret_xyz"):
            assert svc.is_configured() is True
            headers = svc.get_auth_headers()
            assert headers["pinata_api_key"] == "key_abc"
            assert headers["pinata_secret_api_key"] == "secret_xyz"

        # With nothing
        with patch.object(svc.settings, "PINATA_JWT", None), \
             patch.object(svc.settings, "PINATA_API_KEY", None), \
             patch.object(svc.settings, "PINATA_API_SECRET", None):
            assert svc.is_configured() is False

    def test_get_playback_url(self):
        """Playback URL correctly formats without trailing slashes and handles empty CID."""
        svc = PinataService()
        with patch.object(svc.settings, "PINATA_GATEWAY_URL", "https://gateway.pinata.cloud/ipfs/"):
            url = svc.get_playback_url("QmHash123")
            assert url == "https://gateway.pinata.cloud/ipfs/QmHash123"
            assert svc.get_playback_url(None) is None
            assert svc.get_playback_url("") is None
