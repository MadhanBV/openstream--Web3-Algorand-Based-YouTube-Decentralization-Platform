from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserBase(BaseModel):
    """Base user schema containing shared user properties."""
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Unique username containing letters, numbers, underscores, or hyphens",
        examples=["creator_alice"],
    )
    display_name: str | None = Field(
        default=None,
        max_length=100,
        description="Public display name for channel/profile",
        examples=["Alice In Web3"],
    )
    email: str | None = Field(
        default=None,
        max_length=255,
        description="User email address",
        examples=["alice@openstream.io"],
    )
    bio: str | None = Field(
        default=None,
        max_length=1000,
        description="Short profile biography",
    )
    avatar_url: str | None = Field(
        default=None,
        max_length=500,
        description="Avatar image URL or IPFS gateway link",
    )
    banner_url: str | None = Field(
        default=None,
        max_length=500,
        description="Channel banner image URL",
    )


class UserResponse(UserBase):
    """
    Public safe user response schema.
    Never exposes hashed_password or sensitive internal flags.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Unique user ID")
    wallet_address: str | None = Field(
        default=None,
        description="Connected Algorand public wallet address (58-character Base32)",
    )
    is_creator: bool = Field(default=False, description="Creator status flag")
    is_admin: bool = Field(default=False, description="Administrator flag for payouts & campaigns")
    is_active: bool = Field(default=True, description="Account active status")
    created_at: datetime = Field(..., description="Account creation timestamp (UTC)")
    updated_at: datetime = Field(..., description="Last update timestamp (UTC)")


class WalletAssociateRequest(BaseModel):
    """
    Payload for associating an Algorand wallet address with an authenticated user profile.
    Enforces exact 58-character length, Base32 encoding, and Ed25519 checksum verification.
    """
    wallet_address: str = Field(
        ...,
        min_length=58,
        max_length=58,
        description="58-character Base32 Algorand public account address",
        examples=["ZCUBSI7KTNQLIAGL4LSWJ4Z3AAC45AODNCKLIVZJV66Z5RQOMZ3J5O2PNQ"],
    )

    @field_validator("wallet_address")
    @classmethod
    def validate_algorand_address(cls, v: str) -> str:
        trimmed = v.strip() if isinstance(v, str) else ""
        if len(trimmed) != 58:
            raise ValueError("Algorand address must be exactly 58 characters")
        
        try:
            from algosdk import encoding
            if not encoding.is_valid_address(trimmed):
                raise ValueError("Invalid Algorand address checksum or format")
        except ImportError:
            # Fallback regex if algosdk not available
            import re
            if not re.match(r"^[A-Z2-7]{58}$", trimmed):
                raise ValueError("Invalid Algorand Base32 address format")
        
        return trimmed

