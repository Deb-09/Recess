from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# Determine engine url and arguments based on DB scheme
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine_args = {}
if db_url.startswith("sqlite"):
    # SQLite check_same_thread setting is required for multiple threads/async loops
    engine_args["connect_args"] = {"check_same_thread": False}

# Create async engine
engine = create_async_engine(
    db_url,
    echo=False,
    **engine_args
)

# Async session maker
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Base class for DB models
Base = declarative_base()

async def get_db():
    """Dependency injection generator to yield active database sessions."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
