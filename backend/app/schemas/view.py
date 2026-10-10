from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ViewSessionStartRequest(BaseModel):
    """Payload to initiate a video watch tracking session."""
    video_id: int = Field(..., description="ID of the video being watched", gt=0)


class ViewSessionStartResponse(BaseModel):
    """Session configuration returned to the video player."""
    session_id: str = Field(..., description="Unique server-tracked watch session token")
    video_id: int = Field(..., description="Video ID")
    heartbeat_interval_seconds: int = Field(default=10, description="Recommended heartbeat frequency in seconds")
    min_watch_seconds: int = Field(default=30, description="Minimum active watch time required for a qualified view")


class ViewHeartbeatRequest(BaseModel):
    """Progress heartbeat submitted by active player."""
    session_id: str = Field(..., min_length=16, max_length=128, description="Active session token")
    current_time_seconds: float = Field(..., ge=0.0, description="Current video playback position in seconds")


class ViewHeartbeatResponse(BaseModel):
    """Heartbeat response confirming server-credited watch progression."""
    session_id: str = Field(..., description="Active session token")
    watch_duration_seconds: int = Field(..., ge=0, description="Server-validated watch duration in seconds")
    is_qualified: bool = Field(..., description="Whether this view has qualified for creator rewards")
    status: str = Field(..., description="Session status: 'active', 'qualified', 'cooldown', or 'self_view'")


class ViewSessionEndRequest(BaseModel):
    """Payload to terminate an active playback session."""
    session_id: str = Field(..., min_length=16, max_length=128, description="Active session token")
    completed: bool = Field(default=False, description="Whether the video reached the end")


class ViewStatsResponse(BaseModel):
    """Public engagement and qualification statistics for a video."""
    video_id: int = Field(..., description="Video ID")
    total_views: int = Field(..., ge=0, description="Total recorded watch sessions")
    qualified_views: int = Field(..., ge=0, description="Total verified views satisfying minimum watch duration")
    total_watch_duration_seconds: int = Field(..., ge=0, description="Aggregate watch duration in seconds")
