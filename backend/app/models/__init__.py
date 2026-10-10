"""
SQLAlchemy ORM Models Package.
All entity models are registered here for clean import and Alembic discovery.
"""
from app.models.user import User
from app.models.video import Video
from app.models.view import View
from app.models.interaction import Like, Comment
from app.models.reward import Reward, Settlement
from app.models.auth_challenge import AuthChallenge
from app.models.advertising import AdCampaign, AdCreative, AdEvent

__all__ = [
    "User",
    "Video",
    "View",
    "Like",
    "Comment",
    "Reward",
    "Settlement",
    "AuthChallenge",
    "AdCampaign",
    "AdCreative",
    "AdEvent",
]

