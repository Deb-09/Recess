from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from sqlalchemy.future import select

from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.models.schemas import User
from app.api.endpoints import router as api_router

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recess")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing Recess Database Engine...")
    async with engine.begin() as conn:
        # Transparently create DB tables if they do not exist
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Recess Database initialized successfully.")
    
    # Auto-seed demo user for frictionless local developer checkouts
    async with SessionLocal() as db:
        try:
            result = await db.execute(select(User).where(User.email == "bono@recess.com"))
            existing_user = result.scalars().first()
            if not existing_user:
                logger.info("Database empty of demo user. Seeding default demo account...")
                from app.core.security import get_password_hash
                demo_user = User(
                    email="bono@recess.com",
                    hashed_password=get_password_hash("recessbuddy"),
                    name="Bono's Friend",
                    target_exam="JEE"
                )
                db.add(demo_user)
                await db.commit()
                logger.info("Demo user (bono@recess.com / recessbuddy) seeded successfully.")
            else:
                logger.info("Demo user already exists. Skipping seeding.")
        except Exception as e:
            logger.error(f"Error seeding database: {str(e)}", exc_info=True)
            
    yield
    # Shutdown actions
    await engine.dispose()
    logger.info("Recess Database connections cleaned up.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
)

# CORS configurations for security
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach API endpoints router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Global safe error handling to prevent details leak
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error at path {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A secure server error occurred. Please contact Recess support."}
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "recess-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
