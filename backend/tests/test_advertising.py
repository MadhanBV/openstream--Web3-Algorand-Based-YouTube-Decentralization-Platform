from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.advertising import AdCampaign, AdCreative, AdEvent
from app.models.user import User


@pytest.fixture
def test_advertiser(db_session: Session) -> User:
    user = User(
        username="sponsor_brand",
        email="brand@openstream.io",
        is_creator=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def advertiser_token(test_advertiser: User) -> str:
    return create_access_token(subject=test_advertiser.id)


def test_create_campaign_and_creatives(
    client: TestClient,
    advertiser_token: str,
):
    payload = {
        "title": "Decentralized Hosting Campaign",
        "budget_algo": "50.000000",
        "creatives": [
            {
                "title": "Next-Gen IPFS Banner",
                "headline": "Pin Videos Directly to IPFS Nodes",
                "body_text": "Enjoy ultra-fast dedicated gateway streaming with zero central point of failure.",
                "destination_url": "https://openstream.io/learn-ipfs",
                "placement_type": "banner_overlay",
            }
        ],
    }

    res = client.post(
        "/api/v1/ads/campaigns",
        headers={"Authorization": f"Bearer {advertiser_token}"},
        json=payload,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Decentralized Hosting Campaign"
    assert Decimal(str(data["budget_algo"])) == Decimal("50.000000")
    assert len(data["creatives"]) == 1
    assert data["creatives"][0]["headline"] == "Pin Videos Directly to IPFS Nodes"


def test_serve_ad_returns_creative_and_event_token(
    client: TestClient,
    db_session: Session,
    test_advertiser: User,
):
    campaign = AdCampaign(
        advertiser_id=test_advertiser.id,
        title="Active Sponsor Promo",
        budget_algo=Decimal("20.000000"),
        spent_algo=Decimal("0.000000"),
        status="active",
    )
    db_session.add(campaign)
    db_session.flush()

    creative = AdCreative(
        campaign_id=campaign.id,
        title="Web3 Algorand Wallet Promo",
        headline="Connect Pera Wallet in Seconds",
        body_text="Claim verified creator rewards directly on Algorand TestNet.",
        destination_url="https://perawallet.app",
        placement_type="banner_overlay",
        is_active=True,
    )
    db_session.add(creative)
    db_session.commit()

    res = client.get("/api/v1/ads/serve?placement=banner_overlay")
    assert res.status_code == 200
    data = res.json()
    assert data is not None
    assert data["headline"] == "Connect Pera Wallet in Seconds"
    assert "event_token" in data
    assert data["sponsored_label"] == "Sponsored Prototype Ad"

    # Verify serve event was logged
    serve_events = db_session.query(AdEvent).filter(AdEvent.event_type == "serve").count()
    assert serve_events >= 1


def test_record_impression_success_and_deduplication(
    client: TestClient,
    db_session: Session,
    test_advertiser: User,
):
    campaign = AdCampaign(
        advertiser_id=test_advertiser.id,
        title="Impression Tracking Campaign",
        budget_algo=Decimal("10.000000"),
        spent_algo=Decimal("0.000000"),
        status="active",
    )
    db_session.add(campaign)
    db_session.flush()

    creative = AdCreative(
        campaign_id=campaign.id,
        title="Edge Cache Promo",
        headline="Accelerated Video Delivery",
        body_text="Stream smoothly worldwide.",
        destination_url="https://openstream.io/cache",
        placement_type="banner_overlay",
        is_active=True,
    )
    db_session.add(creative)
    db_session.commit()

    # 1. Serve ad to obtain valid token
    serve_res = client.get("/api/v1/ads/serve?placement=banner_overlay")
    token = serve_res.json()["event_token"]

    # 2. Record first impression
    imp_res1 = client.post(
        "/api/v1/ads/impression",
        json={"event_token": token, "viewport_duration_ms": 1200},
    )
    assert imp_res1.status_code == 200
    assert imp_res1.json()["recorded"] is True
    assert imp_res1.json()["duplicate"] is False

    # 3. Record duplicate impression with same token
    imp_res2 = client.post(
        "/api/v1/ads/impression",
        json={"event_token": token, "viewport_duration_ms": 1200},
    )
    assert imp_res2.status_code == 200
    assert imp_res2.json()["duplicate"] is True

    # Verify campaign spend accrued
    db_session.refresh(campaign)
    assert campaign.spent_algo > Decimal("0.000000")


def test_record_click_flow_and_campaign_reporting(
    client: TestClient,
    db_session: Session,
    test_advertiser: User,
    advertiser_token: str,
):
    campaign = AdCampaign(
        advertiser_id=test_advertiser.id,
        title="Analytics Test Campaign",
        budget_algo=Decimal("25.000000"),
        spent_algo=Decimal("0.000000"),
        status="active",
    )
    db_session.add(campaign)
    db_session.flush()

    creative = AdCreative(
        campaign_id=campaign.id,
        title="Creator Monitization Hub",
        headline="Earn 0.05 ALGO per Qualified View",
        body_text="Transparent creator accounting on PostgreSQL and Algorand.",
        destination_url="https://openstream.io/monetize",
        placement_type="sidebar_card",
        is_active=True,
    )
    db_session.add(creative)
    db_session.commit()

    # 1. Serve
    serve_res = client.get("/api/v1/ads/serve?placement=sidebar_card")
    token = serve_res.json()["event_token"]

    # 2. Impression
    client.post(
        "/api/v1/ads/impression",
        json={"event_token": token, "viewport_duration_ms": 1000},
    )

    # 3. Click
    click_res = client.post(
        "/api/v1/ads/click",
        json={"event_token": token},
    )
    assert click_res.status_code == 200
    click_data = click_res.json()
    assert click_data["destination_url"] == "https://openstream.io/monetize"
    assert click_data["recorded"] is True

    # 4. Check Campaign Performance Report
    report_res = client.get(
        f"/api/v1/ads/campaigns/{campaign.id}/report",
        headers={"Authorization": f"Bearer {advertiser_token}"},
    )
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["campaign_id"] == campaign.id
    assert report["valid_impressions_count"] == 1
    assert report["valid_clicks_count"] == 1
    assert report["ctr_percent"] == 100.0
    assert Decimal(str(report["spent_algo"])) > Decimal("0.000000")
