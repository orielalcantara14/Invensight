from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.products import router as products_router
from routers.sales import router as sales_router
from routers.users import router as users_router
from routers.auth import router as auth_router
from database import get_connection

app = FastAPI(title="InvenSight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router, prefix="/api")
app.include_router(sales_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

DEFAULT_ROLE_TEMPLATES = [
    ("Administrator", "Full system access, user management, reports"),
    ("Manager", "Sales, inventory, forecasting, reports"),
    ("Sales Staff", "Sales transactions, customer info"),
    ("Warehouse Staff", "Inventory, stock movements"),
]


@app.on_event("startup")
def ensure_products_image_column():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                ALTER TABLE products
                ADD COLUMN IF NOT EXISTS image_url text
                """
            )
            conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def ensure_users_roles_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)"
            )
            cur.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions_json JSONB DEFAULT '{}'::jsonb"
            )
            cur.execute(
                "ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions_text TEXT"
            )
            cur.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)"
            )
            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
                ON users (LOWER(username))
                WHERE username IS NOT NULL AND TRIM(username) <> ''
                """
            )
            conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def seed_default_roles():
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM roles WHERE user_id IS NULL")
            (count,) = cur.fetchone()
            if count and count > 0:
                conn.commit()
                return
            cur.execute("SELECT COALESCE(MAX(role_id), 0) AS n FROM roles")
            row = cur.fetchone()
            next_id = (row[0] or 0) + 1
            for name, desc in DEFAULT_ROLE_TEMPLATES:
                cur.execute(
                    """
                    INSERT INTO roles (role_id, role_name, user_id, permissions_text)
                    VALUES (%s, %s, NULL, %s)
                    """,
                    (next_id, name, desc),
                )
                next_id += 1
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.get("/")
def root():
    return {"status": "InvenSight API is running"}
