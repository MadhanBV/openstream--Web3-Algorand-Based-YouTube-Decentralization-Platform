from datetime import datetime, timedelta, timezone
import hashlib
import logging
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.user import User
from app.models.video import Video
from app.models.view import View

logger = logging.getLogger(__name__)
settings = get_settings()

# Anti-Abuse Configuration
DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 10
MAX_CREDIT_PER_HEARTBEAT_SECONDS = 15
MIN_WATCH_THRESHOLD_SECONDS = 30
VIEW_COOLDOWN_SECONDS = 3600  # 1 hour duplicate cooldown window


def hash_client_ip(ip: str | None) -> str | None:
    """
    Computes a salted cryptographic SHA-256 hash of the client IP address.
    Protects user privacy by ensuring raw IP addresses are never persisted.
    """
    if not ip:
        return None
    salt = settings.JWT_SECRET
    return hashlib.sha256(f"{ip}:{salt}".encode("utf-8")).hexdigest()[:64]


def calculate_min_watch_threshold(video_duration_seconds: int) -> int:
    """
    Calculates the minimum active watch threshold required for a view to qualify.
    Standard threshold is 30s. For shorter videos (<60s), requires at least 50% watch time.
    """
    if video_duration_seconds <= 0:
        return MIN_WATCH_THRESHOLD_SECONDS
    if video_duration_seconds < 60:
        return max(5, int(video_duration_seconds * 0.5))
    return MIN_WATCH_THRESHOLD_SECONDS


def start_watch_session(
    db: Session,
    video_id: int,
    user_id: int | None,
    client_ip: str | None,
) -> dict:
    """
    Initializes a new server-validated video watch tracking session.
    Verifies that the target video exists, is in 'ready' status, and is playable.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video {video_id} not found",
        )

    if video.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Video is still processing or not ready for playback",
        )

    if video.visibility not in ("public", "unlisted"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Video is private or unavailable",
        )

    now = datetime.now(timezone.utc)
    session_id = uuid.uuid4().hex
    ip_hash = hash_client_ip(client_ip)

    new_view = View(
        video_id=video.id,
        user_id=user_id,
        session_id=session_id,
        client_ip_hash=ip_hash,
        watch_duration_seconds=0,
        is_valid=True,
        is_qualified=False,
        last_heartbeat_at=now,
        created_at=now,
    )
    db.add(new_view)
    db.commit()

    min_threshold = calculate_min_watch_threshold(video.duration_seconds)

    return {
        "session_id": session_id,
        "video_id": video.id,
        "heartbeat_interval_seconds": DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
        "min_watch_seconds": min_threshold,
    }


def record_heartbeat(
    db: Session,
    session_id: str,
    current_time_seconds: float,
    user_id: int | None,
    client_ip: str | None,
) -> dict:
    """
    Processes an active playback heartbeat. Accrues watch duration strictly based
    on elapsed wall-clock time and verifies anti-abuse qualification constraints.
    """
    view = db.query(View).filter(View.session_id == session_id).first()
    if not view:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watch session not found or invalid session token",
        )

    video = db.query(Video).filter(Video.id == view.video_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated video not found",
        )

    now = datetime.now(timezone.utc)

    # Calculate elapsed wall-clock time since previous heartbeat
    if view.last_heartbeat_at:
        last_hb = (
            view.last_heartbeat_at
            if view.last_heartbeat_at.tzinfo is not None
            else view.last_heartbeat_at.replace(tzinfo=timezone.utc)
        )
        elapsed = (now - last_hb).total_seconds()
    else:
        elapsed = DEFAULT_HEARTBEAT_INTERVAL_SECONDS

    # Anti-abuse: ignore rapid heartbeat spamming (< 0.5s)
    if elapsed < 0.5:
        return {
            "session_id": view.session_id,
            "watch_duration_seconds": view.watch_duration_seconds,
            "is_qualified": view.is_qualified,
            "status": "throttled",
        }

    # Anti-abuse: cap credited seconds per heartbeat (prevents spoofing large durations)
    credit_seconds = min(elapsed, MAX_CREDIT_PER_HEARTBEAT_SECONDS)
    view.watch_duration_seconds += int(credit_seconds)
    view.last_heartbeat_at = now

    session_status = "active"

    # Evaluation for qualification if not yet qualified
    if not view.is_qualified:
        min_threshold = calculate_min_watch_threshold(video.duration_seconds)

        # Policy: Creator self-views never qualify for rewards
        effective_user_id = user_id or view.user_id
        if effective_user_id is not None and effective_user_id == video.creator_id:
            session_status = "self_view"
        elif view.watch_duration_seconds >= min_threshold:
            # Policy: Cooldown enforcement (1 qualified view per viewer/IP per video every hour)
            cooldown_cutoff = now - timedelta(seconds=VIEW_COOLDOWN_SECONDS)
            duplicate_query = (
                db.query(View)
                .filter(
                    View.video_id == video.id,
                    View.is_qualified == True,
                    View.id != view.id,
                    View.created_at >= cooldown_cutoff,
                )
            )

            if effective_user_id is not None:
                duplicate_view = duplicate_query.filter(View.user_id == effective_user_id).first()
            elif view.client_ip_hash:
                duplicate_view = duplicate_query.filter(View.client_ip_hash == view.client_ip_hash).first()
            else:
                duplicate_view = None

            if duplicate_view:
                session_status = "cooldown"
            else:
                # View satisfies all qualification and anti-abuse criteria!
                view.is_qualified = True
                video.views_count += 1
                session_status = "qualified"
                logger.info(
                    f"View qualified: session={view.session_id}, video={video.id}, duration={view.watch_duration_seconds}s"
                )

    db.commit()

    return {
        "session_id": view.session_id,
        "watch_duration_seconds": view.watch_duration_seconds,
        "is_qualified": view.is_qualified,
        "status": session_status,
    }


def end_watch_session(
    db: Session,
    session_id: str,
    completed: bool = False,
) -> dict:
    """
    Finalizes a watch session upon playback completion or player unmount.
    """
    view = db.query(View).filter(View.session_id == session_id).first()
    if not view:
        return {"session_id": session_id, "status": "closed"}

    view.last_heartbeat_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "session_id": view.session_id,
        "watch_duration_seconds": view.watch_duration_seconds,
        "is_qualified": view.is_qualified,
        "status": "closed",
    }


def get_video_view_stats(db: Session, video_id: int) -> dict:
    """
    Aggregates engagement and qualification statistics for a video.
    """
    total_views = db.query(func.count(View.id)).filter(View.video_id == video_id).scalar() or 0
    qualified_views = (
        db.query(func.count(View.id))
        .filter(View.video_id == video_id, View.is_qualified == True)
        .scalar()
        or 0
    )
    total_duration = (
        db.query(func.sum(View.watch_duration_seconds))
        .filter(View.video_id == video_id)
        .scalar()
        or 0
    )

    return {
        "video_id": video_id,
        "total_views": total_views,
        "qualified_views": qualified_views,
        "total_watch_duration_seconds": int(total_duration),
    }
