from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    xai_api_key: str = ""
    database_url: str = "sqlite:///./polyagent.db"
    initial_balance: float = 100000.0  # Starting virtual USDC ($100K)

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

