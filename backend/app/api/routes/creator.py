from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.creator import CreatorAnalyticsResponse, CreatorVideoItem
from app.services.creator_studio import get_creator_analytics, get_creator_videos_list
from app.services.reward_engine import calculate_pending_rewards
from app.services.settlement_service import execute_settlement_batch

router = APIRouter(prefix="/creator", tags=["Creator Studio"])


@router.get(
    "/analytics",
    response_model=CreatorAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get comprehensive Creator Studio analytics",
    description="Returns views, watch duration, audience retention, revenue breakdown, and daily trends for the authenticated creator.",
)
def get_analytics(
    days: int = Query(30, ge=1, le=365, description="Historical timeseries window in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CreatorAnalyticsResponse:
    """
    Returns verified creator metrics, revenue sources, and daily trends.
    """
    return get_creator_analytics(db=db, creator_id=current_user.id, days=days)


@router.get(
    "/videos",
    response_model=list[CreatorVideoItem],
    status_code=status.HTTP_200_OK,
    summary="List all creator studio videos",
    description="Returns full video asset inventory owned by the authenticated creator, including drafts, unlisted, and private media.",
)
def get_my_videos(
    status_filter: str | None = Query(None, alias="status", description="Filter by status (all, ready, draft, processing)"),
    visibility_filter: str | None = Query(None, alias="visibility", description="Filter by visibility (all, public, unlisted, private)"),
    search: str | None = Query(None, description="Search query by title"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[CreatorVideoItem]:
    """
    Returns full studio video inventory for the authenticated creator.
    """
    return get_creator_videos_list(
        db=db,
        creator_id=current_user.id,
        status_filter=status_filter,
        visibility_filter=visibility_filter,
        search_query=search,
    )


@router.post(
    "/request-settlement",
    status_code=status.HTTP_200_OK,
    summary="Request Algorand blockchain settlement payout",
    description="Initiates on-chain settlement for accrued creator rewards when pending balance meets the payout threshold.",
)
def request_settlement(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Allows a creator to trigger an on-chain settlement payout of their pending rewards.
    Verifies that the creator has a linked Algorand TestNet address and pending balance >= 1.0 ALGO.
    """
    if not current_user.wallet_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Algorand wallet address linked to creator profile. Connect Pera Wallet first.",
        )

    # First trigger accrual to ensure all recent qualified views are locked
    calculate_pending_rewards(db=db, creator_id=current_user.id)

    # Execute batch settlement
    try:
        result = execute_settlement_batch(
            db=db,
            admin_user=current_user,
            creator_id=current_user.id,
            note=f"Creator Studio payout request for {current_user.username}",
        )
        return {
            "success": True,
            "message": "Settlement initiated successfully on Algorand TestNet.",
            "settlement": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Payout execution failed: {str(e)}")
