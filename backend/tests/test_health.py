from fastapi.testclient import TestClient


def test_health_check_returns_200_and_expected_payload(client: TestClient):
    """
    Verify GET /api/v1/health returns HTTP 200 and the exact expected structure:
    {
        "status": "ok",
        "service": "OpenStream API"
    }
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert data == {
        "status": "ok",
        "service": "OpenStream API",
    }
    assert data["status"] == "ok"
    assert data["service"] == "OpenStream API"


def test_docs_accessible(client: TestClient):
    """
    Verify /docs (Swagger UI) is accessible and returns HTTP 200 HTML content.
    """
    response = client.get("/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "SwaggerUIBundle" in response.text or "swagger" in response.text.lower()


def test_openapi_json_accessible(client: TestClient):
    """
    Verify /openapi.json is accessible and valid JSON schema.
    """
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "application/json" in response.headers.get("content-type", "")

    schema = response.json()
    assert "openapi" in schema
    assert "paths" in schema
    assert "/api/v1/health" in schema["paths"]
    assert "get" in schema["paths"]["/api/v1/health"]


def test_root_endpoint(client: TestClient):
    """
    Verify root endpoint / returns 200 with service info.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["name"] == "OpenStream API"
    assert data["health"] == "/api/v1/health"
