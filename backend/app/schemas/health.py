from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """
    Schema representing the health status response for the API.
    """
    status: str = Field(
        ...,
        description="Health check status indication",
        examples=["ok"],
    )
    service: str = Field(
        ...,
        description="Name of the running backend service",
        examples=["OpenStream API"],
    )
