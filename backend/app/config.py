from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    xai_api_key: str = ""
    database_url: str = "sqlite:///./polyagent.db"
    initial_balance: float = 100000.0  # Starting virtual USDC ($100K)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()

