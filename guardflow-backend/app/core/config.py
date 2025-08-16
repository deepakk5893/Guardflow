from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator
import secrets


class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Guardflow"
    
    # Database
    DATABASE_URL: str

    # POSTGRES_USER: str
    # POSTGRES_PASSWORD: str
    # POSTGRES_DB: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # OpenAI
    OPENAI_API_KEY: str
    
    # JWT
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Encryption for API keys
    ENCRYPTION_KEY: str = secrets.token_urlsafe(32)
    
    # CORS - Frontend domains that can access this API
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",      # React dev server
        "http://localhost:5173",      # Vite dev server
        "https://guardflow.tech",     # Production frontend
        "https://www.guardflow.tech", # Production frontend with www
        "https://app.guardflow.tech"  # Optional: if you use subdomain for app
    ]
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        raise ValueError(v)
    
    
    # Rate Limiting & Quotas
    DEFAULT_RATE_LIMIT: int = 100  # requests per hour
    DEFAULT_DAILY_QUOTA: int = 10000  # tokens per day
    
    # Email Configuration (SendGrid)
    USE_EXTERNAL_EMAIL: bool = False  # Set to True to use SendGrid in production
    FROM_EMAIL: str = "noreply@guardflow.tech"
    BASE_URL: str = "https://guardflow.tech"  # Frontend URL for invitation links
    
    # SendGrid
    SENDGRID_API_KEY: Optional[str] = None
    DEFAULT_MONTHLY_QUOTA: int = 300000  # tokens per month
    
    # Scoring
    DEVIATION_THRESHOLD: float = 2.0
    WARNING_THRESHOLD: float = 1.0
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    
    # Environment
    ENVIRONMENT: str = "development"  # "development", "staging", "production"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    
    # Security (Production)
    SECURE_COOKIES: bool = False  # Set to True in production with HTTPS
    TRUSTED_HOSTS: List[str] = ["*"]  # Restrict in production
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"  # Ignore extra environment variables
    }


settings = Settings()