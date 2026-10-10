import math
import os
import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user, get_current_user_optional
from app.config import get_settings
from app.db.session import get_db
from app.models.user import User
from app.models.video import Video
from app.schemas.video import (
    PaginatedVideoResponse,
    VideoCreateRequest,
    VideoResponse,
    VideoUpdateRequest,
)
from app.services.pinata import PinataConfigurationError, PinataUploadError, pinata_service

router = APIRouter(tags=["Videos"])
settings = get_settings()


def build_video_response(video: Video) -> VideoResponse:
    """
    Constructs a safe VideoResponse with dynamic IPFS gateway playback URL.
    """
    playback_url = pinata_service.get_playback_url(video.ipfs_cid) if video.ipfs_cid else None
    resp = VideoResponse.model_validate(video)
    resp.playback_url = playback_url
    return resp


@router.post(
    "",
    response_model=VideoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create video metadata",
    description="Registers a new video metadata record. Creator ID is derived from the authenticated user. New records start in 'draft' status.",
)
def create_video(
    data: VideoCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> VideoResponse:
    """
    Creates a new video metadata entry.
    Enforces that creator_id is bound to the authenticated user and initializes
    system fields (views, likes, status) securely.
    """
    new_video = Video(
        creator_id=current_user.id,
        title=data.title,
        description=data.description,
        duration_seconds=data.duration_seconds,
        visibility=data.visibility,
        status="draft",
        ipfs_cid=None,
        thumbnail_cid=data.thumbnail_cid,
        views_count=0,
        likes_count=0,
    )

    db.add(new_video)
    db.commit()
    db.refresh(new_video)

    # Attach current user as creator for the response schema
    new_video.creator = current_user
    return build_video_response(new_video)


@router.get(
    "",
    response_model=PaginatedVideoResponse,
    status_code=status.HTTP_200_OK,
    summary="List published videos",
    description="Returns a paginated list of publicly discoverable videos (ready status and public visibility). Eagerly loads creator metadata to avoid N+1 queries.",
)
def list_videos(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page limit"),
    creator_id: int | None = Query(None, description="Optional filter by creator user ID"),
    db: Session = Depends(get_db),
) -> PaginatedVideoResponse:
    """
    Lists public ready videos with pagination.
    Excludes drafts, processing, unlisted, and private records from public discovery.
    """
    query = (
        db.query(Video)
        .options(joinedload(Video.creator))
        .filter(Video.status == "ready", Video.visibility == "public")
    )

    if creator_id is not None:
        query = query.filter(Video.creator_id == creator_id)

    total_count = query.with_entities(func.count(Video.id)).scalar() or 0
    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 0

    offset = (page - 1) * page_size
    items = query.order_by(Video.created_at.desc()).offset(offset).limit(page_size).all()

    return PaginatedVideoResponse(
        items=[build_video_response(v) for v in items],
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{video_id}",
    response_model=VideoResponse,
    status_code=status.HTTP_200_OK,
    summary="Get video details and playback URL",
    description="Retrieves a video's metadata by ID including its IPFS playback URL. Public and unlisted ready videos are accessible by anyone. Private or draft videos require creator authentication.",
)
def get_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> VideoResponse:
    """
    Retrieves video metadata enforcing strict visibility and authorization rules.
    Returns 404 for missing or unauthorized video records to prevent information disclosure.
    """
    video = (
        db.query(Video)
        .options(joinedload(Video.creator))
        .filter(Video.id == video_id)
        .first()
    )

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    # Public and Unlisted videos that are ready can be viewed
    is_public_ready = video.status == "ready" and video.visibility in ("public", "unlisted")
    is_owner = current_user is not None and current_user.id == video.creator_id

    if not (is_public_ready or is_owner):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    return build_video_response(video)


@router.get(
    "/{video_id}/stream",
    summary="Stream video media with HTTP 206 Range seeking support",
    description="Streams video chunks directly with HTTP 206 Partial Content headers for ultra-smooth playback and seeking.",
)
async def stream_video(
    video_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or not video.ipfs_cid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video or media content not found",
        )

    is_public_ready = video.visibility in ("public", "unlisted") and video.status == "ready"
    is_owner = current_user is not None and current_user.id == video.creator_id

    if not (is_public_ready or is_owner):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video stream not accessible",
        )

    playback_url = pinata_service.get_playback_url(video.ipfs_cid)
    if not playback_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playback URL unavailable",
        )

    # Return instant HTTP 307 Temporary Redirect to the high-speed edge CDN
    # Eliminates Python server bottlenecks while preserving backend authorization
    return RedirectResponse(
        url=playback_url,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


@router.get(
    "/cid/{ipfs_cid}/stream",
    summary="Stream video media by IPFS CID with HTTP 206 Range seeking support",
    description="Redirects to dedicated Pinata gateway for instant edge playback with HTTP 206 Partial Content support.",
)
async def stream_video_by_cid(
    ipfs_cid: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    playback_url = pinata_service.get_playback_url(ipfs_cid)
    if not playback_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playback URL unavailable",
        )

    return RedirectResponse(
        url=playback_url,
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


@router.patch(
    "/{video_id}",
    response_model=VideoResponse,
    status_code=status.HTTP_200_OK,
    summary="Update video metadata",
    description="Allows the owner to update permitted video fields (title, description, visibility, status, duration, thumbnail_cid). Disallows modifying system-controlled counters or creator ID.",
)
def update_video(
    video_id: int,
    data: VideoUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> VideoResponse:
    """
    Updates video metadata. Verifies that the authenticated user is the creator/owner.
    """
    video = (
        db.query(Video)
        .options(joinedload(Video.creator))
        .filter(Video.id == video_id)
        .first()
    )

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    # Enforce strict ownership
    if video.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this video",
        )

    # Apply only provided updates
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(video, field, value)

    db.commit()
    db.refresh(video)

    return build_video_response(video)


@router.delete(
    "/{video_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete video metadata",
    description="Allows the owner to delete their video metadata record. Returns 204 No Content on success.",
)
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """
    Deletes video metadata. Verifies that the caller is the video owner.
    """
    video = db.query(Video).filter(Video.id == video_id).first()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    # Enforce strict ownership
    if video.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this video",
        )

    db.delete(video)
    db.commit()


@router.post(
    "/{video_id}/upload",
    response_model=VideoResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload video file to Pinata IPFS",
    description="Uploads a video binary to decentralized IPFS storage via Pinata. Verifies ownership, validates MIME type and file size, updates status and saves returned CID.",
)
def upload_video_file(
    video_id: int,
    file: UploadFile = File(..., description="Binary video file to upload (MP4, WebM, MOV, etc.)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> VideoResponse:
    """
    Handles authenticated video file uploads to Pinata/IPFS:
    1. Verifies ownership of the existing video record.
    2. Validates video MIME type and file extension.
    3. Enforces MAX_UPLOAD_SIZE_BYTES without loading unbounded data into memory.
    4. Pins file to Pinata IPFS.
    5. Saves the resulting CID and marks status as 'ready' on success, or 'failed' on error.
    """
    video = (
        db.query(Video)
        .options(joinedload(Video.creator))
        .filter(Video.id == video_id)
        .first()
    )

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found",
        )

    # Enforce strict ownership
    if video.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload file for this video record",
        )

    # Validate file presence and filename
    if not file.filename or not file.filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename",
        )

    # Validate MIME type and extension
    allowed_types = settings.ALLOWED_VIDEO_MIME_TYPES
    allowed_exts = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".ogg"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    content_type = file.content_type or "application/octet-stream"

    if content_type not in allowed_types and file_ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{content_type}'. Allowed video formats: MP4, WebM, MOV, AVI, MKV, OGG.",
        )

    # Check file size (spooled / seeked to avoid loading whole file in memory)
    try:
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)
    except Exception:
        file_size = 0

    if file_size == 0:
        # Check if file has any content
        first_byte = file.file.read(1)
        if not first_byte:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes)",
            )
        file.file.seek(0)

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413),
            detail=f"File exceeds maximum allowed upload size of {max_mb} MB.",
        )

    # Ensure Pinata credentials are configured
    if not pinata_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pinata IPFS storage is not configured. Please check backend environment settings.",
        )

    # Set status to processing during upload
    video.status = "processing"
    db.commit()

    try:
        cid = pinata_service.upload_file(
            file_obj=file.file,
            filename=file.filename,
            content_type=content_type,
            video_metadata={
                "video_id": video.id,
                "title": video.title,
                "creator_id": current_user.id,
            },
        )
        video.ipfs_cid = cid
        video.status = "ready"
        db.commit()
        db.refresh(video)
    except PinataConfigurationError as e:
        video.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except PinataUploadError as e:
        video.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=e.status_code,
            detail=f"IPFS upload failed: {str(e)}",
        )
    except Exception as e:
        video.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Pinata IPFS upload failed: {str(e)}",
        )

    return build_video_response(video)
