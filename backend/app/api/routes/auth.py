from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.core.wallet_auth import generate_wallet_challenge_data, verify_wallet_signature
from app.db.session import get_db
from app.models.auth_challenge import AuthChallenge
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    TokenResponse,
    UserRegisterRequest,
    WalletChallengeRequest,
    WalletChallengeResponse,
    WalletVerifyRequest,
)
from app.schemas.user import UserResponse, WalletAssociateRequest

router = APIRouter(tags=["Authentication"])
settings = get_settings()



@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    description="Creates a new viewer/creator account with validated credentials and hashed password storage.",
)
def register(
    data: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> User:
    """
    Registers a new account. Enforces uniqueness on username and email.
    Stores only the bcrypt hash of the password.
    """
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered",
        )

    # Check if email already exists
    existing_email = db.query(User).filter(User.email == data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # Hash the password securely with bcrypt
    password_hash = hash_password(data.password)

    new_user = User(
        username=data.username,
        email=data.email,
        hashed_password=password_hash,
        display_name=data.display_name or data.username,
        bio=data.bio,
        is_creator=data.is_creator,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login (JSON)",
    description="Authenticates credentials (username or email + password) and returns a signed JWT access token.",
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Authenticates user with username or email and password.
    Returns a generic 401 on failure to avoid account enumeration.
    """
    identifier = credentials.username_or_email.strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.email == identifier)
    ).first()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(subject=user.id, expires_delta=expires_delta)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="OAuth2 Form Login (Swagger UI compatible)",
    description="Standard OAuth2 form-urlencoded login endpoint enabling the Swagger /docs Authorize button.",
)
def login_oauth2_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Form-based login endpoint for Swagger UI integration.
    """
    identifier = form_data.username.strip()
    user = db.query(User).filter(
        or_(User.username == identifier, User.email == identifier)
    ).first()

    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Returns the profile data of the currently authenticated user. Requires Bearer JWT token.",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Protected endpoint returning the profile of the caller.
    """
    return current_user


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Logout user session",
    description="Instructs the client to purge stored tokens. (Stateless JWT token invalidation).",
)
def logout(
    current_user: User = Depends(get_current_active_user),
) -> MessageResponse:
    """
    Logout endpoint for client session termination.
    """
    return MessageResponse(message="Successfully logged out")


@router.put(
    "/me/wallet",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Associate Algorand wallet address",
    description="Binds an Algorand public account address to the authenticated user profile. Validates address format and enforces uniqueness.",
)
def associate_wallet(
    data: WalletAssociateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Associates a verified Algorand wallet address with the authenticated user profile.
    Rejects duplicate wallet addresses registered to another account (409 Conflict).
    """
    target_address = data.wallet_address.strip()

    # Check if this wallet address is already linked to another user
    existing_owner = db.query(User).filter(
        User.wallet_address == target_address,
        User.id != current_user.id,
    ).first()

    if existing_owner:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This Algorand wallet address is already associated with another OpenStream account.",
        )

    current_user.wallet_address = target_address
    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete(
    "/me/wallet",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Disconnect Algorand wallet address",
    description="Removes the associated Algorand wallet address from the authenticated user profile.",
)
def disconnect_wallet(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Clears the wallet address from the authenticated user's profile.
    """
    current_user.wallet_address = None
    db.commit()
    db.refresh(current_user)

    return current_user


@router.post(
    "/wallet/challenge",
    response_model=WalletChallengeResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Algorand wallet authentication challenge",
    description="Issues a short-lived, single-use cryptographic challenge bound to the specified Algorand account address.",
)
def get_wallet_challenge(
    data: WalletChallengeRequest,
    db: Session = Depends(get_db),
) -> WalletChallengeResponse:
    """
    Generates a SIWA-compliant cryptographic challenge with 128-bit CSPRNG nonce
    and persists it for single-use verification.
    """
    challenge_data = generate_wallet_challenge_data(
        wallet_address=data.wallet_address,
        domain="localhost:5173",
        uri="http://localhost:5173",
        chain_id=416002,
        ttl_seconds=300,
    )

    challenge_record = AuthChallenge(
        id=challenge_data["challenge_id"],
        wallet_address=challenge_data["wallet_address"],
        nonce=challenge_data["nonce"],
        challenge_text=challenge_data["challenge_text"],
        domain=challenge_data["domain"],
        chain_id=challenge_data["chain_id"],
        is_used=False,
        expires_at=challenge_data["expires_at"],
    )

    db.add(challenge_record)
    db.commit()

    return WalletChallengeResponse(
        challenge_id=challenge_data["challenge_id"],
        wallet_address=challenge_data["wallet_address"],
        nonce=challenge_data["nonce"],
        challenge_text=challenge_data["challenge_text"],
        chain_id=challenge_data["chain_id"],
        expires_at=challenge_data["expires_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


@router.post(
    "/wallet/verify",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Algorand cryptographic proof and issue session token",
    description="Verifies Ed25519 signature proof over the issued challenge, prevents replay/expiration attacks, provisions or loads the user profile, and returns a signed JWT access token.",
)
def verify_wallet_proof(
    data: WalletVerifyRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Validates server-side challenge state, verifies Ed25519 signature proof from Pera Wallet,
    and establishes an authenticated JWT session.
    """
    # 1. Fetch challenge record from database
    challenge = db.query(AuthChallenge).filter(AuthChallenge.id == data.challenge_id).first()
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unrecognized authentication challenge ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Check single-use consumption (Replay Attack Prevention)
    if challenge.is_used:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication challenge has already been consumed. Replay attacks are prohibited.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Check expiration
    now = datetime.now(timezone.utc)
    challenge_exp = (
        challenge.expires_at
        if challenge.expires_at.tzinfo is not None
        else challenge.expires_at.replace(tzinfo=timezone.utc)
    )
    if challenge_exp < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication challenge has expired. Please request a fresh challenge.",
            headers={"WWW-Authenticate": "Bearer"},
        )


    # 4. Verify wallet address binding
    if challenge.wallet_address != data.wallet_address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wallet address does not match the bound challenge recipient.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 5. Mark challenge as consumed immediately to prevent concurrent replay race conditions
    challenge.is_used = True
    db.commit()

    # 6. Cryptographically verify Ed25519 proof
    is_valid = verify_wallet_signature(
        wallet_address=data.wallet_address,
        challenge_text=challenge.challenge_text,
        signature_b64=data.signature,
        signed_txn_b64=data.signed_txn,
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cryptographic proof verification failed. Invalid Algorand signature.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 7. Locate or auto-provision user account
    user = db.query(User).filter(User.wallet_address == data.wallet_address).first()
    if not user:
        # Generate clean unique username for new Web3 account
        base_username = f"algo_{data.wallet_address[:6].lower()}_{data.wallet_address[-4:].lower()}"
        unique_username = base_username
        suffix = 1
        while db.query(User).filter(User.username == unique_username).first():
            unique_username = f"{base_username}_{suffix}"
            suffix += 1

        user = User(
            username=unique_username,
            display_name=f"Algorand ({data.wallet_address[:6]}...{data.wallet_address[-4:]})",
            wallet_address=data.wallet_address,
            is_creator=False,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # 8. Issue JWT access token
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.id,
        expires_delta=expires_delta,
        extra_claims={"wallet_address": user.wallet_address, "auth_method": "web3_wallet"},
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


