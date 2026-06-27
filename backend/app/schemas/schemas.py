from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: str
    target_exam: str = "General"

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None

# --- Journal Schemas ---
class JournalCreate(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)

class JournalResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    sentiment_score: float
    sentiment_label: str
    cognitive_distortions: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Worry Schemas ---
class WorryCreate(BaseModel):
    thought: str = Field(..., min_length=1)
    lock_duration_hours: int = Field(default=2, ge=1, le=24)

class WorryResponse(BaseModel):
    id: int
    user_id: int
    thought: str
    is_locked: bool
    locked_until: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Gratitude Schemas ---
class GratitudeCreate(BaseModel):
    win_text: str = Field(..., min_length=1, max_length=200)

class GratitudeResponse(BaseModel):
    id: int
    user_id: int
    win_text: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Bono Chat Schemas ---
class ChatMessageBase(BaseModel):
    message_text: str

class ChatResponse(BaseModel):
    response_text: str
    bono_mood: str  # e.g., 'HAPPY', 'CALM', 'LISTENING', 'SAD', 'ALERT' (crisis)
    identified_triggers: List[str]
    cognitive_distortions: List[str]
    helplines: Optional[List[dict]] = None
