from fastapi import APIRouter, status
from app.config import get_settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns the operational status of the service and service name.",
)
async def get_health() -> HealthResponse:
    """
    Health check endpoint to verify that the OpenStream API is active and responsive.
    """
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.PROJECT_NAME,
    )
