from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AuthChallenge(Base):
    """
    Cryptographic challenge entity for Web3 wallet authentication.
    Stores single-use nonce, challenge text, expiration, and consumption status.
    """
    __tablename__ = "auth_challenges"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    wallet_address: Mapped[str] = mapped_column(String(58), index=True, nullable=False)
    nonce: Mapped[str] = mapped_column(String(64), nullable=False)
    challenge_text: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    chain_id: Mapped[int] = mapped_column(Integer, default=416002, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AuthChallenge(id='{self.id}', wallet='{self.wallet_address}', used={self.is_used})>"
