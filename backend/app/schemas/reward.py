from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class RewardResponse(BaseModel):
    """Creator reward record schema."""
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Unique reward ledger record ID")
    creator_id: int = Field(..., description="Creator user ID")
    video_id: int | None = Field(default=None, description="Source video ID if attributed per video")
    amount: Decimal = Field(..., description="Calculated reward in ALGO (Decimal with 6 decimals)")
    views_credited: int = Field(..., ge=0, description="Number of verified views credited in this batch")
    status: str = Field(..., description="Status: 'pending', 'accrued', or 'settled'")
    settlement_id: int | None = Field(default=None, description="Associated on-chain settlement ID if settled")
    created_at: datetime = Field(..., description="Accrual timestamp (UTC)")
    settled_at: datetime | None = Field(default=None, description="On-chain settlement timestamp (UTC)")


class RewardCalculationResponse(BaseModel):
    """Result of an idempotent reward calculation batch execution."""
    rewards_created: int = Field(..., ge=0, description="Number of reward records generated")
    total_amount: Decimal = Field(..., description="Total ALGO reward calculated across all eligible views")
    total_views_credited: int = Field(..., ge=0, description="Total eligible qualified views processed")
    message: str = Field(..., description="Execution status summary")


class CreatorRewardSummaryResponse(BaseModel):
    """Aggregated reward metrics and history for creator studio."""
    creator_id: int = Field(..., description="Creator user ID")
    wallet_address: str | None = Field(default=None, description="Connected Algorand wallet address")
    total_earned_algo: Decimal = Field(..., description="Lifetime total accrued rewards in ALGO")
    pending_rewards_algo: Decimal = Field(..., description="Unsettled rewards eligible for blockchain payout")
    settled_rewards_algo: Decimal = Field(..., description="Total settled rewards confirmed on-chain")
    total_qualified_views: int = Field(..., ge=0, description="Lifetime total verified qualified views")
    rewards: list[RewardResponse] = Field(default_factory=list, description="Recent reward accrual ledger entries")
