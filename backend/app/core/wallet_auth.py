import base64
from datetime import datetime, timedelta, timezone
import logging
import secrets
import uuid
from typing import Any

import algosdk
from algosdk import encoding, transaction
import nacl.exceptions
import nacl.signing

logger = logging.getLogger(__name__)


def generate_wallet_challenge_data(
    wallet_address: str,
    domain: str = "localhost:5173",
    uri: str = "http://localhost:5173",
    chain_id: int = 416002,
    ttl_seconds: int = 300,
) -> dict[str, Any]:
    """
    Generates a cryptographically random, short-lived wallet authentication challenge.
    Conforms to Sign-In With Algorand (ARC-0060 / SIWA) specifications with 128-bit CSPRNG nonce.
    """
    challenge_id = uuid.uuid4().hex
    nonce = secrets.token_hex(16)
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(seconds=ttl_seconds)

    issued_iso = issued_at.strftime("%Y-%m-%dT%H:%M:%SZ")
    expires_iso = expires_at.strftime("%Y-%m-%dT%H:%M:%SZ")

    challenge_text = (
        f"{domain} wants you to sign in with your Algorand account:\n"
        f"{wallet_address}\n\n"
        f"Sign this one-time challenge to authenticate your OpenStream session.\n\n"
        f"URI: {uri}\n"
        f"Version: 1\n"
        f"Chain ID: {chain_id}\n"
        f"Nonce: {nonce}\n"
        f"Issued At: {issued_iso}\n"
        f"Expiration Time: {expires_iso}"
    )

    return {
        "challenge_id": challenge_id,
        "wallet_address": wallet_address,
        "nonce": nonce,
        "challenge_text": challenge_text,
        "domain": domain,
        "chain_id": chain_id,
        "issued_at": issued_at,
        "expires_at": expires_at,
    }


def verify_wallet_signature(
    wallet_address: str,
    challenge_text: str,
    signature_b64: str | None = None,
    signed_txn_b64: str | None = None,
) -> bool:
    """
    Cryptographically verifies that the claimed Algorand wallet address owns the
    private key used to sign the challenge.

    Supports:
    1. Signed 0-ALGO payment transactions (universal Pera Mobile/Web/Extension/Ledger support).
    2. Direct Ed25519 signature bytes (ARC-60 SIWA / raw signature).
    """
    if not wallet_address or not challenge_text:
        return False

    if not signature_b64 and not signed_txn_b64:
        return False

    # Decode 32-byte Ed25519 public key from Base32 Algorand address
    try:
        pubkey_bytes = encoding.decode_address(wallet_address)
        verify_key = nacl.signing.VerifyKey(pubkey_bytes)
    except Exception as e:
        logger.warning(f"Failed to decode Algorand address public key: {type(e).__name__}")
        return False

    # Path 1: Signed 0-ALGO Transaction Proof (ARC-0014 / Pera Mobile & Web)
    if signed_txn_b64:
        try:
            raw_signed_bytes = base64.b64decode(signed_txn_b64.strip())
            # Handle either raw msgpack or base64 encoded msgpack string
            try:
                stxn_obj = encoding.msgpack_decode(raw_signed_bytes)
            except Exception:
                # If msgpack_decode expects base64 string
                stxn_obj = encoding.msgpack_decode(signed_txn_b64.strip())

            if not isinstance(stxn_obj, transaction.SignedTransaction):
                return False

            # Verify sender matches claimed address
            if stxn_obj.transaction.sender != wallet_address:
                logger.warning("Signed transaction sender address mismatch")
                return False

            # Verify note matches challenge text bytes or contains nonce
            expected_note = challenge_text.encode("utf-8")
            actual_note = bytes(stxn_obj.transaction.note) if stxn_obj.transaction.note else b""
            if actual_note != expected_note:
                logger.warning("Signed transaction note content mismatch")
                return False

            # Verify Ed25519 cryptographic signature over canonical Algorand transaction prefix
            raw_txn_bytes = base64.b64decode(encoding.msgpack_encode(stxn_obj.transaction))
            sig_bytes = (
                base64.b64decode(stxn_obj.signature)
                if isinstance(stxn_obj.signature, str)
                else bytes(stxn_obj.signature)
            )

            # Algorand signs b"TX" + canonical msgpack encoded transaction
            msg_to_verify = b"TX" + raw_txn_bytes
            verify_key.verify(msg_to_verify, sig_bytes)
            return True

        except (nacl.exceptions.BadSignatureError, nacl.exceptions.CryptoError):
            logger.warning("Algorand transaction signature verification failed (BadSignature)")
            return False
        except Exception as e:
            logger.warning(f"Error during signed transaction verification: {type(e).__name__}")
            return False

    # Path 2: Direct Ed25519 Message Signature (ARC-60 / raw signature)
    if signature_b64:
        try:
            sig_bytes = base64.b64decode(signature_b64.strip())
            if len(sig_bytes) != 64:
                return False

            msg_bytes = challenge_text.encode("utf-8")
            verify_key.verify(msg_bytes, sig_bytes)
            return True

        except (nacl.exceptions.BadSignatureError, nacl.exceptions.CryptoError):
            logger.warning("Direct message signature verification failed (BadSignature)")
            return False
        except Exception as e:
            logger.warning(f"Error during direct signature verification: {type(e).__name__}")
            return False

    return False
