import logging
import os
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

logger = logging.getLogger("invensight.database")

# Load .env from server/ first, then repo root (works no matter where uvicorn is started from)
_here = Path(__file__).resolve().parent
load_dotenv(_here / ".env")
load_dotenv(_here.parent / ".env")


def _connect_timeout() -> int:
    return int(os.getenv("DB_CONNECT_TIMEOUT", "10"))


def get_connection():
    """Open a new PostgreSQL connection (one per request / use block) with retry resilience."""
    url = os.getenv("DATABASE_URL", "").strip()
    timeout = _connect_timeout()
    
    for attempt in range(2):
        try:
            if url:
                return psycopg2.connect(url, connect_timeout=timeout)
            
            # Use environment variables with sensible defaults for local development
            return psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", "5432")),
                dbname=os.getenv("DB_NAME", "InvenSight"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", ""), # Local-development fallback
                connect_timeout=timeout,
            )
        except psycopg2.OperationalError:
            if attempt == 0:
                import time
                time.sleep(0.5)
                continue
            raise


def verify_database_connection() -> None:
    """
    Called once on API startup. Ensures PostgreSQL is reachable and logs connection info.
    Fails fast if the database is not available (so you know before handling requests).
    """
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        safe = "DATABASE_URL"
    else:
        safe = (
            f"{os.getenv('DB_HOST', 'localhost')}:"
            f"{os.getenv('DB_PORT', '5432')}/"
            f"{os.getenv('DB_NAME', 'InvenSight')} "
            f"as {os.getenv('DB_USER', 'postgres')}"
        )
    logger.info("Opening database connection: %s", safe)

    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SELECT current_database(), current_user, version()")
            dbname, user, version = cur.fetchone()
        logger.info(
            "PostgreSQL ready — database=%r user=%r (%s)",
            dbname,
            user,
            version.split(",")[0] if version else "connected",
        )
    finally:
        conn.close()
