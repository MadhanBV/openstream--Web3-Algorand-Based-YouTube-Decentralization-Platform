from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.view import View
    from app.models.interaction import Like, Comment
    from app.models.reward import Reward


class Video(Base):
    """
    Video metadata entity.
    Stores metadata and IPFS CID references for decentralized video storage.
    Note: Raw video binary files are NEVER stored in this database.
    """
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    creator_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ipfs_cid: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    thumbnail_cid: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    likes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    visibility: Mapped[str] = mapped_column(String(20), default="public", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)

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
    creator: Mapped["User"] = relationship("User", back_populates="videos")
    views: Mapped[list["View"]] = relationship(
        "View",
        back_populates="video",
        cascade="all, delete-orphan",
    )
    likes: Mapped[list["Like"]] = relationship(
        "Like",
        back_populates="video",
        cascade="all, delete-orphan",
    )
    comments: Mapped[list["Comment"]] = relationship(
        "Comment",
        back_populates="video",
        cascade="all, delete-orphan",
    )
    rewards: Mapped[list["Reward"]] = relationship(
        "Reward",
        back_populates="video",
    )

    __table_args__ = (
        CheckConstraint("duration_seconds >= 0", name="chk_video_duration_non_negative"),
        CheckConstraint("views_count >= 0", name="chk_video_views_non_negative"),
        CheckConstraint("likes_count >= 0", name="chk_video_likes_non_negative"),
        Index("ix_videos_status_visibility", "status", "visibility"),
    )

    def __repr__(self) -> str:
        return f"<Video(id={self.id}, title='{self.title[:30]}', cid='{self.ipfs_cid}')>"
