from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.advertising import AdEvent
from app.models.reward import Reward, Settlement
from app.models.user import User
from app.models.video import Video
from app.models.view import View
from app.schemas.creator import (
    CreatorAnalyticsResponse,
    CreatorVideoItem,
    DailyMetricPoint,
    RevenueBreakdown,
    TopVideoMetric,
    WalletStatus,
)


def get_creator_analytics(
    db: Session,
    creator_id: int,
    days: int = 30,
) -> CreatorAnalyticsResponse:
    """
    Computes comprehensive creator studio analytics across videos, views, rewards, and ad revenue.
    """
    now = datetime.now(timezone.utc)
    start_time = now - timedelta(days=days)

    # 1. Fetch Creator and Videos
    creator = db.query(User).filter(User.id == creator_id).first()
    creator_videos = db.query(Video).filter(Video.creator_id == creator_id).all()
    video_ids = [v.id for v in creator_videos]

    total_videos = len(creator_videos)
    total_likes = sum(v.likes_count or 0 for v in creator_videos)

    # 2. Views Aggregation
    if video_ids:
        views_query = db.query(View).filter(View.video_id.in_(video_ids))
        total_views = views_query.count()
        total_qualified_views = views_query.filter(View.is_qualified.is_(True)).count()
        total_watch_seconds = (
            views_query.with_entities(func.coalesce(func.sum(View.watch_duration_seconds), 0)).scalar() or 0
        )
    else:
        total_views = 0
        total_qualified_views = 0
        total_watch_seconds = 0

    total_watch_hours = round(float(total_watch_seconds) / 3600.0, 2)
    avg_view_duration = round(float(total_watch_seconds) / float(total_views), 1) if total_views > 0 else 0.0

    # 3. Rewards & Monetization
    rewards = db.query(Reward).filter(Reward.creator_id == creator_id).all()
    total_earned_algo = sum(r.amount for r in rewards) if rewards else Decimal("0.000000")
    pending_rewards_algo = sum(r.amount for r in rewards if r.status == "accrued") if rewards else Decimal("0.000000")

    settlements = (
        db.query(Settlement)
        .filter(Settlement.creator_id == creator_id, Settlement.status == "confirmed")
        .all()
    )
    settled_algo = sum(s.amount for s in settlements) if settlements else Decimal("0.000000")

    # 4. Ad Revenue attribution (from video impressions)
    valid_ad_impressions = 0
    if video_ids:
        valid_ad_impressions = (
            db.query(AdEvent)
            .filter(
                AdEvent.video_id.in_(video_ids),
                AdEvent.event_type == "impression",
                AdEvent.is_valid.is_(True),
            )
            .count()
        )
    # Creator receives 70% of 1.5 ALGO CPM = 0.00105 ALGO per valid impression
    ad_revenue_algo = Decimal(str(round(valid_ad_impressions * 0.00105, 6)))

    revenue_breakdown = RevenueBreakdown(
        view_rewards_algo=total_earned_algo,
        ad_revenue_algo=ad_revenue_algo,
        tips_algo=Decimal("0.000000"),
        total_revenue_algo=total_earned_algo + ad_revenue_algo,
    )

    # 5. Top Performing Videos
    top_videos_list: list[TopVideoMetric] = []
    for vid in creator_videos:
        vid_views = db.query(View).filter(View.video_id == vid.id).count()
        vid_qual = db.query(View).filter(View.video_id == vid.id, View.is_qualified.is_(True)).count()
        vid_watch = (
            db.query(View)
            .filter(View.video_id == vid.id)
            .with_entities(func.coalesce(func.sum(View.watch_duration_seconds), 0))
            .scalar() or 0
        )
        vid_rewards = (
            db.query(Reward)
            .filter(Reward.video_id == vid.id)
            .with_entities(func.coalesce(func.sum(Reward.amount), 0))
            .scalar() or Decimal("0.000000")
        )

        top_videos_list.append(
            TopVideoMetric(
                id=vid.id,
                title=vid.title,
                thumbnail_cid=vid.thumbnail_cid,
                views=max(vid_views, vid.views_count or 0),
                qualified_views=vid_qual,
                watch_seconds=vid_watch,
                earned_algo=Decimal(str(vid_rewards)),
                likes=vid.likes_count or 0,
            )
        )

    # Sort top videos by views descending
    top_videos_list.sort(key=lambda x: (x.views, x.earned_algo), reverse=True)
    top_videos_list = top_videos_list[:5]

    # 6. Daily Timeseries Points (last N days)
    daily_trends: list[DailyMetricPoint] = []
    # Build dictionary of days
    day_map: dict[str, dict[str, Any]] = {}
    for i in range(days):
        d_str = (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        day_map[d_str] = {
            "views": 0,
            "qualified_views": 0,
            "watch_seconds": 0,
            "earned_algo": Decimal("0.000000"),
        }

    if video_ids:
        # Group views by date
        range_views = (
            db.query(
                func.date(View.created_at).label("view_date"),
                func.count(View.id).label("v_count"),
                func.sum(case((View.is_qualified.is_(True), 1), else_=0)).label("q_count"),
                func.sum(View.watch_duration_seconds).label("sec_count"),
            )
            .filter(View.video_id.in_(video_ids), View.created_at >= start_time)
            .group_by(func.date(View.created_at))
            .all()
        )
        for row in range_views:
            d_str = str(row.view_date)
            if d_str in day_map:
                day_map[d_str]["views"] = row.v_count or 0
                day_map[d_str]["qualified_views"] = row.q_count or 0
                day_map[d_str]["watch_seconds"] = row.sec_count or 0

        # Group rewards by date
        range_rewards = (
            db.query(
                func.date(Reward.created_at).label("reward_date"),
                func.sum(Reward.amount).label("amt_sum"),
            )
            .filter(Reward.creator_id == creator_id, Reward.created_at >= start_time)
            .group_by(func.date(Reward.created_at))
            .all()
        )
        for row in range_rewards:
            d_str = str(row.reward_date)
            if d_str in day_map:
                day_map[d_str]["earned_algo"] = Decimal(str(row.amt_sum or 0))

    for d_str, data in day_map.items():
        daily_trends.append(
            DailyMetricPoint(
                date=d_str,
                views=data["views"],
                qualified_views=data["qualified_views"],
                watch_seconds=data["watch_seconds"],
                earned_algo=data["earned_algo"],
            )
        )

    # 7. Wallet & Payout State
    wallet_address = creator.wallet_address if creator else None
    min_threshold = Decimal("1.000000")
    progress_pct = float(min(Decimal("100.0"), (pending_rewards_algo / min_threshold) * 100)) if min_threshold > 0 else 100.0

    wallet_status = WalletStatus(
        connected=bool(wallet_address),
        address=wallet_address,
        minimum_threshold_algo=min_threshold,
        progress_percent=round(progress_pct, 1),
    )

    return CreatorAnalyticsResponse(
        total_views=total_views,
        total_qualified_views=total_qualified_views,
        total_watch_seconds=total_watch_seconds,
        total_watch_hours=total_watch_hours,
        average_view_duration_seconds=avg_view_duration,
        total_likes=total_likes,
        total_videos=total_videos,
        total_earned_algo=total_earned_algo,
        pending_rewards_algo=pending_rewards_algo,
        settled_algo=settled_algo,
        top_videos=top_videos_list,
        daily_trends=daily_trends,
        revenue_breakdown=revenue_breakdown,
        wallet_status=wallet_status,
    )


def get_creator_videos_list(
    db: Session,
    creator_id: int,
    status_filter: str | None = None,
    visibility_filter: str | None = None,
    search_query: str | None = None,
) -> list[CreatorVideoItem]:
    """
    Returns full studio video asset listings for creator (including unlisted & drafts).
    """
    query = db.query(Video).filter(Video.creator_id == creator_id)

    if status_filter and status_filter != "all":
        query = query.filter(Video.status == status_filter)

    if visibility_filter and visibility_filter != "all":
        query = query.filter(Video.visibility == visibility_filter)

    if search_query and search_query.strip():
        term = f"%{search_query.strip()}%"
        query = query.filter(Video.title.ilike(term))

    videos = query.order_by(Video.created_at.desc()).all()

    items: list[CreatorVideoItem] = []
    for vid in videos:
        qual_count = db.query(View).filter(View.video_id == vid.id, View.is_qualified.is_(True)).count()
        earned = (
            db.query(Reward)
            .filter(Reward.video_id == vid.id)
            .with_entities(func.coalesce(func.sum(Reward.amount), 0))
            .scalar() or Decimal("0.000000")
        )

        items.append(
            CreatorVideoItem(
                id=vid.id,
                title=vid.title,
                description=vid.description,
                ipfs_cid=vid.ipfs_cid,
                thumbnail_cid=vid.thumbnail_cid,
                duration_seconds=vid.duration_seconds,
                views_count=vid.views_count or 0,
                qualified_views=qual_count,
                likes_count=vid.likes_count or 0,
                visibility=vid.visibility,
                status=vid.status,
                earned_algo=Decimal(str(earned)),
                playback_url=f"/api/v1/videos/{vid.id}/stream" if vid.ipfs_cid else None,
                created_at=vid.created_at,
                updated_at=vid.updated_at,
            )
        )

    return items
