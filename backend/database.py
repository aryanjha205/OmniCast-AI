import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("db")

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "iptv.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"
NEON_DATABASE_URL = f"sqlite:///{DB_PATH}"
SQLITE_FALLBACK_URL = f"sqlite:///{DB_PATH}"

engine = None
SessionLocal = None

def get_engine():
    global engine, SessionLocal
    if engine is not None:
        return engine

    try:
        logger.info(f"Connecting to primary SQLite database at {DB_PATH}...")
        engine = create_engine(
            f"sqlite:///{DB_PATH}",
            connect_args={"check_same_thread": False}
        )
    except Exception as e:
        logger.warning(f"Error connecting to database: {e}")
        engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
    
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
