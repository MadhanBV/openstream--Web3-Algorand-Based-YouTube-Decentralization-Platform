from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.video import Video
    from app.models.view import View



class Settlement(Base):
    """
    On-chain blockchain settlement record for creator reward payouts.
    Records Algorand testnet transaction hashes, confirmation rounds, fees, and audit history.
    """
    __tablename__ = "settlements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    creator_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    wallet_address: Mapped[str] = mapped_column(String(58), index=True, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    network: Mapped[str] = mapped_column(String(30), default="testnet", nullable=False)
    transaction_id: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True, nullable=False)
    confirmed_round: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    tx_fee_microalgos: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="settlements")
    rewards: Mapped[list["Reward"]] = relationship("Reward", back_populates="settlement")

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_settlement_amount_positive"),
        CheckConstraint(
            "status IN ('pending', 'processing', 'submitted', 'confirmed', 'failed')",
            name="chk_settlement_status_valid",
        ),
    )

    def __repr__(self) -> str:
        return f"<Settlement(id={self.id}, creator_id={self.creator_id}, amount={self.amount}, tx={self.transaction_id})>"


class Reward(Base):
    """
    Creator reward accrual ledger.
    Aggregates verified views and calculates reward amounts ready for batch settlement.
    """
    __tablename__ = "rewards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    creator_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    video_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("videos.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=Decimal("0.000000"), nullable=False)
    views_credited: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="accrued", index=True, nullable=False)
    settlement_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("settlements.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    settled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="rewards")
    video: Mapped["Video | None"] = relationship("Video", back_populates="rewards")
    settlement: Mapped["Settlement | None"] = relationship("Settlement", back_populates="rewards")
    views: Mapped[list["View"]] = relationship("View", back_populates="reward")


    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_reward_amount_non_negative"),
        CheckConstraint("views_credited >= 0", name="chk_reward_views_non_negative"),
    )

    def __repr__(self) -> str:
        return f"<Reward(id={self.id}, creator_id={self.creator_id}, amount={self.amount}, status='{self.status}')>"
