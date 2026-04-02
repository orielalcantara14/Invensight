import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from datetime import date
from routers.products import router as products_router
from routers.sales import router as sales_router
from routers.paymongo import router as paymongo_router
from routers.users import router as users_router
from routers.auth import router as auth_router
from routers.profile import router as profile_router
from routers.suppliers import router as suppliers_router
from routers.inventory import router as inventory_router
from routers.dashboard import router as dashboard_router
from routers.purchase_orders import router as purchase_orders_router
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
app.include_router(paymongo_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(suppliers_router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(purchase_orders_router, prefix="/api/purchase-orders", tags=["Purchase Orders"])
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
def ensure_products_and_categories_tables():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS supplier (
                    supplier_id INTEGER PRIMARY KEY,
                    supplier_name VARCHAR(255) NOT NULL,
                    address TEXT,
                    email VARCHAR(255),
                    contact_number VARCHAR(50),
                    product_supplied VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'Active'
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS categories (
                    category_id INTEGER PRIMARY KEY,
                    category_name VARCHAR(100) NOT NULL,
                    is_active BOOLEAN DEFAULT true
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    product_id INTEGER PRIMARY KEY,
                    category_id INTEGER REFERENCES categories(category_id),
                    supplier_id INTEGER,
                    product_name VARCHAR(255) NOT NULL,
                    image_url TEXT,
                    specific_category VARCHAR(150),
                    unit_price DECIMAL(10, 2),
                    pos_price DECIMAL(10, 2),
                    sku VARCHAR(100) UNIQUE,
                    date_added DATE,
                    unit_of_measurement VARCHAR(50)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pos_terminals (
                    terminal_id INTEGER PRIMARY KEY,
                    terminal_name VARCHAR(100) NOT NULL,
                    location VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'Active'
                )
            """)
            conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def ensure_products_and_pos_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Ensure products has supplier_id
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER")
            
            # Remove description column from products
            cur.execute("ALTER TABLE products DROP COLUMN IF EXISTS description")
            
            # Fix column lengths for existing tables
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
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS specific_category VARCHAR(150)")
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS pos_price DECIMAL(10, 2)")
            conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def ensure_inventory_schema():
    conn = get_connection()
    try:
        # Step 1: Basic table creation
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS inventory (
                    inventory_id INTEGER PRIMARY KEY,
                    product_id INTEGER REFERENCES products(product_id),
                    quantity INTEGER NOT NULL DEFAULT 0,
                    expected INTEGER NOT NULL DEFAULT 0,
                    actual INTEGER NOT NULL DEFAULT 0,
                    reorder_level INTEGER NOT NULL DEFAULT 10,
                    last_updated DATE NOT NULL,
                    reason_adjustment TEXT NOT NULL DEFAULT ''
                )
            """)
        conn.commit()

        # Step 2: Add missing columns
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 0")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expected INTEGER NOT NULL DEFAULT 0")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS actual INTEGER NOT NULL DEFAULT 0")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_level INTEGER NOT NULL DEFAULT 10")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_updated DATE")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reason_adjustment TEXT NOT NULL DEFAULT ''")
        conn.commit()

        # Step 3: Data fixes and migrations
        with conn.cursor() as cur:
            cur.execute("UPDATE inventory SET last_updated = %s WHERE last_updated IS NULL", (date.today(),))
            cur.execute("UPDATE inventory SET reason_adjustment = '' WHERE reason_adjustment IS NULL")
            
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'inventory' AND column_name = 'quantity_on_hand'
            """)
            if cur.fetchone():
                cur.execute("UPDATE inventory SET quantity = quantity_on_hand WHERE (quantity = 0 OR quantity IS NULL) AND quantity_on_hand IS NOT NULL")
        conn.commit()

        # Step 4: Set NOT NULL constraints
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE inventory ALTER COLUMN quantity SET NOT NULL")
            cur.execute("ALTER TABLE inventory ALTER COLUMN expected SET NOT NULL")
            cur.execute("ALTER TABLE inventory ALTER COLUMN actual SET NOT NULL")
            cur.execute("ALTER TABLE inventory ALTER COLUMN reorder_level SET NOT NULL")
            cur.execute("ALTER TABLE inventory ALTER COLUMN last_updated SET NOT NULL")
            cur.execute("ALTER TABLE inventory ALTER COLUMN reason_adjustment SET NOT NULL")
        conn.commit()

        # Step 5: Cleanup
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE inventory DROP COLUMN IF EXISTS quantity_on_hand")
            cur.execute("ALTER TABLE inventory DROP COLUMN IF EXISTS supplier_id")
            cur.execute("ALTER TABLE inventory DROP COLUMN IF EXISTS location_shelf")
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Schema migration error: {e}")
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
            cur.execute("ALTER TABLE inventory ALTER COLUMN inventory_id TYPE INTEGER")
            cur.execute("ALTER TABLE inventory ALTER COLUMN product_id TYPE INTEGER")
            cur.execute("ALTER TABLE inventory ALTER COLUMN quantity TYPE INTEGER")
            cur.execute("ALTER TABLE inventory ALTER COLUMN expected TYPE INTEGER")
            cur.execute("ALTER TABLE inventory ALTER COLUMN actual TYPE INTEGER")
            cur.execute("ALTER TABLE inventory ALTER COLUMN reorder_level TYPE INTEGER")
            cur.execute("ALTER TABLE products ALTER COLUMN product_id TYPE INTEGER")
            cur.execute("ALTER TABLE products ALTER COLUMN category_id TYPE INTEGER")
            cur.execute("ALTER TABLE products ALTER COLUMN supplier_id TYPE INTEGER")
            
            # Drop pos_management table as requested
            cur.execute("DROP TABLE IF EXISTS pos_management CASCADE")
            conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def ensure_purchase_orders_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    order_id VARCHAR(50) PRIMARY KEY,
                    supplier_id INTEGER REFERENCES supplier(supplier_id),
                    user_id INTEGER REFERENCES users(user_id),
                    status VARCHAR(50) DEFAULT 'Pending',
                    expected_delivery DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    received_at TIMESTAMP,
                    total_items INTEGER DEFAULT 0,
                    notes TEXT
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS purchase_order_items (
                    item_id SERIAL PRIMARY KEY,
                    order_id VARCHAR(50) REFERENCES purchase_orders(order_id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES products(product_id),
                    quantity INTEGER NOT NULL,
                    unit_price DECIMAL(10, 2)
                )
            """)
            cur.execute("ALTER TABLE supplier ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0")
            cur.execute("ALTER TABLE supplier ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0")
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Purchase orders schema migration error: {e}")
    finally:
        conn.close()


@app.on_event("startup")
def ensure_payments_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS paymongo_source_id VARCHAR(255)")
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Schema migration error for payments table: {e}")
    finally:
        conn.close()


@app.on_event("startup")
def ensure_sales_invoice_id_sequence():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'sales' AND column_name = 'invoice_id'
            """)
            result = cur.fetchone()
            if not result or not result[0]:
                cur.execute("CREATE SEQUENCE IF NOT EXISTS sales_invoice_id_seq")
                cur.execute("""
                    ALTER TABLE sales
                    ALTER COLUMN invoice_id SET DEFAULT nextval('sales_invoice_id_seq')
                """)
                cur.execute("""
                    SELECT setval('sales_invoice_id_seq', COALESCE((SELECT MAX(invoice_id) FROM sales), 0) + 1)
                """)
            cur.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_received DECIMAL(10, 2)")
            cur.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10, 2)")
            cur.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_given DECIMAL(10, 2)")
            cur.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50)")
            cur.execute("""
                INSERT INTO pos_terminals (terminal_id, terminal_name, location, status, pos_id)
                SELECT 1, 'POS Terminal #01', 'Main', 'Active', 1
                WHERE NOT EXISTS (SELECT 1 FROM pos_terminals WHERE terminal_id = 1)
            """)
            cur.execute("""
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'sold_items' AND column_name = 'sold_item_id'
            """)
            result = cur.fetchone()
            if not result or not result[0]:
                cur.execute("CREATE SEQUENCE IF NOT EXISTS sold_items_sold_item_id_seq")
                cur.execute("""
                    ALTER TABLE sold_items
                    ALTER COLUMN sold_item_id SET DEFAULT nextval('sold_items_sold_item_id_seq')
                """)
                cur.execute("""
                    SELECT setval('sold_items_sold_item_id_seq', COALESCE((SELECT MAX(sold_item_id) FROM sold_items), 0) + 1)
                """)
            cur.execute("""
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = 'payments' AND column_name = 'payment_id'
            """)
            result = cur.fetchone()
            if not result or not result[0]:
                cur.execute("CREATE SEQUENCE IF NOT EXISTS payments_payment_id_seq")
                cur.execute("""
                    ALTER TABLE payments
                    ALTER COLUMN payment_id SET DEFAULT nextval('payments_payment_id_seq')
                """)
                cur.execute("""
                    SELECT setval('payments_payment_id_seq', COALESCE((SELECT MAX(payment_id) FROM payments), 0) + 1)
                """)
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Schema migration error for sales invoice_id: {e}")
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
