from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional
from app.db.session import get_db
from app.models.user import User
from app.schemas.view import (
    ViewHeartbeatRequest,
    ViewHeartbeatResponse,
    ViewSessionEndRequest,
    ViewSessionStartRequest,
    ViewSessionStartResponse,
    ViewStatsResponse,
)
from app.services.view_tracking import (
    end_watch_session,
    get_video_view_stats,
    record_heartbeat,
    start_watch_session,
)

router = APIRouter(tags=["Views"])


@router.post(
    "/sessions/start",
    response_model=ViewSessionStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start video watch tracking session",
    description="Initializes a server-validated watch session. Validates video status and returns heartbeat parameters.",
)
def start_session(
    data: ViewSessionStartRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> ViewSessionStartResponse:
    """
    Initializes a new tracking session for an authenticated viewer or guest.
    """
    client_ip = request.client.host if request.client else None
    user_id = current_user.id if current_user else None

    result = start_watch_session(
        db=db,
        video_id=data.video_id,
        user_id=user_id,
        client_ip=client_ip,
    )

    return ViewSessionStartResponse(**result)


@router.post(
    "/sessions/heartbeat",
    response_model=ViewHeartbeatResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit watch progress heartbeat",
    description="Accrues server-validated watch time and checks anti-abuse qualification criteria.",
)
def submit_heartbeat(
    data: ViewHeartbeatRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> ViewHeartbeatResponse:
    """
    Records an active playback heartbeat. Credited duration is strictly bounded by elapsed wall-clock time.
    """
    client_ip = request.client.host if request.client else None
    user_id = current_user.id if current_user else None

    result = record_heartbeat(
        db=db,
        session_id=data.session_id,
        current_time_seconds=data.current_time_seconds,
        user_id=user_id,
        client_ip=client_ip,
    )

    return ViewHeartbeatResponse(**result)


@router.post(
    "/sessions/end",
    status_code=status.HTTP_200_OK,
    summary="End video watch tracking session",
    description="Finalizes active tracking session on video completion or player close.",
)
def end_session(
    data: ViewSessionEndRequest,
    db: Session = Depends(get_db),
):
    """
    Closes the watch session.
    """
    return end_watch_session(
        db=db,
        session_id=data.session_id,
        completed=data.completed,
    )


@router.get(
    "/stats/{video_id}",
    response_model=ViewStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get video view and engagement stats",
    description="Returns public view count, qualified views, and aggregate watch duration.",
)
def get_stats(
    video_id: int,
    db: Session = Depends(get_db),
) -> ViewStatsResponse:
    """
    Returns aggregated view metrics for a video.
    """
    stats = get_video_view_stats(db=db, video_id=video_id)
    return ViewStatsResponse(**stats)
