import json
import logging
from typing import BinaryIO
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class PinataConfigurationError(Exception):
    """Raised when Pinata credentials are missing or invalid."""
    pass


class PinataUploadError(Exception):
    """Raised when an IPFS pin operation to Pinata fails."""
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


class PinataService:
    """
    Service wrapper for Pinata IPFS pinning and gateway resolution.
    Encapsulates authentication, server-side streaming uploads, and playback URL resolution.
    """

    def __init__(self):
        self.settings = get_settings()

    def is_configured(self) -> bool:
        """
        Returns True if either a valid PINATA_JWT or both PINATA_API_KEY and PINATA_API_SECRET
        are configured in environment/settings.
        """
        has_jwt = bool(self.settings.PINATA_JWT and self.settings.PINATA_JWT.strip())
        has_keys = bool(
            self.settings.PINATA_API_KEY
            and self.settings.PINATA_API_KEY.strip()
            and self.settings.PINATA_API_SECRET
            and self.settings.PINATA_API_SECRET.strip()
        )
        return has_jwt or has_keys

    def get_auth_headers(self) -> dict[str, str]:
        """
        Builds the appropriate authorization headers without leaking secrets.
        Prefers PINATA_JWT if configured.
        """
        if self.settings.PINATA_JWT and self.settings.PINATA_JWT.strip():
            return {
                "Authorization": f"Bearer {self.settings.PINATA_JWT.strip()}"
            }
        elif (
            self.settings.PINATA_API_KEY
            and self.settings.PINATA_API_KEY.strip()
            and self.settings.PINATA_API_SECRET
            and self.settings.PINATA_API_SECRET.strip()
        ):
            return {
                "pinata_api_key": self.settings.PINATA_API_KEY.strip(),
                "pinata_secret_api_key": self.settings.PINATA_API_SECRET.strip(),
            }
        else:
            raise PinataConfigurationError(
                "Pinata credentials are not configured. Please set PINATA_JWT or PINATA_API_KEY and PINATA_API_SECRET."
            )

    def upload_file(
        self,
        file_obj: BinaryIO,
        filename: str,
        content_type: str = "video/mp4",
        video_metadata: dict | None = None,
    ) -> str:
        """
        Uploads and pins a file to IPFS via Pinata.
        Streams the file object to prevent high memory consumption.

        Returns the IPFS Content Identifier (CID).
        """
        if not self.is_configured():
            raise PinataConfigurationError(
                "Pinata credentials are not configured. Cannot upload to IPFS."
            )

        headers = self.get_auth_headers()
        url = f"{self.settings.PINATA_API_URL.rstrip('/')}/pinning/pinFileToIPFS"

        data: dict[str, str] = {}
        if video_metadata:
            data["pinataMetadata"] = json.dumps({
                "name": filename,
                "keyvalues": {str(k): str(v) for k, v in video_metadata.items() if v is not None}
            })

        files = {
            "file": (filename, file_obj, content_type)
        }

        try:
            with httpx.Client(timeout=180.0) as client:
                response = client.post(url, headers=headers, data=data, files=files)

            if response.status_code == 200:
                resp_json = response.json()
                cid = resp_json.get("IpfsHash") or resp_json.get("cid")
                if not cid:
                    raise PinataUploadError(
                        "Pinata returned success but response was missing 'IpfsHash' CID."
                    )
                return str(cid)
            elif response.status_code in (401, 403):
                logger.error("Pinata authentication error occurred during upload.")
                raise PinataUploadError(
                    "Pinata authentication failed. Check your API credentials.",
                    status_code=502,
                )
            else:
                error_detail = response.text[:200]
                logger.error(f"Pinata returned status {response.status_code}: {error_detail}")
                raise PinataUploadError(
                    f"Pinata pinning failed with status {response.status_code}.",
                    status_code=502,
                )
        except httpx.RequestError as exc:
            logger.error(f"Network error communicating with Pinata: {exc}")
            raise PinataUploadError(
                f"Network failure connecting to Pinata IPFS gateway: {exc}",
                status_code=502,
            ) from exc

    def get_playback_url(self, ipfs_cid: str | None) -> str | None:
        """
        Constructs a safe gateway playback URL from the IPFS CID.
        Automatically normalizes the gateway base (ensures https:// and /ipfs are present).
        Never includes or exposes API credentials in the URL.
        """
        if not ipfs_cid or not ipfs_cid.strip():
            return None
        gateway_base = (self.settings.PINATA_GATEWAY_URL or "https://gateway.pinata.cloud/ipfs").strip().rstrip("/")
        if not gateway_base.startswith("http://") and not gateway_base.startswith("https://"):
            gateway_base = f"https://{gateway_base}"
        if not gateway_base.endswith("/ipfs"):
            gateway_base = f"{gateway_base}/ipfs"
        return f"{gateway_base}/{ipfs_cid.strip()}"


# Global singleton instance
pinata_service = PinataService()
