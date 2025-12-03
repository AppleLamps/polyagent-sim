from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    xai_api_key: str = ""
    xai_model: str = "grok-4-1-fast"  # AI model for analysis (grok-4-1-fast, grok-beta, etc.)
    database_url: str = "sqlite:///./polyagent.db"
    initial_balance: float = 100000.0  # Starting virtual USDC ($100K)

    # Rate limiting settings
    rate_limit_analyze: int = 5  # Max analyze requests per minute
    rate_limit_markets: int = 30  # Max market requests per minute

    # Cache settings
    cache_ttl: int = 60  # Market data cache TTL in seconds

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @model_validator(mode='after')
    def validate_required_settings(self) -> 'Settings':
        """Validate that required environment variables are set."""
        if not self.xai_api_key:
            raise ValueError(
                "XAI_API_KEY environment variable is required. "
                "Please add XAI_API_KEY to backend/.env file."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

