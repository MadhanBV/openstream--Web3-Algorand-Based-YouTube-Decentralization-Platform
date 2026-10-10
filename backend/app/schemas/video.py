from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


VideoVisibility = Literal["public", "unlisted", "private"]
VideoStatus = Literal["draft", "processing", "ready", "failed"]


class CreatorSummary(BaseModel):
    """Safe compact creator profile attached to video representations."""
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Creator user ID")
    username: str = Field(..., description="Creator unique username")
    display_name: str | None = Field(default=None, description="Channel display name")
    avatar_url: str | None = Field(default=None, description="Avatar image URL")
    wallet_address: str | None = Field(default=None, description="Public Algorand address")
    is_creator: bool = Field(default=False, description="Creator status flag")


class VideoCreateRequest(BaseModel):
    """
    Request schema for creating a new video metadata record.
    System-controlled fields (creator_id, ipfs_cid, views_count, likes_count) are disallowed.
    """
    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Video title (1-255 characters)",
        examples=["Building Decentralized Apps on Algorand"],
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
        description="Video description markdown/text",
        examples=["A complete architectural overview of IPFS + Algorand."],
    )
    duration_seconds: int = Field(
        default=0,
        ge=0,
        description="Duration in seconds (non-negative)",
        examples=[482],
    )
    visibility: VideoVisibility = Field(
        default="public",
        description="Video privacy visibility setting (public, unlisted, private)",
        examples=["public"],
    )
    thumbnail_cid: str | None = Field(
        default=None,
        description="Initial thumbnail IPFS CID or data/media URL",
    )

    @field_validator("title")
    @classmethod
    def validate_title_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Title must contain at least one non-whitespace character")
        return stripped


class VideoUpdateRequest(BaseModel):
    """
    Request schema for updating permitted video metadata.
    Owner-only update operation.
    """
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated video title",
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
        description="Updated video description",
    )
    visibility: VideoVisibility | None = Field(
        default=None,
        description="Updated video privacy setting",
    )
    thumbnail_cid: str | None = Field(
        default=None,
        description="Updated thumbnail IPFS CID or media URL",
    )
    status: VideoStatus | None = Field(
        default=None,
        description="Updated processing status (draft, processing, ready)",
    )
    duration_seconds: int | None = Field(
        default=None,
        ge=0,
        description="Updated video duration in seconds",
    )

    @field_validator("title")
    @classmethod
    def validate_title_if_present(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Title must contain at least one non-whitespace character")
            return stripped
        return v


class VideoResponse(BaseModel):
    """
    Public safe video response entity.
    Includes creator summary and IPFS CID references when published.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Unique video ID")
    creator_id: int = Field(..., description="Creator user ID")
    title: str = Field(..., description="Video title")
    description: str | None = Field(default=None, description="Video description")
    ipfs_cid: str | None = Field(default=None, description="Decentralized IPFS CID reference")
    thumbnail_cid: str | None = Field(default=None, description="Thumbnail IPFS CID reference")
    duration_seconds: int = Field(default=0, description="Duration in seconds")
    views_count: int = Field(default=0, description="Total verified view count")
    likes_count: int = Field(default=0, description="Total like count")
    visibility: str = Field(..., description="Visibility status (public, unlisted, private)")
    status: str = Field(..., description="Processing status (draft, processing, ready, failed)")
    playback_url: str | None = Field(default=None, description="Direct gateway playback URL for streaming the video from IPFS")
    created_at: datetime = Field(..., description="Record creation timestamp (UTC)")
    updated_at: datetime = Field(..., description="Last update timestamp (UTC)")
    creator: CreatorSummary | None = Field(default=None, description="Creator channel details")


class VideoUploadResponse(BaseModel):
    """Safe response after a video file has been uploaded and pinned to IPFS."""
    video_id: int = Field(..., description="Unique video ID")
    ipfs_cid: str = Field(..., description="Pinned IPFS Content Identifier (CID)")
    status: str = Field(..., description="Updated video processing status")
    playback_url: str = Field(..., description="Gateway URL for video playback")
    message: str = Field(default="Video file successfully pinned to IPFS", description="Status message")


class PaginatedVideoResponse(BaseModel):
    """Paginated collection of videos for catalog and discovery browsing."""
    items: list[VideoResponse] = Field(..., description="List of video records")
    total: int = Field(..., description="Total matching video records")
    page: int = Field(..., description="Current page number (1-indexed)")
    page_size: int = Field(..., description="Page size limit")
    total_pages: int = Field(..., description="Total available pages")
