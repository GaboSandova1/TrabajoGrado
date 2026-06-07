from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SECRET_KEY: str = "cambia-esto-por-una-clave-aleatoria"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60

    DATABASE_URL: str = "sqlite:///./database.db"

    RAINFOREST_API_KEY: str = ""
    RAINFOREST_API_KEY_2: str = ""
    RAINFOREST_API_KEY_3: str = ""
    RAINFOREST_ENDPOINT: str = "https://api.rainforestapi.com/request"

    GROQ_API_KEY: str = ""
    GROQ_ENDPOINT: str = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    EMAIL_HOST: Optional[str] = None
    EMAIL_PORT: Optional[int] = None
    EMAIL_USE_TLS: bool = True
    EMAIL_HOST_USER: Optional[str] = None
    EMAIL_HOST_PASSWORD: Optional[str] = None
    DEFAULT_FROM_EMAIL: Optional[str] = None

    FRONTEND_URL: str = "http://localhost:3000"

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    API_BASE_URL: str = "http://127.0.0.1:8000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def rainforest_api_keys(self) -> list[str]:
        keys: list[str] = []
        for value in (
            self.RAINFOREST_API_KEY,
            self.RAINFOREST_API_KEY_2,
            self.RAINFOREST_API_KEY_3,
        ):
            key = (value or "").strip()
            if key and key not in keys:
                keys.append(key)
        return keys

    @property
    def smtp_host(self) -> str:
        return self.EMAIL_HOST or self.SMTP_HOST

    @property
    def smtp_port(self) -> int:
        return self.EMAIL_PORT or self.SMTP_PORT

    @property
    def smtp_user(self) -> Optional[str]:
        return self.EMAIL_HOST_USER or self.SMTP_USER or self.DEFAULT_FROM_EMAIL

    @property
    def smtp_password(self) -> Optional[str]:
        return self.EMAIL_HOST_PASSWORD or self.SMTP_PASSWORD

    @property
    def from_email(self) -> Optional[str]:
        return self.DEFAULT_FROM_EMAIL or self.smtp_user

    @property
    def email_configured(self) -> bool:
        return bool(self.smtp_user and self.smtp_password)


settings = Settings()
