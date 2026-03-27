import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from routers.products import router as products_router
from routers.sales import router as sales_router
from routers.users import router as users_router
from routers.auth import router as auth_router
from routers.profile import router as profile_router
from routers.suppliers import router as suppliers_router
from routers.inventory import router as inventory_router
from routers.dashboard import router as dashboard_router
from database import get_connection, verify_database_connection

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("invensight.main")

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
app.include_router(profile_router, prefix="/api")
app.include_router(suppliers_router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(dashboard_router, prefix="/api")

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Mount the uploads directory to /uploads path
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

DEFAULT_ROLE_TEMPLATES = [
    ("Administrator", "Full system access, user management, reports"),
    ("Manager", "Sales, inventory, forecasting, reports"),
    ("Sales Staff", "Sales transactions, customer info"),
    ("Warehouse Staff", "Inventory, stock movements"),
]


@app.on_event("startup")
def connect_database_on_startup():
    """Verify PostgreSQL is up as soon as the API starts (auto-connect)."""
    verify_database_connection()


@app.on_event("startup")
def ensure_products_and_pos_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Ensure products has supplier_id
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER")
            
            # Ensure pos_management exists and has correct columns
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pos_management (
                    pos_id INTEGER PRIMARY KEY,
                    product_id INTEGER REFERENCES products(product_id),
                    inventory_id INTEGER REFERENCES inventory(inventory_id),
                    category_id INTEGER REFERENCES categories(category_id),
                    sku VARCHAR(100),
                    product_name VARCHAR(255),
                    category VARCHAR(100),
                    stock INTEGER DEFAULT 0,
                    pos_price DECIMAL(10, 2),
                    status VARCHAR(50) DEFAULT 'Active'
                )
            """)
            
            cur.execute("ALTER TABLE pos_management ADD COLUMN IF NOT EXISTS inventory_id INTEGER")
            cur.execute("ALTER TABLE pos_management ADD COLUMN IF NOT EXISTS category_id INTEGER")
            cur.execute("ALTER TABLE pos_management ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'")
            
            # Fix column lengths for existing tables
            cur.execute("ALTER TABLE pos_management ALTER COLUMN sku TYPE VARCHAR(100)")
            cur.execute("ALTER TABLE pos_management ALTER COLUMN category TYPE VARCHAR(100)")
            cur.execute("ALTER TABLE pos_management ALTER COLUMN status TYPE VARCHAR(50)")
            cur.execute("ALTER TABLE products ALTER COLUMN sku TYPE VARCHAR(100)")
            cur.execute("ALTER TABLE supplier ALTER COLUMN status TYPE VARCHAR(50)")
            
            # Ensure supplier_id in products is a foreign key
            try:
                cur.execute("""
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'fk_products_supplier' 
                    AND table_name = 'products'
                """)
                if not cur.fetchone():
                    cur.execute("ALTER TABLE products ADD CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id)")
            except:
                pass

            conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def ensure_products_image_column():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text")
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_of_measurement VARCHAR(50)")
            conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def ensure_inventory_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Create table if it doesn't exist
            cur.execute("""
                CREATE TABLE IF NOT EXISTS inventory (
                    inventory_id INTEGER PRIMARY KEY,
                    product_id INTEGER REFERENCES products(product_id),
                    quantity_on_hand INTEGER DEFAULT 0,
                    reorder_level INTEGER DEFAULT 10,
                    last_updated DATE,
                    supplier_id INTEGER REFERENCES supplier(supplier_id)
                )
            """)
            
            # Ensure columns exist (for existing tables)
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity_on_hand INTEGER DEFAULT 0")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_id INTEGER")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10")
            
            # Fix existing null values for new columns
            cur.execute("UPDATE inventory SET quantity_on_hand = 0 WHERE quantity_on_hand IS NULL")
            cur.execute("UPDATE inventory SET reorder_level = 10 WHERE reorder_level IS NULL")
            
            # Make columns nullable for flexibility
            cur.execute("ALTER TABLE inventory ALTER COLUMN last_updated DROP NOT NULL")
            cur.execute("ALTER TABLE inventory ALTER COLUMN location_shelf DROP NOT NULL")
            cur.execute("ALTER TABLE inventory ALTER COLUMN reorder_level DROP NOT NULL")
            
            # Ensure supplier_id is a foreign key if table supplier exists
            try:
                cur.execute("""
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'fk_inventory_supplier' 
                    AND table_name = 'inventory'
                """)
                if not cur.fetchone():
                    cur.execute("ALTER TABLE inventory ADD CONSTRAINT fk_inventory_supplier FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id)")
            except:
                pass 
            
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
            cur.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT"
            )
            cur.execute(
                "ALTER TABLE supplier ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active'"
            )
            cur.execute(
                "ALTER TABLE supplier ALTER COLUMN product_supplied TYPE VARCHAR(255)"
            )
            cur.execute(
                "ALTER TABLE supplier ALTER COLUMN address DROP NOT NULL"
            )
            cur.execute(
                "ALTER TABLE supplier ALTER COLUMN email DROP NOT NULL"
            )
            cur.execute(
                "ALTER TABLE supplier ALTER COLUMN contact_number DROP NOT NULL"
            )
            cur.execute(
                "ALTER TABLE supplier ALTER COLUMN product_supplied DROP NOT NULL"
            )
            conn.commit()
            cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS phone")
            cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS bio")
            cur.execute(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at DATE"
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
