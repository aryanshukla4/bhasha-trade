from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "sqlite:///./data/bhasha-trade.sqlite"
    jwt_secret: str = "development-only-secret-change-me"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    redis_url: str = "memory://"
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000"

    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-20b"
    agmarknet_api_key: str | None = None
    openweather_api_key: str | None = None
    kindwise_api_key: str | None = None
    crop_model_root: str = "./crop_model"
    crop_confidence_threshold: float = 0.55

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
