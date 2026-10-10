from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.video import Video
    from app.models.reward import Reward


class View(Base):
    """
    Video view engagement entity.
    Tracks view events, watch duration, and validation state for reward eligibility.
    Supports both registered users and anonymous guest viewer sessions.
    """
    __tablename__ = "video_views"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    video_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("videos.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    watch_duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    is_qualified: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    session_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    client_ip_hash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Reward attribution linkage for strict idempotency
    reward_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("rewards.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    rewarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    video: Mapped["Video"] = relationship("Video", back_populates="views")
    user: Mapped["User | None"] = relationship("User", back_populates="views")
    reward: Mapped["Reward | None"] = relationship("Reward", back_populates="views")

    __table_args__ = (
        CheckConstraint("watch_duration_seconds >= 0", name="chk_view_duration_non_negative"),
        Index("ix_video_views_video_created", "video_id", "created_at"),
        Index("ix_video_views_qualification", "video_id", "is_qualified", "reward_id"),
    )

    def __repr__(self) -> str:
        return f"<View(id={self.id}, video_id={self.video_id}, user_id={self.user_id}, qualified={self.is_qualified})>"

