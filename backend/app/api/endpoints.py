from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from app.db.session import get_db
from app.models.schemas import User, JournalEntry, Worry, Gratitude, ChatMessage
from app.schemas.schemas import (
    UserCreate, UserLogin, UserResponse, Token, JournalCreate, JournalResponse,
    WorryCreate, WorryResponse, GratitudeCreate, GratitudeResponse,
    ChatMessageBase, ChatResponse
)
from app.core.security import (
    get_password_hash, verify_password, create_access_token, decode_access_token,
    encrypt_text
)
from app.services.bono_ai import analyze_student_input, analyze_journal_sentiment

router = APIRouter()

# --- Custom Auth Dependency ---
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    # Attempt to extract JWT from HTTP-only cookie
    token = request.cookies.get("access_token")
    
    # Fallback to Authorization Header if cookies are disabled / for testing
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session required. Please sign in."
        )
        
    user_id_str = decode_access_token(token)
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token. Please log in again."
        )
        
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed session token."
        )
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
    return user


# --- Authentication Routes ---

@router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account is already registered with this email."
        )
        
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        name=user_in.name,
        target_exam=user_in.target_exam
    )
    db.add(new_user)
    await db.flush()  # Populates new_user.id
    
    # Create token & set cookie
    token = create_access_token(subject=new_user.id)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=60 * 24 * 7 * 60  # 7 Days in seconds
    )
    
    return new_user

@router.post("/auth/login")
async def login(response: Response, user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )
        
    token = create_access_token(subject=user.id)
    
    # Set HttpOnly, Secure cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,  # Set True in production
        samesite="lax",
        max_age=60 * 24 * 7 * 60
    )
    
    return {"status": "success", "user": {"email": user.email, "name": user.name, "target_exam": user.target_exam}}

@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"status": "success", "message": "Successfully logged out."}

@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# --- Bono Chat Routes ---

@router.post("/bono/chat", response_model=ChatResponse)
async def chat_with_bono(
    payload: ChatMessageBase,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Save user message
    user_msg = ChatMessage(user_id=current_user.id, role="user", message_text=payload.message_text)
    db.add(user_msg)
    
    # Call AI Companion analyzer
    ai_analysis = await analyze_student_input(payload.message_text)
    
    # Save Bono response
    bono_msg = ChatMessage(
        user_id=current_user.id,
        role="bono",
        message_text=ai_analysis["response_text"]
    )
    db.add(bono_msg)
    
    return ChatResponse(
        response_text=ai_analysis["response_text"],
        bono_mood=ai_analysis["bono_mood"],
        identified_triggers=ai_analysis["identified_triggers"],
        cognitive_distortions=ai_analysis["cognitive_distortions"],
        helplines=ai_analysis.get("helplines")
    )

@router.get("/bono/history", response_model=List[dict])
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
        .limit(100)
    )
    messages = result.scalars().all()
    return [{"role": msg.role, "text": msg.message_text, "created_at": msg.created_at} for msg in messages]


# --- Journal Routes (AES-256 Encrypted) ---

@router.post("/journal", response_model=JournalResponse)
async def create_journal_entry(
    entry_in: JournalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Perform NLP sentiment and distortion analysis on content prior to encryption
    sentiment_data = await analyze_journal_sentiment(entry_in.content)
    
    # Encrypt title & content before storage
    encrypted_title = encrypt_text(entry_in.title)
    encrypted_content = encrypt_text(entry_in.content)
    
    new_entry = JournalEntry(
        user_id=current_user.id,
        encrypted_title=encrypted_title,
        encrypted_content=encrypted_content,
        sentiment_score=sentiment_data["sentiment_score"],
        sentiment_label=sentiment_data["sentiment_label"],
        cognitive_distortions=sentiment_data["cognitive_distortions"]
    )
    db.add(new_entry)
    await db.flush()
    
    return JournalResponse(
        id=new_entry.id,
        user_id=new_entry.user_id,
        title=entry_in.title,
        content=entry_in.content,
        sentiment_score=new_entry.sentiment_score,
        sentiment_label=new_entry.sentiment_label,
        cognitive_distortions=new_entry.cognitive_distortions,
        created_at=new_entry.created_at
    )

@router.get("/journal", response_model=List[JournalResponse])
async def list_journal_entries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(JournalEntry)
        .where(JournalEntry.user_id == current_user.id)
        .order_by(JournalEntry.created_at.desc())
    )
    entries = result.scalars().all()
    
    response_list = []
    for e in entries:
        try:
            # Decrypts transparently using db property calls
            response_list.append(
                JournalResponse(
                    id=e.id,
                    user_id=e.user_id,
                    title=e.title,
                    content=e.content,
                    sentiment_score=e.sentiment_score,
                    sentiment_label=e.sentiment_label,
                    cognitive_distortions=e.cognitive_distortions,
                    created_at=e.created_at
                )
            )
        except Exception:
            # Handle key mismatch/corrupt data gracefully
            continue
            
    return response_list


# --- Worry Box Routes (AES-256 Encrypted thought) ---

@router.post("/workouts/worry", response_model=WorryResponse)
async def lock_away_worry(
    worry_in: WorryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    encrypted_thought = encrypt_text(worry_in.thought)
    locked_until = datetime.now(timezone.utc) + timedelta(hours=worry_in.lock_duration_hours)
    
    new_worry = Worry(
        user_id=current_user.id,
        encrypted_thought=encrypted_thought,
        is_locked=True,
        locked_until=locked_until
    )
    db.add(new_worry)
    await db.flush()
    
    return WorryResponse(
        id=new_worry.id,
        user_id=new_worry.user_id,
        thought="[Locked away in your Worry Box]",  # Mask thought if locked
        is_locked=True,
        locked_until=new_worry.locked_until,
        created_at=new_worry.created_at
    )

@router.get("/workouts/worry", response_model=List[WorryResponse])
async def list_worries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Worry)
        .where(Worry.user_id == current_user.id)
        .order_by(Worry.created_at.desc())
    )
    worries = result.scalars().all()
    
    now = datetime.now(timezone.utc)
    response_list = []
    
    for w in worries:
        is_locked = w.is_locked
        if is_locked and w.locked_until and now >= w.locked_until.replace(tzinfo=timezone.utc):
            # Unlock automatically if time has elapsed
            w.is_locked = False
            is_locked = False
            
        response_list.append(
            WorryResponse(
                id=w.id,
                user_id=w.user_id,
                thought=w.thought if not is_locked else "[Locked away in your Worry Box]",
                is_locked=is_locked,
                locked_until=w.locked_until,
                created_at=w.created_at
            )
        )
    return response_list


# --- Gratitude Jar Routes ---

@router.post("/workouts/gratitude", response_model=GratitudeResponse)
async def add_gratitude(
    grat_in: GratitudeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_grat = Gratitude(
        user_id=current_user.id,
        win_text=grat_in.win_text
    )
    db.add(new_grat)
    await db.flush()
    
    return new_grat

@router.get("/workouts/gratitude", response_model=List[GratitudeResponse])
async def list_gratitudes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Gratitude)
        .where(Gratitude.user_id == current_user.id)
        .order_by(Gratitude.created_at.desc())
    )
    return result.scalars().all()
