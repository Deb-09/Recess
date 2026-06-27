from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.db.session import Base
from app.core.security import decrypt_text

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    target_exam = Column(String, default="General")  # e.g., JEE, NEET, UPSC, Board Exams
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    # Relationships
    journals = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    worries = relationship("Worry", back_populates="user", cascade="all, delete-orphan")
    gratitudes = relationship("Gratitude", back_populates="user", cascade="all, delete-orphan")
    chats = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Encrypted fields (AES-256-GCM hex strings)
    encrypted_title = Column(String, nullable=False)
    encrypted_content = Column(String, nullable=False)
    
    # Analytics tags (processed by Gemini)
    sentiment_score = Column(Float, default=0.0)  # -1.0 to 1.0
    sentiment_label = Column(String, default="Neutral")  # Positive, Calming, Anxious, Stressed, etc.
    cognitive_distortions = Column(JSON, default=list)  # e.g. ["Catastrophizing", "Black-and-White Thinking"]
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    # Relationships
    user = relationship("User", back_populates="journals")

    @property
    def title(self) -> str:
        """Decrypt and return the journal title."""
        return decrypt_text(self.encrypted_title)

    @property
    def content(self) -> str:
        """Decrypt and return the journal content."""
        return decrypt_text(self.encrypted_content)


class Worry(Base):
    __tablename__ = "worries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Encrypted thought (AES-256-GCM hex string)
    encrypted_thought = Column(String, nullable=False)
    
    is_locked = Column(Boolean, default=True)
    locked_until = Column(DateTime, nullable=True)  # Lock duration
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    # Relationships
    user = relationship("User", back_populates="worries")

    @property
    def thought(self) -> str:
        """Decrypt and return the locked worry."""
        return decrypt_text(self.encrypted_thought)


class Gratitude(Base):
    __tablename__ = "gratitudes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Gratitude items do not strictly need encryption, but are stored safely
    win_text = Column(String, nullable=False)  # Tiny daily non-exam win
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    # Relationships
    user = relationship("User", back_populates="gratitudes")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    role = Column(String, nullable=False)  # 'user' or 'bono'
    message_text = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    # Relationships
    user = relationship("User", back_populates="chats")
