import pytest
from pydantic import ValidationError
from app.config import Settings


def test_default_settings():
    """
    Verify Settings loads with default values.
    """
    settings = Settings(_env_file=None)
    assert settings.PROJECT_NAME == "OpenStream API"
    assert settings.ENVIRONMENT == "development"
    assert settings.API_V1_STR == "/api/v1"
    assert "http://localhost:5173" in settings.ALLOWED_ORIGINS
    assert not settings.is_production


def test_cors_origins_parsing():
    """
    Verify ALLOWED_ORIGINS can parse JSON array strings, comma-separated strings, and native lists.
    """
    # JSON list string
    settings_json = Settings(_env_file=None, ALLOWED_ORIGINS='["http://example.com", "http://localhost:3000"]')
    assert settings_json.ALLOWED_ORIGINS == ["http://example.com", "http://localhost:3000"]

    # Comma-separated string
    settings_csv = Settings(_env_file=None, ALLOWED_ORIGINS="http://example.com, http://localhost:3000")
    assert settings_csv.ALLOWED_ORIGINS == ["http://example.com", "http://localhost:3000"]

    # Native list
    settings_list = Settings(_env_file=None, ALLOWED_ORIGINS=["http://example.com"])
    assert settings_list.ALLOWED_ORIGINS == ["http://example.com"]


def test_invalid_environment_raises_validation_error():
    """
    Verify invalid ENVIRONMENT value raises a clear validation error.
    """
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ENVIRONMENT="invalid_env_name")
