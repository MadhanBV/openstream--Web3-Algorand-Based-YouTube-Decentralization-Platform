from pydantic import BaseModel, EmailStr, Field, field_validator
from app.schemas.user import UserResponse


class UserRegisterRequest(BaseModel):
    """
    Registration request payload for new account creation.
    """
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Unique username containing letters, numbers, underscores, or hyphens",
        examples=["creator_bob"],
    )
    email: EmailStr = Field(
        ...,
        description="Valid email address for account identity",
        examples=["bob@openstream.io"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Account password (minimum 8 characters)",
        examples=["StrongP@ssw0rd!"],
    )
    display_name: str | None = Field(
        default=None,
        max_length=100,
        description="Optional display name",
        examples=["Bob The Creator"],
    )
    bio: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional short bio",
    )
    is_creator: bool = Field(
        default=False,
        description="Optional flag to initialize creator studio privileges",
    )

    @field_validator("username", mode="before")
    @classmethod
    def clean_username(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class LoginRequest(BaseModel):
    """
    Login request payload accepting either username or email as identifier.
    """
    username_or_email: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Login identifier: username or email address",
        examples=["creator_bob"],
    )
    password: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Account password",
        examples=["StrongP@ssw0rd!"],
    )

    @field_validator("username_or_email", mode="before")
    @classmethod
    def clean_identifier(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v


class TokenResponse(BaseModel):
    """
    JWT token payload returned upon successful authentication.
    """
    access_token: str = Field(..., description="Signed JWT Bearer access token")
    token_type: str = Field(default="bearer", description="Token type (always 'bearer')")
    expires_in: int = Field(..., description="Token lifespan in seconds")
    user: UserResponse = Field(..., description="Authenticated user profile")


class MessageResponse(BaseModel):
    """Generic status/message response schema."""
    message: str = Field(..., examples=["Logged out successfully"])


class WalletChallengeRequest(BaseModel):
    """
    Request payload to generate a short-lived wallet authentication challenge.
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
            import re
            if not re.match(r"^[A-Z2-7]{58}$", trimmed):
                raise ValueError("Invalid Algorand Base32 address format")
        return trimmed


class WalletChallengeResponse(BaseModel):
    """
    Response containing the cryptographic challenge issued by the server.
    """
    challenge_id: str = Field(..., description="Unique server-side challenge ID (UUID)")
    wallet_address: str = Field(..., description="Target Algorand public wallet address")
    nonce: str = Field(..., description="128-bit CSPRNG hex nonce")
    challenge_text: str = Field(..., description="SIWA-compliant challenge text to be signed")
    chain_id: int = Field(default=416002, description="Algorand Chain ID (416002 for TestNet)")
    expires_at: str = Field(..., description="ISO 8601 UTC timestamp when challenge expires")


class WalletVerifyRequest(BaseModel):
    """
    Payload for submitting cryptographic proof of wallet ownership.
    Accepts either a signed 0-ALGO transaction (ARC-0014) or a direct Ed25519 signature.
    """
    challenge_id: str = Field(..., description="Unique challenge ID returned during challenge generation")
    wallet_address: str = Field(..., min_length=58, max_length=58, description="Claimed Algorand wallet address")
    signed_txn: str | None = Field(
        default=None,
        description="Base64-encoded msgpack signed 0-ALGO payment transaction (Pera Mobile/Web/Extension)",
    )
    signature: str | None = Field(
        default=None,
        description="Base64-encoded 64-byte Ed25519 signature (ARC-60 / SIWA / raw signature)",
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
            import re
            if not re.match(r"^[A-Z2-7]{58}$", trimmed):
                raise ValueError("Invalid Algorand Base32 address format")
        return trimmed

