from fastapi import APIRouter
from app.api.routes import auth, health, rewards, videos, views, settlements, ads, creator

api_router = APIRouter()

# Register active routes
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(videos.router, prefix="/videos")
api_router.include_router(views.router, prefix="/views")
api_router.include_router(rewards.router, prefix="/rewards")
api_router.include_router(settlements.router)
api_router.include_router(ads.router)
api_router.include_router(creator.router)


