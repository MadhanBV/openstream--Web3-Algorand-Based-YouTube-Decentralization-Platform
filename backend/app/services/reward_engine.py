from datetime import datetime, timezone
from decimal import Decimal
import logging
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.reward import Reward
from app.models.user import User
from app.models.video import Video
from app.models.view import View

logger = logging.getLogger(__name__)

# Configurable Prototype Reward Formula
# 1 qualified view = 0.05 ALGO (50,000 microALGO)
DEFAULT_REWARD_PER_VIEW = Decimal("0.050000")


def calculate_pending_rewards(
    db: Session,
    creator_id: int | None = None,
    reward_rate: Decimal = DEFAULT_REWARD_PER_VIEW,
) -> dict:
    """
    Executes an idempotent reward calculation batch for uncredited qualified views.

    Guarantees:
    1. Only views with `is_qualified == True` and `reward_id IS NULL` are eligible.
    2. Creator self-views are strictly excluded from reward generation.
    3. All processed views are atomically linked to the newly created Reward record,
       guaranteeing zero duplicate payouts if retried.
    4. Exact Decimal arithmetic is used for financial accounting.
    """
    now = datetime.now(timezone.utc)

    # 1. Query uncredited qualified views joined with their video
    query = (
        db.query(View, Video.creator_id)
        .join(Video, View.video_id == Video.id)
        .filter(
            View.is_qualified == True,
            View.reward_id == None,
        )
    )

    if creator_id is not None:
        query = query.filter(Video.creator_id == creator_id)

    # Exclude creator self-views from reward accrual
    uncredited_views = [
        (v, c_id) for v, c_id in query.all()
        if v.user_id is None or v.user_id != c_id
    ]

    if not uncredited_views:
        return {
            "rewards_created": 0,
            "total_amount": Decimal("0.000000"),
            "total_views_credited": 0,
            "message": "No new uncredited qualified views found.",
        }

    # 2. Group uncredited views by (creator_id, video_id)
    grouped: dict[tuple[int, int], list[View]] = {}
    for view, c_id in uncredited_views:
        key = (c_id, view.video_id)
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(view)

    rewards_created = 0
    total_amount = Decimal("0.000000")
    total_views_credited = 0

    # 3. Create Reward records and link views atomically
    for (c_id, v_id), views_list in grouped.items():
        count = len(views_list)
        amount = Decimal(count) * reward_rate

        reward = Reward(
            creator_id=c_id,
            video_id=v_id,
            amount=amount,
            views_credited=count,
            status="pending",
            created_at=now,
        )
        db.add(reward)
        db.flush()  # Flush to generate reward.id

        # Atomically link views to this reward
        for v in views_list:
            v.reward_id = reward.id
            v.rewarded_at = now

        rewards_created += 1
        total_amount += amount
        total_views_credited += count

    db.commit()

    logger.info(
        f"Reward batch completed: {rewards_created} records created, "
        f"{total_amount} ALGO accrued for {total_views_credited} qualified views."
    )

    return {
        "rewards_created": rewards_created,
        "total_amount": total_amount,
        "total_views_credited": total_views_credited,
        "message": f"Successfully calculated {rewards_created} reward entries totaling {total_amount:.6f} ALGO.",
    }


def get_creator_reward_summary(db: Session, creator_id: int) -> dict:
    """
    Computes creator rewards summary, pending balance, and recent accrual history.
    """
    creator = db.query(User).filter(User.id == creator_id).first()
    wallet_address = creator.wallet_address if creator else None

    # Lifetime rewards
    total_earned = (
        db.query(func.coalesce(func.sum(Reward.amount), 0))
        .filter(Reward.creator_id == creator_id)
        .scalar()
    ) or Decimal("0.000000")

    # Pending rewards (unsettled)
    pending_rewards = (
        db.query(func.coalesce(func.sum(Reward.amount), 0))
        .filter(
            Reward.creator_id == creator_id,
            Reward.status.in_(("pending", "accrued")),
        )
        .scalar()
    ) or Decimal("0.000000")

    # Settled rewards
    settled_rewards = (
        db.query(func.coalesce(func.sum(Reward.amount), 0))
        .filter(
            Reward.creator_id == creator_id,
            Reward.status == "settled",
        )
        .scalar()
    ) or Decimal("0.000000")

    # Total qualified views on creator's videos
    total_views = (
        db.query(func.count(View.id))
        .join(Video, View.video_id == Video.id)
        .filter(
            Video.creator_id == creator_id,
            View.is_qualified == True,
        )
        .scalar()
    ) or 0

    # Recent reward records
    recent_rewards = (
        db.query(Reward)
        .filter(Reward.creator_id == creator_id)
        .order_by(Reward.created_at.desc())
        .limit(50)
        .all()
    )

    return {
        "creator_id": creator_id,
        "wallet_address": wallet_address,
        "total_earned_algo": Decimal(str(total_earned)),
        "pending_rewards_algo": Decimal(str(pending_rewards)),
        "settled_rewards_algo": Decimal(str(settled_rewards)),
        "total_qualified_views": total_views,
        "rewards": recent_rewards,
    }
