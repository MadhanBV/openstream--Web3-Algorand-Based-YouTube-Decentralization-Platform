from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.models.user import User


def test_register_success(client: TestClient):
    """Verify that registering a new account returns HTTP 201 and safe user profile."""
    payload = {
        "username": "alice_creator",
        "email": "alice@openstream.io",
        "password": "SecurePassword123!",
        "display_name": "Alice Studio",
        "bio": "Building decentralized video content.",
        "is_creator": True,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] is not None
    assert data["username"] == "alice_creator"
    assert data["email"] == "alice@openstream.io"
    assert data["display_name"] == "Alice Studio"
    assert data["bio"] == "Building decentralized video content."
    assert data["is_creator"] is True
    assert data["is_active"] is True
    assert "created_at" in data
    assert "updated_at" in data

    # Ensure sensitive fields are NEVER returned in response
    assert "password" not in data
    assert "hashed_password" not in data


def test_register_password_hash_stored_safely(client: TestClient, db_session: Session):
    """Verify that only the bcrypt hash is stored in the database, not the plaintext password."""
    plain_password = "MySuperSecretPassword#2026"
    payload = {
        "username": "security_test_user",
        "email": "sec@openstream.io",
        "password": plain_password,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    # Inspect the raw database record
    user = db_session.query(User).filter(User.username == "security_test_user").first()
    assert user is not None
    assert user.hashed_password is not None
    # Password must not be plaintext
    assert user.hashed_password != plain_password
    # Password must be a valid bcrypt hash
    assert user.hashed_password.startswith("$2b$") or user.hashed_password.startswith("$2a$")
    assert verify_password(plain_password, user.hashed_password) is True


def test_register_duplicate_username(client: TestClient):
    """Verify that duplicate usernames receive HTTP 409 Conflict."""
    payload1 = {
        "username": "duplicate_user",
        "email": "user1@openstream.io",
        "password": "Password1234!",
    }
    res1 = client.post("/api/v1/auth/register", json=payload1)
    assert res1.status_code == 201

    payload2 = {
        "username": "duplicate_user",
        "email": "user2@openstream.io",
        "password": "Password1234!",
    }
    res2 = client.post("/api/v1/auth/register", json=payload2)
    assert res2.status_code == 409
    assert "Username is already registered" in res2.json()["detail"]


def test_register_duplicate_email(client: TestClient):
    """Verify that duplicate email addresses receive HTTP 409 Conflict."""
    payload1 = {
        "username": "first_account",
        "email": "shared_email@openstream.io",
        "password": "Password1234!",
    }
    res1 = client.post("/api/v1/auth/register", json=payload1)
    assert res1.status_code == 201

    payload2 = {
        "username": "second_account",
        "email": "shared_email@openstream.io",
        "password": "Password1234!",
    }
    res2 = client.post("/api/v1/auth/register", json=payload2)
    assert res2.status_code == 409
    assert "Email is already registered" in res2.json()["detail"]


def test_register_validation_errors(client: TestClient):
    """Verify input validation rules for username, email, and password."""
    # Password too short (<8 chars)
    res_short_pwd = client.post(
        "/api/v1/auth/register",
        json={"username": "valid_user", "email": "val@openstream.io", "password": "123"},
    )
    assert res_short_pwd.status_code == 422

    # Invalid email format
    res_bad_email = client.post(
        "/api/v1/auth/register",
        json={"username": "valid_user", "email": "not-an-email", "password": "Password123!"},
    )
    assert res_bad_email.status_code == 422

    # Invalid username format (spaces/special chars)
    res_bad_user = client.post(
        "/api/v1/auth/register",
        json={"username": "invalid user!", "email": "good@openstream.io", "password": "Password123!"},
    )
    assert res_bad_user.status_code == 422


def test_login_success_with_username(client: TestClient):
    """Verify login with username returns access token and user profile."""
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={"username": "bob_user", "email": "bob@openstream.io", "password": "BobPassword123!"},
    )

    # Login with username
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "bob_user", "password": "BobPassword123!"},
    )
    assert login_res.status_code == 200

    data = login_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    assert data["user"]["username"] == "bob_user"


def test_login_success_with_email(client: TestClient):
    """Verify login with email returns access token."""
    client.post(
        "/api/v1/auth/register",
        json={"username": "charlie_user", "email": "charlie@openstream.io", "password": "CharliePass123!"},
    )

    # Login with email
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "charlie@openstream.io", "password": "CharliePass123!"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()
    assert login_res.json()["user"]["email"] == "charlie@openstream.io"


def test_login_incorrect_password(client: TestClient):
    """Verify login with incorrect password returns generic HTTP 401."""
    client.post(
        "/api/v1/auth/register",
        json={"username": "dave_user", "email": "dave@openstream.io", "password": "CorrectPassword1!"},
    )

    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "dave_user", "password": "WrongPassword!"},
    )
    assert login_res.status_code == 401
    assert login_res.json()["detail"] == "Invalid username/email or password"


def test_login_nonexistent_user(client: TestClient):
    """Verify login with nonexistent user returns generic HTTP 401 (no user enumeration)."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "ghost_user_not_exist", "password": "SomePassword123!"},
    )
    assert login_res.status_code == 401
    assert login_res.json()["detail"] == "Invalid username/email or password"


def test_get_current_user_me_success(client: TestClient):
    """Verify GET /api/v1/auth/me returns the caller's profile with valid token."""
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"username": "eve_user", "email": "eve@openstream.io", "password": "EvePassword123!"},
    )
    user_id = reg_res.json()["id"]

    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "eve_user", "password": "EvePassword123!"},
    )
    token = login_res.json()["access_token"]

    # Call /me with Bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["id"] == user_id
    assert data["username"] == "eve_user"
    assert data["email"] == "eve@openstream.io"
    assert "hashed_password" not in data


def test_get_current_user_me_missing_token(client: TestClient):
    """Verify GET /api/v1/auth/me without token returns HTTP 401."""
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert res.json()["detail"] == "Authentication required"


def test_get_current_user_me_invalid_token(client: TestClient):
    """Verify GET /api/v1/auth/me with a corrupted token returns HTTP 401."""
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.malformed.jwt.token"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Could not validate credentials"


def test_get_current_user_me_expired_token(client: TestClient, db_session: Session):
    """Verify that an expired JWT token is rejected with HTTP 401."""
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"username": "expired_user", "email": "exp@openstream.io", "password": "ExpiredPass123!"},
    )
    user_id = reg_res.json()["id"]

    # Generate an already-expired token (-5 minutes)
    expired_token = create_access_token(
        subject=user_id,
        expires_delta=timedelta(minutes=-5),
    )

    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Token has expired"


def test_oauth2_form_token_login(client: TestClient):
    """Verify OAuth2 standard form login for Swagger UI compatibility."""
    client.post(
        "/api/v1/auth/register",
        json={"username": "form_user", "email": "form@openstream.io", "password": "FormPassword123!"},
    )

    # Send form-urlencoded data to /api/v1/auth/token
    res = client.post(
        "/api/v1/auth/token",
        data={"username": "form_user", "password": "FormPassword123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_logout(client: TestClient):
    """Verify logout endpoint returns confirmation message."""
    client.post(
        "/api/v1/auth/register",
        json={"username": "logout_user", "email": "logout@openstream.io", "password": "LogoutPass123!"},
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "logout_user", "password": "LogoutPass123!"},
    )
    token = login_res.json()["access_token"]

    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["message"] == "Successfully logged out"


# ==============================================================================
# Phase 8: Algorand Wallet Association Tests
# ==============================================================================

# Genuine Algorand TestNet Addresses with valid Ed25519 checksums
VALID_ALGO_ADDR_1 = "ZCUBSI7KTNQLIAGL4LSWJ4Z3AAC45AODNCKLIVZJV66Z5RQOMZ3J5O2PNQ"
VALID_ALGO_ADDR_2 = "GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXYZGZLA3KZ7XYZABCD"  # We can generate a real one below


def test_associate_wallet_success(client: TestClient):
    """Verify an authenticated user can associate a valid Algorand address."""
    from algosdk import account
    _, real_addr = account.generate_account()

    client.post(
        "/api/v1/auth/register",
        json={"username": "wallet_user", "email": "wallet@openstream.io", "password": "Password123!"},
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "wallet_user", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]

    # Associate wallet
    res = client.put(
        "/api/v1/auth/me/wallet",
        json={"wallet_address": real_addr},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["wallet_address"] == real_addr

    # Verify /auth/me reflects the new wallet address
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["wallet_address"] == real_addr


def test_associate_wallet_unauthenticated(client: TestClient):
    """Verify unauthenticated requests to associate wallet are rejected with 401."""
    from algosdk import account
    _, real_addr = account.generate_account()

    res = client.put(
        "/api/v1/auth/me/wallet",
        json={"wallet_address": real_addr},
    )
    assert res.status_code == 401


def test_associate_wallet_invalid_address(client: TestClient):
    """Verify malformed addresses or invalid checksums are rejected with 422."""
    client.post(
        "/api/v1/auth/register",
        json={"username": "invalid_addr_user", "email": "inv@openstream.io", "password": "Password123!"},
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "invalid_addr_user", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]

    # 1. Truncated address
    res_short = client.put(
        "/api/v1/auth/me/wallet",
        json={"wallet_address": "7K34NV82QPOIX5LMDR91TBCE4ZASFHUW78120491"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_short.status_code == 422

    # 2. 58 chars with invalid checksum
    res_bad_checksum = client.put(
        "/api/v1/auth/me/wallet",
        json={"wallet_address": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_bad_checksum.status_code == 422


def test_associate_wallet_duplicate_conflict(client: TestClient):
    """Verify attempting to associate a wallet already linked to another user returns 409 Conflict."""
    from algosdk import account
    _, shared_addr = account.generate_account()

    # User 1 registers and binds address
    client.post(
        "/api/v1/auth/register",
        json={"username": "user_alpha", "email": "alpha@openstream.io", "password": "Password123!"},
    )
    login_1 = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "user_alpha", "password": "Password123!"},
    )
    token_1 = login_1.json()["access_token"]

    res_1 = client.put(
        "/api/v1/auth/me/wallet",
        json={"wallet_address": shared_addr},
        headers={"Authorization": f"Bearer {token_1}"},
    )
    assert res_1.status_code == 200

    # User 2 registers and attempts to bind the SAME address
    client.post(
        "/api/v1/auth/register",
        json={"username": "user_beta", "email": "beta@openstream.io", "password": "Password123!"},
    )
    login_2 = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "user_beta", "password": "Password123!"},
    )
    token_2 = login_2.json()["access_token"]

    res_2 = client.put(
        "/api/v1/auth/me/wallet",
        json={"wallet_address": shared_addr},
        headers={"Authorization": f"Bearer {token_2}"},
    )
    assert res_2.status_code == 409
    assert "already associated" in res_2.json()["detail"].lower()


def test_disconnect_wallet_success(client: TestClient):
    """Verify an authenticated user can disconnect/clear their wallet address."""
    from algosdk import account
    _, real_addr = account.generate_account()

    client.post(
        "/api/v1/auth/register",
        json={"username": "disco_user", "email": "disco@openstream.io", "password": "Password123!"},
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "disco_user", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]

    # Connect wallet
    client.put(
        "/api/v1/auth/me/wallet",
        json={"wallet_address": real_addr},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Disconnect wallet
    disco_res = client.delete(
        "/api/v1/auth/me/wallet",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert disco_res.status_code == 200
    assert disco_res.json()["wallet_address"] is None


# ============================================================================
# PHASE 9: WEB3 CRYPTOGRAPHIC AUTHENTICATION TESTS
# ============================================================================


def test_wallet_challenge_generation_success(client: TestClient):
    """Verify that a valid Algorand address receives a SIWA challenge with nonce and expiry."""
    from algosdk import account
    _, addr = account.generate_account()

    res = client.post(
        "/api/v1/auth/wallet/challenge",
        json={"wallet_address": addr},
    )
    assert res.status_code == 200
    data = res.json()
    assert "challenge_id" in data
    assert data["wallet_address"] == addr
    assert "nonce" in data
    assert len(data["nonce"]) == 32  # 16-byte hex
    assert addr in data["challenge_text"]
    assert "expires_at" in data
    assert data["chain_id"] == 416002


def test_wallet_challenge_generation_invalid_address(client: TestClient):
    """Verify that invalid Algorand address formats are rejected with HTTP 422."""
    res = client.post(
        "/api/v1/auth/wallet/challenge",
        json={"wallet_address": "INVALID_NOT_58_CHARS"},
    )
    assert res.status_code == 422


def test_wallet_verify_signed_transaction_auto_provision(client: TestClient):
    """Verify successful Web3 login and new user auto-provisioning via signed 0-ALGO txn."""
    from algosdk import account, encoding, transaction
    import base64

    privkey, addr = account.generate_account()

    # 1. Request challenge
    chal_res = client.post(
        "/api/v1/auth/wallet/challenge",
        json={"wallet_address": addr},
    )
    assert chal_res.status_code == 200
    chal_data = chal_res.json()
    challenge_id = chal_data["challenge_id"]
    challenge_text = chal_data["challenge_text"]

    # 2. Sign 0-ALGO payment transaction with test private key
    sp = transaction.SuggestedParams(
        fee=1000,
        first=100,
        last=200,
        gh="SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOxo=",
        gen="testnet-v1.0",
    )
    txn = transaction.PaymentTxn(
        sender=addr,
        sp=sp,
        receiver=addr,
        amt=0,
        note=challenge_text.encode("utf-8"),
    )
    stxn = txn.sign(privkey)
    stxn_b64 = encoding.msgpack_encode(stxn)

    # 3. Verify on backend
    verify_res = client.post(
        "/api/v1/auth/wallet/verify",
        json={
            "challenge_id": challenge_id,
            "wallet_address": addr,
            "signed_txn": stxn_b64,
        },
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert "access_token" in verify_data
    assert verify_data["user"]["wallet_address"] == addr
    assert verify_data["user"]["username"].startswith("algo_")

    # 4. Confirm issued token works for authenticated endpoints
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {verify_data['access_token']}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["wallet_address"] == addr


def test_wallet_verify_direct_signature_success(client: TestClient):
    """Verify successful Web3 login via direct Ed25519 signature."""
    from algosdk import account, encoding
    import base64
    import nacl.signing

    privkey, addr = account.generate_account()

    chal_res = client.post(
        "/api/v1/auth/wallet/challenge",
        json={"wallet_address": addr},
    )
    chal_data = chal_res.json()
    challenge_id = chal_data["challenge_id"]
    challenge_text = chal_data["challenge_text"]

    # Direct Ed25519 signature
    seed = base64.b64decode(privkey)[:32]
    signing_key = nacl.signing.SigningKey(seed)
    sig_obj = signing_key.sign(challenge_text.encode("utf-8"))
    sig_b64 = base64.b64encode(sig_obj.signature).decode("ascii")

    verify_res = client.post(
        "/api/v1/auth/wallet/verify",
        json={
            "challenge_id": challenge_id,
            "wallet_address": addr,
            "signature": sig_b64,
        },
    )
    assert verify_res.status_code == 200
    assert "access_token" in verify_res.json()
    assert verify_res.json()["user"]["wallet_address"] == addr


def test_wallet_verify_existing_user_login(client: TestClient):
    """Verify an existing registered user can log in via wallet signature."""
    from algosdk import account, encoding
    import base64
    import nacl.signing

    privkey, addr = account.generate_account()

    # Pre-register user with password
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"username": "web3_creator", "email": "web3@openstream.io", "password": "Password123!"},
    )
    user_id = reg_res.json()["id"]

    # Link wallet
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "web3_creator", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    client.put(
        "/api/v1/auth/me/wallet",
        json={"wallet_address": addr},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Now login using Web3 wallet signature
    chal_res = client.post(
        "/api/v1/auth/wallet/challenge",
        json={"wallet_address": addr},
    )
    chal_data = chal_res.json()

    seed = base64.b64decode(privkey)[:32]
    sig_b64 = base64.b64encode(nacl.signing.SigningKey(seed).sign(chal_data["challenge_text"].encode("utf-8")).signature).decode("ascii")

    verify_res = client.post(
        "/api/v1/auth/wallet/verify",
        json={
            "challenge_id": chal_data["challenge_id"],
            "wallet_address": addr,
            "signature": sig_b64,
        },
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["user"]["id"] == user_id
    assert data["user"]["username"] == "web3_creator"


def test_wallet_verify_invalid_signature_rejected(client: TestClient):
    """Verify that a forged or mismatched signature is rejected with HTTP 401."""
    from algosdk import account
    import base64

    _, addr = account.generate_account()
    other_privkey, _ = account.generate_account()

    chal_res = client.post(
        "/api/v1/auth/wallet/challenge",
        json={"wallet_address": addr},
    )
    chal_data = chal_res.json()

    # Sign with OTHER private key (wrong key)
    import nacl.signing
    seed = base64.b64decode(other_privkey)[:32]
    sig_b64 = base64.b64encode(nacl.signing.SigningKey(seed).sign(chal_data["challenge_text"].encode("utf-8")).signature).decode("ascii")

    verify_res = client.post(
        "/api/v1/auth/wallet/verify",
        json={
            "challenge_id": chal_data["challenge_id"],
            "wallet_address": addr,
            "signature": sig_b64,
        },
    )
    assert verify_res.status_code == 401
    assert "verification failed" in verify_res.json()["detail"].lower()


def test_wallet_verify_mismatched_address_rejected(client: TestClient):
    """Verify that submitting a challenge with a different wallet address returns HTTP 401."""
    from algosdk import account
    _, addr1 = account.generate_account()
    _, addr2 = account.generate_account()

    chal_res = client.post(
        "/api/v1/auth/wallet/challenge",
        json={"wallet_address": addr1},
    )
    challenge_id = chal_res.json()["challenge_id"]

    verify_res = client.post(
        "/api/v1/auth/wallet/verify",
        json={
            "challenge_id": challenge_id,
            "wallet_address": addr2,
            "signature": "c29tZXNpZw==",
        },
    )
    assert verify_res.status_code == 401
    assert "does not match" in verify_res.json()["detail"].lower()


def test_wallet_verify_replay_attack_rejected(client: TestClient):
    """Verify that a single-use challenge cannot be replayed twice."""
    from algosdk import account, encoding
    import base64
    import nacl.signing

    privkey, addr = account.generate_account()

    chal_res = client.post(
        "/api/v1/auth/wallet/challenge",
        json={"wallet_address": addr},
    )
    chal_data = chal_res.json()

    seed = base64.b64decode(privkey)[:32]
    sig_b64 = base64.b64encode(nacl.signing.SigningKey(seed).sign(chal_data["challenge_text"].encode("utf-8")).signature).decode("ascii")

    # First verification succeeds
    res_1 = client.post(
        "/api/v1/auth/wallet/verify",
        json={
            "challenge_id": chal_data["challenge_id"],
            "wallet_address": addr,
            "signature": sig_b64,
        },
    )
    assert res_1.status_code == 200

    # Second verification with SAME challenge ID fails (Replay Attack Prevention)
    res_2 = client.post(
        "/api/v1/auth/wallet/verify",
        json={
            "challenge_id": chal_data["challenge_id"],
            "wallet_address": addr,
            "signature": sig_b64,
        },
    )
    assert res_2.status_code == 401
    assert "already been consumed" in res_2.json()["detail"].lower()


def test_wallet_verify_expired_challenge_rejected(client: TestClient, db_session: Session):
    """Verify that an expired challenge is rejected with HTTP 401."""
    from algosdk import account
    from app.models.auth_challenge import AuthChallenge
    from datetime import datetime, timedelta, timezone

    _, addr = account.generate_account()

    # Manually create an expired challenge in DB
    expired_chal = AuthChallenge(
        id="expired-chal-12345",
        wallet_address=addr,
        nonce="0123456789abcdef0123456789abcdef",
        challenge_text="expired challenge",
        domain="localhost:5173",
        chain_id=416002,
        is_used=False,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=10),
    )
    db_session.add(expired_chal)
    db_session.commit()

    verify_res = client.post(
        "/api/v1/auth/wallet/verify",
        json={
            "challenge_id": "expired-chal-12345",
            "wallet_address": addr,
            "signature": "c29tZXNpZw==",
        },
    )
    assert verify_res.status_code == 401
    assert "expired" in verify_res.json()["detail"].lower()


def test_wallet_verify_nonexistent_challenge_rejected(client: TestClient):
    """Verify that a nonexistent challenge ID returns HTTP 401."""
    from algosdk import account
    _, addr = account.generate_account()

    verify_res = client.post(
        "/api/v1/auth/wallet/verify",
        json={
            "challenge_id": "nonexistent-random-id-99999",
            "wallet_address": addr,
            "signature": "c29tZXNpZw==",
        },
    )
    assert verify_res.status_code == 401
    assert "invalid or unrecognized" in verify_res.json()["detail"].lower()


