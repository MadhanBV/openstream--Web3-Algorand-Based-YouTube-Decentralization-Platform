import json
import urllib.parse
from functools import lru_cache
from typing import Literal
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings loaded from environment variables and .env file.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application Metadata
    PROJECT_NAME: str = Field(default="OpenStream API", description="Name of the application")
    VERSION: str = Field(default="0.1.0", description="API Version")
    ENVIRONMENT: Literal["development", "staging", "production", "test"] = Field(
        default="development",
        description="Deployment environment",
    )
    DEBUG: bool = Field(default=True, description="Debug mode flag")

    # Network / Server Configuration
    HOST: str = Field(default="127.0.0.1", description="Server bind host")
    PORT: int = Field(default=8000, description="Server bind port")
    API_V1_STR: str = Field(default="/api/v1", description="Prefix for API v1 routes")

    # Database Configuration
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/openstream",
        description="SQLAlchemy PostgreSQL connection string using psycopg3",
    )

    # Security & JWT Authentication
    JWT_SECRET: str = Field(
        default="openstream-dev-secret-key-minimum-32-characters-long-for-hmac-sha256",
        description="Cryptographic secret key for signing JWT access tokens",
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="JWT cryptographic algorithm",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60,
        description="Lifetime of issued access tokens in minutes",
    )

    # CORS Allowed Origins
    ALLOWED_ORIGINS: list[str] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"],
        description="List of allowed origins for CORS headers",
    )

    # Pinata / IPFS Configuration (Phase 7)
    PINATA_API_KEY: str | None = Field(default=None, description="Pinata API Key")
    PINATA_API_SECRET: str | None = Field(default=None, description="Pinata API Secret")
    PINATA_JWT: str | None = Field(default=None, description="Pinata JWT Bearer token")
    PINATA_GATEWAY_URL: str = Field(
        default="https://gateway.pinata.cloud/ipfs",
        description="Public or dedicated IPFS gateway base URL for video playback",
    )
    PINATA_API_URL: str = Field(
        default="https://api.pinata.cloud",
        description="Pinata REST API base URL",
    )
    MAX_UPLOAD_SIZE_BYTES: int = Field(
        default=500 * 1024 * 1024,
        description="Maximum allowed video upload size in bytes (default 500 MB)",
    )
    ALLOWED_VIDEO_MIME_TYPES: list[str] = Field(
        default=[
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "video/x-msvideo",
            "video/ogg",
            "video/x-matroska",
        ],
        description="Allowed MIME content types for uploaded video files",
    )

    # Algorand TestNet Settlement Configuration (Phase 12)
    ALGORAND_NETWORK: Literal["testnet"] = Field(
        default="testnet",
        description="Algorand blockchain network (strictly TestNet; MainNet payouts prohibited)",
    )
    ALGORAND_ALGOD_URL: str = Field(
        default="https://testnet-api.algonode.cloud",
        description="Algorand Algod consensus node API URL",
    )
    ALGORAND_ALGOD_TOKEN: str = Field(
        default="",
        description="Algorand Algod API authorization token",
    )
    ALGORAND_INDEXER_URL: str = Field(
        default="https://testnet-idx.algonode.cloud",
        description="Algorand Indexer API URL",
    )
    ALGORAND_TREASURY_ADDRESS: str | None = Field(
        default=None,
        description="Public Algorand address of the platform settlement treasury",
    )
    ALGORAND_TREASURY_MNEMONIC: str | None = Field(
        default=None,
        description="25-word secret mnemonic for TestNet treasury transaction signing",
    )

    @field_validator("ALGORAND_NETWORK")
    @classmethod
    def validate_testnet_network(cls, v: str) -> str:
        if str(v).lower() != "testnet":
            raise ValueError("Safety lock: OpenStream strictly operates on 'testnet'. MainNet payouts prohibited.")
        return "testnet"

    @field_validator("PINATA_GATEWAY_URL", mode="before")
    @classmethod
    def normalize_gateway_url(cls, v: str | None) -> str:
        if not v or not str(v).strip():
            return "https://gateway.pinata.cloud/ipfs"
        gw = str(v).strip().rstrip("/")
        if not gw.startswith("http://") and not gw.startswith("https://"):
            gw = f"https://{gw}"
        if not gw.endswith("/ipfs"):
            gw = f"{gw}/ipfs"
        return gw

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        """
        Ensures special characters in the database password (such as '@', '#', '%')
        are properly percent-encoded for SQLAlchemy and connection URI parsers.
        """
        if isinstance(v, str) and "://" in v:
            prefix, rest = v.split("://", 1)
            # Find the last '@' which separates credentials from host:port/db
            last_at = rest.rfind("@")
            if last_at != -1:
                userpass = rest[:last_at]
                host_db = rest[last_at + 1:]
                if ":" in userpass:
                    user, pwd = userpass.split(":", 1)
                    # Only quote if not already percent-encoded
                    if "%" not in pwd:
                        pwd = urllib.parse.quote_plus(pwd)
                    return f"{prefix}://{user}:{pwd}@{host_db}"
        return v

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        """
        Parses ALLOWED_ORIGINS whether provided as a JSON list string,
        a comma-separated string, or a native Python list.
        """
        if isinstance(v, str):
            v_stripped = v.strip()
            if not v_stripped:
                return []
            if v_stripped.startswith("[") and v_stripped.endswith("]"):
                try:
                    parsed = json.loads(v_stripped)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except json.JSONDecodeError:
                    pass
            # Fallback to comma-separated
            return [origin.strip() for origin in v_stripped.split(",") if origin.strip()]
        elif isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        return []

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached singleton instance of application settings.
    """
    return Settings()
