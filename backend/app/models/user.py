from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.video import Video
    from app.models.view import View
    from app.models.interaction import Like, Comment
    from app.models.reward import Reward, Settlement
    from app.models.advertising import AdCampaign


class User(Base):
    """
    User entity representing viewers, creators, and platform participants.
    Stores user profile metadata, hashed password for Web2 authentication,
    and connected Algorand public wallet references.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    wallet_address: Mapped[str | None] = mapped_column(String(58), unique=True, index=True, nullable=True)
    is_creator: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

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
    videos: Mapped[list["Video"]] = relationship(
        "Video",
        back_populates="creator",
        cascade="all, delete-orphan",
    )
    views: Mapped[list["View"]] = relationship(
        "View",
        back_populates="user",
    )
    likes: Mapped[list["Like"]] = relationship(
        "Like",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    rewards: Mapped[list["Reward"]] = relationship(
        "Reward",
        back_populates="creator",
        cascade="all, delete-orphan",
    )
    settlements: Mapped[list["Settlement"]] = relationship(
        "Settlement",
        back_populates="creator",
        cascade="all, delete-orphan",
    )
    ad_campaigns: Mapped[list["AdCampaign"]] = relationship(
        "AdCampaign",
        back_populates="advertiser",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', wallet='{self.wallet_address}')>"
