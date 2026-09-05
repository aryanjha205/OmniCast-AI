import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("db")

NEON_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./iptv.db"
)
SQLITE_FALLBACK_URL = os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./iptv.db")

engine = None
SessionLocal = None

def get_engine():
    global engine, SessionLocal
    if engine is not None:
        return engine

    try:
        logger.info("Attempting connection to primary PostgreSQL database...")
        temp_engine = create_engine(
            NEON_DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"connect_timeout": 10} if "postgresql" in NEON_DATABASE_URL else {}
        )
        with temp_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Successfully connected to PostgreSQL database!")
        engine = temp_engine
    except Exception as e:
        logger.warning(f"Failed to connect to primary database ({e}). Falling back to SQLite database...")
        engine = create_engine(
            SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False}
        )
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine

def get_session():
    get_engine()
    return SessionLocal()

Base = declarative_base()

def get_db():
    db = get_session()
    try:
        yield db
    finally:
        db.close()
