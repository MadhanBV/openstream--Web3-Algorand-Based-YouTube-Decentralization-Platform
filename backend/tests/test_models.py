from decimal import Decimal
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.video import Video
from app.models.view import View
from app.models.interaction import Like, Comment
from app.models.reward import Reward, Settlement


def test_create_user(db_session: Session):
    """Test creating a standard user with profile information and wallet address."""
    user = User(
        username="cryptocreator",
        display_name="Crypto Creator",
        email="creator@openstream.io",
        bio="Building open creator economies.",
        wallet_address="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        is_creator=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.username == "cryptocreator"
    assert user.is_creator is True
    assert user.is_active is True
    assert user.created_at is not None
    assert user.updated_at is not None


def test_user_unique_constraints(db_session: Session):
    """Test that duplicate usernames or emails raise IntegrityError."""
    user1 = User(username="unique_user", email="unique@openstream.io")
    db_session.add(user1)
    db_session.commit()

    # Attempt duplicate username
    user2 = User(username="unique_user", email="other@openstream.io")
    db_session.add(user2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Attempt duplicate email
    user3 = User(username="other_user", email="unique@openstream.io")
    db_session.add(user3)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_create_video_with_ipfs_cid(db_session: Session):
    """Test video creation with IPFS CID and creator relationship."""
    creator = User(username="filmmaker", is_creator=True)
    db_session.add(creator)
    db_session.commit()

    video = Video(
        creator_id=creator.id,
        title="Decentralized Video Future",
        description="Exploring Web3 video streaming and storage architecture.",
        ipfs_cid="QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx",
        thumbnail_cid="QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
        duration_seconds=342,
        visibility="public",
        status="ready",
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)

    assert video.id is not None
    assert video.creator.username == "filmmaker"
    assert video.ipfs_cid.startswith("Qm")
    assert video.views_count == 0
    assert video.likes_count == 0


def test_video_cascade_delete(db_session: Session):
    """Test that deleting a user deletes all associated videos (CASCADE)."""
    creator = User(username="temp_creator")
    db_session.add(creator)
    db_session.commit()

    video = Video(
        creator_id=creator.id,
        title="Temporary Video",
        ipfs_cid="QmTest1234567890",
    )
    db_session.add(video)
    db_session.commit()
    video_id = video.id

    # Delete creator
    db_session.delete(creator)
    db_session.commit()

    # Video should be deleted via cascade
    assert db_session.get(Video, video_id) is None


def test_video_views_tracking(db_session: Session):
    """Test recording view events for registered users and guest sessions."""
    creator = User(username="channel_owner")
    viewer = User(username="viewer_one")
    db_session.add_all([creator, viewer])
    db_session.commit()

    video = Video(
        creator_id=creator.id,
        title="Viewable Video",
        ipfs_cid="QmVidCid123",
    )
    db_session.add(video)
    db_session.commit()

    # Authenticated user view
    user_view = View(
        video_id=video.id,
        user_id=viewer.id,
        watch_duration_seconds=120,
        is_valid=True,
    )
    # Anonymous guest view (user_id=None)
    guest_view = View(
        video_id=video.id,
        user_id=None,
        watch_duration_seconds=45,
        session_id="guest_session_abc123",
        is_valid=True,
    )
    db_session.add_all([user_view, guest_view])
    db_session.commit()

    views = db_session.query(View).filter_by(video_id=video.id).all()
    assert len(views) == 2
    assert any(v.user_id is None for v in views)
    assert any(v.user_id == viewer.id for v in views)


def test_duplicate_likes_prevented(db_session: Session):
    """Test that a user cannot like the same video multiple times (UniqueConstraint)."""
    creator = User(username="creator_like_target")
    viewer = User(username="enthusiastic_viewer")
    db_session.add_all([creator, viewer])
    db_session.commit()

    video = Video(creator_id=creator.id, title="Likeable Video", ipfs_cid="QmLikeTest123")
    db_session.add(video)
    db_session.commit()

    # First like should succeed
    like1 = Like(user_id=viewer.id, video_id=video.id)
    db_session.add(like1)
    db_session.commit()

    # Duplicate like should raise IntegrityError
    like2 = Like(user_id=viewer.id, video_id=video.id)
    db_session.add(like2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_comments_and_cascade(db_session: Session):
    """Test adding comments to a video and verify comment relationships."""
    creator = User(username="video_author")
    commenter = User(username="commenter_guy")
    db_session.add_all([creator, commenter])
    db_session.commit()

    video = Video(creator_id=creator.id, title="Discussion Video", ipfs_cid="QmDiscuss123")
    db_session.add(video)
    db_session.commit()

    comment = Comment(
        video_id=video.id,
        user_id=commenter.id,
        content="Great explanation of semi-decentralized streaming!",
    )
    db_session.add(comment)
    db_session.commit()
    db_session.refresh(comment)

    assert comment.id is not None
    assert comment.video.title == "Discussion Video"
    assert comment.user.username == "commenter_guy"


def test_rewards_and_settlement_workflow(db_session: Session):
    """Test creator reward accrual and on-chain settlement linking."""
    creator = User(
        username="earning_creator",
        wallet_address="ALGORAND_TESTNET_ADDRESS_SAMPLE_58_CHARACTERS_LONG_ABC",
        is_creator=True,
    )
    db_session.add(creator)
    db_session.commit()

    video = Video(creator_id=creator.id, title="Monetized Video", ipfs_cid="QmEarn123")
    db_session.add(video)
    db_session.commit()

    # Accrue reward for 500 valid views
    reward = Reward(
        creator_id=creator.id,
        video_id=video.id,
        amount=Decimal("12.500000"),
        views_credited=500,
        status="accrued",
    )
    db_session.add(reward)
    db_session.commit()
    db_session.refresh(reward)

    assert reward.id is not None
    assert reward.amount == Decimal("12.500000")
    assert reward.status == "accrued"

    # Create settlement payout record
    settlement = Settlement(
        creator_id=creator.id,
        wallet_address=creator.wallet_address,
        amount=Decimal("12.500000"),
        network="testnet",
        transaction_id="TX_ALGORAND_TESTNET_HASH_987654321",
        status="confirmed",
    )
    db_session.add(settlement)
    db_session.commit()

    # Link reward to settlement
    reward.settlement_id = settlement.id
    reward.status = "settled"
    db_session.commit()

    db_session.refresh(reward)
    assert reward.settlement is not None
    assert reward.settlement.transaction_id == "TX_ALGORAND_TESTNET_HASH_987654321"
    assert reward.settlement.status == "confirmed"
