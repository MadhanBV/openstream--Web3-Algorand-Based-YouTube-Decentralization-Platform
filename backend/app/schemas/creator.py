from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class DailyMetricPoint(BaseModel):
    """Daily timeseries analytics point."""
    date: str = Field(..., description="Date formatted as YYYY-MM-DD")
    views: int = Field(default=0, description="Total views recorded on this day")
    qualified_views: int = Field(default=0, description="Anti-abuse qualified views on this day")
    watch_seconds: int = Field(default=0, description="Total watched seconds on this day")
    earned_algo: Decimal = Field(default=Decimal("0.000000"), description="ALGO rewards accrued on this day")


class TopVideoMetric(BaseModel):
    """Performance summary of a creator's video."""
    id: int = Field(..., description="Video ID")
    title: str = Field(..., description="Video title")
    thumbnail_cid: str | None = Field(default=None, description="Cover image or IPFS CID")
    views: int = Field(default=0, description="Total view count")
    qualified_views: int = Field(default=0, description="Qualified view count")
    watch_seconds: int = Field(default=0, description="Total watch duration in seconds")
    earned_algo: Decimal = Field(default=Decimal("0.000000"), description="Total ALGO earned")
    likes: int = Field(default=0, description="Total likes")


class RevenueBreakdown(BaseModel):
    """Monetization breakdown across platform revenue streams."""
    view_rewards_algo: Decimal = Field(default=Decimal("0.000000"), description="Earnings from qualified video views")
    ad_revenue_algo: Decimal = Field(default=Decimal("0.000000"), description="Earnings from advertiser CPM pool (70% share)")
    tips_algo: Decimal = Field(default=Decimal("0.000000"), description="Direct on-chain tips received in ALGO")
    total_revenue_algo: Decimal = Field(default=Decimal("0.000000"), description="Cumulative creator earnings across all streams")


class WalletStatus(BaseModel):
    """Creator wallet connection and payout readiness state."""
    connected: bool = Field(default=False, description="Whether creator has a linked Algorand address")
    address: str | None = Field(default=None, description="Algorand TestNet wallet address")
    minimum_threshold_algo: Decimal = Field(default=Decimal("1.000000"), description="Minimum threshold for blockchain payout")
    progress_percent: float = Field(default=0.0, description="Percentage of progress towards payout threshold")


class CreatorAnalyticsResponse(BaseModel):
    """Comprehensive Creator Studio analytics response."""
    total_views: int = Field(default=0, description="Lifetime views across all creator videos")
    total_qualified_views: int = Field(default=0, description="Anti-abuse qualified views (>=30s watched)")
    total_watch_seconds: int = Field(default=0, description="Cumulative watch time in seconds")
    total_watch_hours: float = Field(default=0.0, description="Cumulative watch time in hours")
    average_view_duration_seconds: float = Field(default=0.0, description="Average seconds watched per view")
    total_likes: int = Field(default=0, description="Total likes across videos")
    total_videos: int = Field(default=0, description="Total published video assets")
    total_earned_algo: Decimal = Field(default=Decimal("0.000000"), description="Lifetime earned ALGO")
    pending_rewards_algo: Decimal = Field(default=Decimal("0.000000"), description="Unsettled ALGO balance")
    settled_algo: Decimal = Field(default=Decimal("0.000000"), description="On-chain settled ALGO")
    top_videos: list[TopVideoMetric] = Field(default_factory=list, description="Top performing video assets")
    daily_trends: list[DailyMetricPoint] = Field(default_factory=list, description="Daily timeseries analytics")
    revenue_breakdown: RevenueBreakdown = Field(..., description="Breakdown by monetization source")
    wallet_status: WalletStatus = Field(..., description="Algorand wallet status and payout threshold")


class CreatorVideoItem(BaseModel):
    """Studio representation of a video asset owned by creator."""
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Video ID")
    title: str = Field(..., description="Video title")
    description: str | None = Field(default=None, description="Video description")
    ipfs_cid: str | None = Field(default=None, description="IPFS content identifier")
    thumbnail_cid: str | None = Field(default=None, description="Thumbnail URL or CID")
    duration_seconds: int = Field(default=0, description="Duration in seconds")
    views_count: int = Field(default=0, description="Total views count")
    qualified_views: int = Field(default=0, description="Qualified views count")
    likes_count: int = Field(default=0, description="Likes count")
    visibility: str = Field(default="public", description="public, unlisted, private")
    status: str = Field(default="ready", description="draft, processing, ready, failed")
    earned_algo: Decimal = Field(default=Decimal("0.000000"), description="Accrued ALGO rewards")
    playback_url: str | None = Field(default=None, description="IPFS playback gateway link")
    created_at: datetime = Field(..., description="Upload timestamp")
    updated_at: datetime = Field(..., description="Last updated timestamp")
