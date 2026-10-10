from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.reward import (
    CreatorRewardSummaryResponse,
    RewardCalculationResponse,
)
from app.services.reward_engine import (
    calculate_pending_rewards,
    get_creator_reward_summary,
)

router = APIRouter(tags=["Rewards"])


@router.post(
    "/calculate",
    response_model=RewardCalculationResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate creator rewards",
    description="Executes an idempotent reward accrual calculation batch for eligible uncredited qualified views.",
)
def calculate_rewards(
    creator_id: int | None = Query(None, description="Optional target creator ID (defaults to current creator)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> RewardCalculationResponse:
    """
    Triggers reward calculation batch. Idempotent: previously rewarded views are never duplicated.
    """
    target_creator_id = creator_id if creator_id is not None else current_user.id

    result = calculate_pending_rewards(
        db=db,
        creator_id=target_creator_id,
    )

    return RewardCalculationResponse(**result)


@router.get(
    "/me",
    response_model=CreatorRewardSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get creator rewards summary and ledger",
    description="Returns lifetime earnings, pending rewards, and recent accrual history for the authenticated creator.",
)
def get_my_rewards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CreatorRewardSummaryResponse:
    """
    Returns authenticated creator's reward balances and recent history.
    """
    summary = get_creator_reward_summary(db=db, creator_id=current_user.id)
    return CreatorRewardSummaryResponse(**summary)


@router.get(
    "/creator/{creator_id}",
    response_model=CreatorRewardSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get creator reward metrics by user ID",
    description="Returns public reward summary metrics for a creator channel.",
)
def get_creator_rewards(
    creator_id: int,
    db: Session = Depends(get_db),
) -> CreatorRewardSummaryResponse:
    """
    Returns public reward summary metrics for a creator channel.
    """
    summary = get_creator_reward_summary(db=db, creator_id=creator_id)
    return CreatorRewardSummaryResponse(**summary)
