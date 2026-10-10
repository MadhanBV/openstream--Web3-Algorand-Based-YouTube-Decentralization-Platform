from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, HttpUrl


class AdCreativeCreate(BaseModel):
    title: str = Field(..., max_length=150)
    headline: str = Field(..., max_length=255)
    body_text: str
    media_url: Optional[str] = Field(None, max_length=500)
    destination_url: str = Field(..., max_length=500)
    placement_type: str = Field("banner_overlay", description="'banner_overlay', 'sidebar_card', 'feed_card'")


class AdCreativeResponse(BaseModel):
    id: int
    campaign_id: int
    title: str
    headline: str
    body_text: str
    media_url: Optional[str] = None
    destination_url: str
    placement_type: str
    is_active: bool
    created_at: datetime


class AdCampaignCreate(BaseModel):
    title: str = Field(..., max_length=150)
    budget_algo: Decimal = Field(Decimal("100.000000"), ge=Decimal("1.000000"))
    creatives: list[AdCreativeCreate] = Field(default_factory=list)


class AdCampaignResponse(BaseModel):
    id: int
    advertiser_id: int
    title: str
    status: str
    budget_algo: Decimal
    spent_algo: Decimal
    start_date: datetime
    end_date: Optional[datetime] = None
    created_at: datetime
    creatives: list[AdCreativeResponse] = Field(default_factory=list)


class AdServeResponse(BaseModel):
    creative_id: int
    campaign_id: int
    title: str
    headline: str
    body_text: str
    media_url: Optional[str] = None
    destination_url: str
    placement_type: str
    event_token: str
    sponsored_label: str = "Sponsored Prototype Ad"


class AdImpressionRequest(BaseModel):
    event_token: str
    viewport_duration_ms: int = Field(default=1000, ge=500, description="Milliseconds ad was continuously in viewer viewport")


class AdClickRequest(BaseModel):
    event_token: str


class AdClickResponse(BaseModel):
    destination_url: str
    recorded: bool


class AdCampaignReportResponse(BaseModel):
    campaign_id: int
    campaign_title: str
    status: str
    budget_algo: Decimal
    spent_algo: Decimal
    serves_count: int
    valid_impressions_count: int
    valid_clicks_count: int
    ctr_percent: float
