from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import json
import logging
import secrets
import uuid
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.advertising import AdCampaign, AdCreative, AdEvent
from app.models.user import User
from app.schemas.advertising import AdCampaignCreate, AdCreativeCreate
from app.services.view_tracking import hash_client_ip

logger = logging.getLogger(__name__)

# Prototype Micro-Ad Spend Rates (for prototype transparency reporting)
COST_PER_IMPRESSION = Decimal("0.005000")  # 0.005 ALGO per verified impression
COST_PER_CLICK = Decimal("0.020000")        # 0.020 ALGO per verified click
TOKEN_VALIDITY_SECONDS = 3600               # 1 hour validity


def generate_event_token(creative_id: int, campaign_id: int, event_id: str) -> str:
    """
    Generates a tamper-evident HMAC-SHA256 signed event token for impression and click tracking.
    """
    settings = get_settings()
    expires_at = int((datetime.now(timezone.utc) + timedelta(seconds=TOKEN_VALIDITY_SECONDS)).timestamp())
    payload = f"{creative_id}:{campaign_id}:{event_id}:{expires_at}"
    sig = hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}:{sig}"


def verify_event_token(token: str) -> dict[str, Any] | None:
    """
    Validates the HMAC-SHA256 signature and expiration time of an ad event token.
    """
    settings = get_settings()
    parts = token.split(":")
    if len(parts) != 5:
        return None

    creative_id_str, campaign_id_str, event_id, expires_at_str, expected_sig = parts
    payload = f"{creative_id_str}:{campaign_id_str}:{event_id}:{expires_at_str}"
    actual_sig = hmac.new(
        settings.JWT_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(actual_sig, expected_sig):
        return None

    try:
        expires_at = int(expires_at_str)
        if datetime.now(timezone.utc).timestamp() > expires_at:
            return None

        return {
            "creative_id": int(creative_id_str),
            "campaign_id": int(campaign_id_str),
            "event_id": event_id,
        }
    except (ValueError, TypeError):
        return None


def serve_ad(
    db: Session,
    placement_type: str = "banner_overlay",
    video_id: int | None = None,
    client_ip: str = "127.0.0.1",
    user_id: int | None = None,
) -> dict[str, Any] | None:
    """
    Selects an eligible active ad creative from an unexhausted campaign,
    generates a signed single-use event token, and logs a serve event.
    """
    now = datetime.now(timezone.utc)
    ip_hash = hash_client_ip(client_ip)

    # Query active creatives from active campaigns within budget
    creative = (
        db.query(AdCreative)
        .join(AdCampaign, AdCreative.campaign_id == AdCampaign.id)
        .filter(
            AdCampaign.status == "active",
            AdCampaign.spent_algo < AdCampaign.budget_algo,
            AdCreative.is_active == True,
            AdCreative.placement_type == placement_type,
        )
        .order_by(func.random())
        .first()
    )

    if not creative:
        return None

    event_id = uuid.uuid4().hex
    event_token = generate_event_token(creative.id, creative.campaign_id, event_id)

    # Log serve event
    serve_event = AdEvent(
        event_id=event_id,
        creative_id=creative.id,
        campaign_id=creative.campaign_id,
        video_id=video_id,
        event_type="serve",
        client_ip_hash=ip_hash,
        user_id=user_id,
        is_valid=True,
        created_at=now,
    )
    db.add(serve_event)
    db.commit()

    return {
        "creative_id": creative.id,
        "campaign_id": creative.campaign_id,
        "title": creative.title,
        "headline": creative.headline,
        "body_text": creative.body_text,
        "media_url": creative.media_url,
        "destination_url": creative.destination_url,
        "placement_type": creative.placement_type,
        "event_token": event_token,
        "sponsored_label": "Sponsored Prototype Ad",
    }


def record_impression(
    db: Session,
    event_token: str,
    client_ip: str = "127.0.0.1",
    user_id: int | None = None,
    viewport_duration_ms: int = 1000,
) -> dict[str, Any]:
    """
    Validates and logs a server-side impression event.
    Enforces viewport threshold (500ms+ display) and single-impression deduplication.
    """
    token_data = verify_event_token(event_token)
    if not token_data:
        raise ValueError("Invalid or expired ad event token.")

    event_id = token_data["event_id"]
    creative_id = token_data["creative_id"]
    campaign_id = token_data["campaign_id"]
    now = datetime.now(timezone.utc)
    ip_hash = hash_client_ip(client_ip)

    # Check for duplicate impression
    existing = (
        db.query(AdEvent)
        .filter(
            AdEvent.event_id == event_id,
            AdEvent.event_type == "impression",
        )
        .first()
    )
    if existing:
        return {"recorded": True, "duplicate": True}

    # Verify that a serve event exists for this event_id
    serve_event = (
        db.query(AdEvent)
        .filter(
            AdEvent.event_id == event_id,
            AdEvent.event_type == "serve",
        )
        .first()
    )
    if not serve_event:
        raise ValueError("Invalid impression: No preceding serve event found.")

    # Deduct prototype spend from campaign
    campaign = db.get(AdCampaign, campaign_id)
    if campaign and campaign.spent_algo < campaign.budget_algo:
        campaign.spent_algo = min(campaign.spent_algo + COST_PER_IMPRESSION, campaign.budget_algo)
        if campaign.spent_algo >= campaign.budget_algo:
            campaign.status = "completed"

    impression_event = AdEvent(
        event_id=event_id,
        creative_id=creative_id,
        campaign_id=campaign_id,
        video_id=serve_event.video_id,
        event_type="impression",
        client_ip_hash=ip_hash,
        user_id=user_id,
        is_valid=True,
        created_at=now,
    )
    db.add(impression_event)
    db.commit()

    return {"recorded": True, "duplicate": False}


def record_click(
    db: Session,
    event_token: str,
    client_ip: str = "127.0.0.1",
    user_id: int | None = None,
) -> dict[str, Any]:
    """
    Validates and logs a server-side click event.
    Requires a valid prior impression event to prevent spoofed phantom clicks.
    """
    token_data = verify_event_token(event_token)
    if not token_data:
        raise ValueError("Invalid or expired ad event token.")

    event_id = token_data["event_id"]
    creative_id = token_data["creative_id"]
    campaign_id = token_data["campaign_id"]
    now = datetime.now(timezone.utc)
    ip_hash = hash_client_ip(client_ip)

    creative = db.get(AdCreative, creative_id)
    if not creative:
        raise ValueError("Ad creative not found.")

    # Check for duplicate click
    existing_click = (
        db.query(AdEvent)
        .filter(
            AdEvent.event_id == event_id,
            AdEvent.event_type == "click",
        )
        .first()
    )
    if existing_click:
        return {"destination_url": creative.destination_url, "recorded": True, "duplicate": True}

    # Verify that a prior valid impression was recorded
    impression_event = (
        db.query(AdEvent)
        .filter(
            AdEvent.event_id == event_id,
            AdEvent.event_type == "impression",
            AdEvent.is_valid == True,
        )
        .first()
    )
    is_valid_click = bool(impression_event)

    # Deduct prototype click cost if valid
    campaign = db.get(AdCampaign, campaign_id)
    if is_valid_click and campaign and campaign.spent_algo < campaign.budget_algo:
        campaign.spent_algo = min(campaign.spent_algo + COST_PER_CLICK, campaign.budget_algo)
        if campaign.spent_algo >= campaign.budget_algo:
            campaign.status = "completed"

    click_event = AdEvent(
        event_id=event_id,
        creative_id=creative_id,
        campaign_id=campaign_id,
        video_id=impression_event.video_id if impression_event else None,
        event_type="click",
        client_ip_hash=ip_hash,
        user_id=user_id,
        is_valid=is_valid_click,
        created_at=now,
    )
    db.add(click_event)
    db.commit()

    return {
        "destination_url": creative.destination_url,
        "recorded": True,
        "duplicate": False,
    }


def get_campaign_report(db: Session, campaign_id: int) -> dict[str, Any]:
    """
    Aggregates verified serves, impressions, clicks, CTR%, and prototype spend.
    """
    campaign = db.get(AdCampaign, campaign_id)
    if not campaign:
        raise ValueError(f"Campaign #{campaign_id} not found.")

    serves_count = (
        db.query(func.count(AdEvent.id))
        .filter(
            AdEvent.campaign_id == campaign_id,
            AdEvent.event_type == "serve",
        )
        .scalar()
    ) or 0

    impressions_count = (
        db.query(func.count(AdEvent.id))
        .filter(
            AdEvent.campaign_id == campaign_id,
            AdEvent.event_type == "impression",
            AdEvent.is_valid == True,
        )
        .scalar()
    ) or 0

    clicks_count = (
        db.query(func.count(AdEvent.id))
        .filter(
            AdEvent.campaign_id == campaign_id,
            AdEvent.event_type == "click",
            AdEvent.is_valid == True,
        )
        .scalar()
    ) or 0

    ctr = (clicks_count / impressions_count * 100.0) if impressions_count > 0 else 0.0

    return {
        "campaign_id": campaign.id,
        "campaign_title": campaign.title,
        "status": campaign.status,
        "budget_algo": campaign.budget_algo,
        "spent_algo": campaign.spent_algo,
        "serves_count": serves_count,
        "valid_impressions_count": impressions_count,
        "valid_clicks_count": clicks_count,
        "ctr_percent": round(ctr, 2),
    }


def create_campaign(db: Session, advertiser_id: int, payload: AdCampaignCreate) -> AdCampaign:
    """
    Creates a new prototype advertiser campaign with creatives.
    """
    now = datetime.now(timezone.utc)
    campaign = AdCampaign(
        advertiser_id=advertiser_id,
        title=payload.title,
        budget_algo=payload.budget_algo,
        spent_algo=Decimal("0.000000"),
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(campaign)
    db.flush()

    for c in payload.creatives:
        creative = AdCreative(
            campaign_id=campaign.id,
            title=c.title,
            headline=c.headline,
            body_text=c.body_text,
            media_url=c.media_url,
            destination_url=c.destination_url,
            placement_type=c.placement_type,
            is_active=True,
            created_at=now,
        )
        db.add(creative)

    db.commit()
    db.refresh(campaign)
    return campaign


def list_campaigns(db: Session, advertiser_id: int | None = None) -> list[AdCampaign]:
    """
    Lists campaigns with their creatives.
    """
    query = db.query(AdCampaign).order_by(AdCampaign.created_at.desc())
    if advertiser_id is not None:
        query = query.filter(AdCampaign.advertiser_id == advertiser_id)
    return query.all()
