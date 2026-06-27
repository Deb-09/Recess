import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Recess Backend API"
    API_V1_STR: str = "/api/v1"
    
    # Security Configuration
    SECRET_KEY: str = Field(default="recess-super-secret-key-change-in-production-123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 Days for student session longevity
    
    # Database Configurations
    # Fallback to local async sqlite file for easy local zero-config developer onboarding
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./recess.db")
    REDIS_URL: Optional[str] = Field(default=None)
    
    # Journal AES-256 GCM Key (Must be 32 bytes encoded in hex)
    # Default is a pre-generated hex key for local testing. In production, this must be set securely.
    ENCRYPTION_KEY_HEX: str = Field(default="00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff")
    
    # Gemini API Key
    GEMINI_API_KEY: Optional[str] = Field(default=None)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

    @property
    def encryption_key(self) -> bytes:
        try:
            return bytes.fromhex(self.ENCRYPTION_KEY_HEX)
        except ValueError:
            # Fallback for invalid hex key
            return b"recess-fallback-32byte-enc-key!!!"

settings = Settings()
