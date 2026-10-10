from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.video import Video


class AdCampaign(Base):
    """
    Advertiser campaign entity managing prototype sponsorship budgets and scheduling.
    Kept strictly independent of creator view reward accounting.
    """
    __tablename__ = "ad_campaigns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    advertiser_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True, nullable=False)
    budget_algo: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("100.000000"), nullable=False)
    spent_algo: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("0.000000"), nullable=False)

    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    advertiser: Mapped["User"] = relationship("User", back_populates="ad_campaigns")
    creatives: Mapped[list["AdCreative"]] = relationship(
        "AdCreative",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )
    events: Mapped[list["AdEvent"]] = relationship(
        "AdEvent",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'active', 'paused', 'completed')",
            name="chk_ad_campaign_status",
        ),
        CheckConstraint("budget_algo >= 0", name="chk_ad_campaign_budget_non_negative"),
        CheckConstraint("spent_algo >= 0", name="chk_ad_campaign_spent_non_negative"),
    )

    def __repr__(self) -> str:
        return f"<AdCampaign(id={self.id}, title='{self.title}', status='{self.status}')>"


class AdCreative(Base):
    """
    Individual ad format and copy associated with an active campaign.
    """
    __tablename__ = "ad_creatives"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    campaign_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ad_campaigns.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    headline: Mapped[str] = mapped_column(String(255), nullable=False)
    body_text: Mapped[str] = mapped_column(Text, nullable=False)
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    destination_url: Mapped[str] = mapped_column(String(500), nullable=False)
    placement_type: Mapped[str] = mapped_column(
        String(30),
        default="banner_overlay",
        index=True,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    campaign: Mapped["AdCampaign"] = relationship("AdCampaign", back_populates="creatives")
    events: Mapped[list["AdEvent"]] = relationship(
        "AdEvent",
        back_populates="creative",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "placement_type IN ('banner_overlay', 'sidebar_card', 'feed_card', 'preroll_notice')",
            name="chk_ad_creative_placement_type",
        ),
    )

    def __repr__(self) -> str:
        return f"<AdCreative(id={self.id}, title='{self.title}', placement='{self.placement_type}')>"


class AdEvent(Base):
    """
    Server-verified advertising engagement event.
    Distinguishes serve, valid impression, and click events with anti-abuse deduplication.
    """
    __tablename__ = "ad_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    creative_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ad_creatives.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    campaign_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("ad_campaigns.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    video_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("videos.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    client_ip_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    campaign: Mapped["AdCampaign"] = relationship("AdCampaign", back_populates="events")
    creative: Mapped["AdCreative"] = relationship("AdCreative", back_populates="events")

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('serve', 'impression', 'click')",
            name="chk_ad_event_type",
        ),
        UniqueConstraint("event_id", "event_type", name="uq_ad_events_event_id_type"),
    )

    def __repr__(self) -> str:
        return f"<AdEvent(id={self.id}, type='{self.event_type}', event_id='{self.event_id}', valid={self.is_valid})>"
