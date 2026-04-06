import logging
import time
import re
from collections import defaultdict
from threading import Lock

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
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
from routers.analytics import router as analytics_router
from routers.purchase_orders import router as purchase_orders_router
from routers.product_returns import router as product_returns_router
from routers.archive import router as archive_router
from database import get_connection, verify_database_connection

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("invensight.main")

app = FastAPI(title="InvenSight API", version="1.0.0")


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
        self.lock = Lock()

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        with self.lock:
            self.requests[key] = [
                t for t in self.requests[key] if now - t < self.window_seconds
            ]
            if len(self.requests[key]) >= self.max_requests:
                return False
            self.requests[key].append(now)
            return True


login_limiter = RateLimiter(max_requests=5, window_seconds=60)
api_limiter = RateLimiter(max_requests=100, window_seconds=60)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    path = request.url.path

    if path == "/api/login":
        if not login_limiter.is_allowed(f"login:{client_ip}"):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many login attempts. Please try again later."},
            )
    elif path.startswith("/api/"):
        if not api_limiter.is_allowed(f"api:{client_ip}"):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
            )

    response = await call_next(request)
    return response


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return response


@app.on_event("startup")
async def widen_anyio_thread_limit():
    """Heavy sync routes (Prophet/STAN, bcrypt) run in AnyIO's thread pool; raise cap to avoid starving login."""
    try:
        import anyio.to_thread

        limiter = anyio.to_thread.current_default_thread_limiter()
        limiter.total_tokens = max(int(limiter.total_tokens), 128)
    except Exception as e:
        log.warning("Could not widen thread limiter: %s", e)

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
app.include_router(product_returns_router, prefix="/api/product-returns", tags=["Product Returns"])
app.include_router(dashboard_router, prefix="/api")
app.include_router(analytics_router, prefix="/api/analytics")
app.include_router(archive_router, prefix="/api/archive", tags=["Archive"])

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
    ("Cashier", "Point of Sale transactions only"),
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
def ensure_products_extra_columns():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_of_measurement VARCHAR(50)")
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS specific_category VARCHAR(150)")
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS pos_price DECIMAL(10, 2)")
            cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'")
            cur.execute("UPDATE products SET status = 'Active' WHERE status IS NULL OR status = ''")
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
            cur.execute("""
                CREATE TABLE IF NOT EXISTS auditlog (
                    log_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id),
                    action VARCHAR(100) NOT NULL,
                    entity_type VARCHAR(100),
                    entity_id INTEGER,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    details TEXT
                )
            """)
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
def ensure_product_returns_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS product_returns (
                    return_id SERIAL PRIMARY KEY,
                    supplier_id INTEGER REFERENCES supplier(supplier_id),
                    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                    reason TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    approved_at TIMESTAMP,
                    rejected_at TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS product_return_items (
                    item_id SERIAL PRIMARY KEY,
                    return_id INTEGER REFERENCES product_returns(return_id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES products(product_id),
                    quantity INTEGER NOT NULL
                )
            """)

            # Ensure newer columns exist on older databases
            cur.execute("ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES supplier(supplier_id)")
            cur.execute("ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Pending'")
            cur.execute("ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT ''")
            cur.execute("ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            cur.execute("ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP")
            cur.execute("ALTER TABLE product_returns ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP")

            # Clean up legacy columns from older schema where product_returns stored a single product/quantity
            cur.execute("ALTER TABLE product_returns DROP COLUMN IF EXISTS quantity")
            cur.execute("ALTER TABLE product_returns DROP COLUMN IF EXISTS product_id")

            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Product returns schema migration error: {e}")
    finally:
        conn.close()


@app.on_event("startup")
def ensure_inventory_stock_events_schema():
    """
    Traceability ledger for inventory mutations (PO pending/received, returns, manual adjustments).
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS inventory_stock_events (
                    event_id SERIAL PRIMARY KEY,
                    inventory_id INTEGER REFERENCES inventory(inventory_id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
                    event_type VARCHAR(50) NOT NULL,
                    quantity_before INTEGER NOT NULL,
                    quantity_after INTEGER NOT NULL,
                    expected_before INTEGER NOT NULL,
                    expected_after INTEGER NOT NULL,
                    actual_before INTEGER NOT NULL,
                    actual_after INTEGER NOT NULL,
                    quantity_delta INTEGER NOT NULL,
                    expected_delta INTEGER NOT NULL,
                    actual_delta INTEGER NOT NULL,
                    difference_before INTEGER NOT NULL,
                    difference_after INTEGER NOT NULL,
                    reference_type VARCHAR(50) NOT NULL DEFAULT '',
                    reference_id VARCHAR(50) NOT NULL DEFAULT '',
                    reason TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cur.execute("""
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'inventory_stock_events_inventory_id_fkey' 
                AND table_name = 'inventory_stock_events'
            """)
            if cur.fetchone():
                cur.execute("""
                    ALTER TABLE inventory_stock_events 
                    DROP CONSTRAINT inventory_stock_events_inventory_id_fkey,
                    ADD CONSTRAINT inventory_stock_events_inventory_id_fkey 
                    FOREIGN KEY (inventory_id) REFERENCES inventory(inventory_id) ON DELETE CASCADE
                """)
            
            cur.execute("""
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'inventory_stock_events_product_id_fkey' 
                AND table_name = 'inventory_stock_events'
            """)
            if cur.fetchone():
                cur.execute("""
                    ALTER TABLE inventory_stock_events 
                    DROP CONSTRAINT inventory_stock_events_product_id_fkey,
                    ADD CONSTRAINT inventory_stock_events_product_id_fkey 
                    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
                """)
            
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Inventory stock events schema migration error: {e}")
    finally:
        conn.close()


@app.on_event("startup")
def ensure_product_price_history_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS product_price_history (
                    history_id SERIAL PRIMARY KEY,
                    product_id INTEGER REFERENCES products(product_id),
                    old_price DECIMAL(10, 2),
                    new_price DECIMAL(10, 2),
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    changed_by INTEGER
                )
            """)
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Product price history schema migration error: {e}")
    finally:
        conn.close()


@app.on_event("startup")
def ensure_analytics_cache_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS analytics_model_cache (
                    model_key VARCHAR(100) PRIMARY KEY,
                    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                    model_engine VARCHAR(30) NOT NULL DEFAULT 'unknown',
                    status VARCHAR(30) NOT NULL DEFAULT 'not_trained',
                    message TEXT NOT NULL DEFAULT '',
                    last_trained_at TIMESTAMP,
                    last_requested_at TIMESTAMP,
                    training_duration_ms INTEGER,
                    next_scheduled_run TIMESTAMP
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS analytics_model_runs (
                    run_id SERIAL PRIMARY KEY,
                    model_key VARCHAR(100) NOT NULL,
                    model_engine VARCHAR(30) NOT NULL DEFAULT 'unknown',
                    status VARCHAR(30) NOT NULL DEFAULT 'unknown',
                    message TEXT NOT NULL DEFAULT '',
                    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    finished_at TIMESTAMP,
                    duration_ms INTEGER
                )
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_analytics_model_runs_key_time ON analytics_model_runs(model_key, started_at DESC)"
            )
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Analytics schema migration error: {e}")
    finally:
        conn.close()


@app.on_event("startup")
def start_analytics_scheduler():
    from analytics_cache_jobs import start_scheduler

    start_scheduler()


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
            cur.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Paid'")
            cur.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS failure_reason TEXT")
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
def ensure_settings_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    description TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                INSERT INTO system_settings (setting_key, setting_value, description)
                VALUES ('tax_rate', '0.03', 'Current sales tax rate (3%)')
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = '0.03', updated_at = CURRENT_TIMESTAMP
            """)
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Settings schema migration error: {e}")
    finally:
        conn.close()


@app.on_event("startup")
def seed_default_roles():
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            import json
            # Default permissions for each role
            _DEFAULT_PERMS = {
                "administrator": {
                    "Sales": ["View", "Add", "Edit", "Delete"],
                    "Inventory": ["View", "Add Item", "Edit", "Delete"],
                    "Products": ["View", "Add Product", "Edit", "Delete"],
                    "Suppliers": ["View", "Add Supplier", "Edit", "Delete"],
                    "Reports": ["View", "Generate Report"],
                    "User Management": ["View", "Add User", "Edit User", "Delete User"],
                    "Role Permissions": ["View", "Create", "Edit", "Delete"],
                    "Forecasting": ["View", "Generate Forecast"],
                    "Stock Prediction": ["View", "Run Prediction"],
                    "Audit Log": ["View", "Export"],
                    "Purchase Order": ["View", "Create Order", "Edit", "Delete"],
                    "Product Return": ["View", "Process Return", "Edit"]
                },
                "manager": {
                    "Sales": ["View", "Add", "Edit"],
                    "Inventory": ["View", "Add Item", "Edit"],
                    "Products": ["View", "Add Product", "Edit"],
                    "Suppliers": ["View", "Add Supplier", "Edit"],
                    "Reports": ["View", "Generate Report"],
                    "Forecasting": ["View", "Generate Forecast"],
                    "Stock Prediction": ["View", "Run Prediction"],
                    "Purchase Order": ["View", "Create Order", "Edit"],
                    "Product Return": ["View", "Process Return", "Edit"]
                },
                "sales staff": {
                    "Sales": ["View", "Add"],
                    "Inventory": ["View"],
                    "Products": ["View"],
                    "Product Return": ["View", "Process Return"]
                },
                "warehouse staff": {
                    "Inventory": ["View", "Add Item", "Edit"],
                    "Products": ["View"],
                    "Suppliers": ["View"],
                    "Purchase Order": ["View"],
                    "Product Return": ["View", "Process Return"]
                },
                "cashier": {
                    "Sales": ["View", "Add"]
                }
            }
            for name, desc in DEFAULT_ROLE_TEMPLATES:
                cur.execute(
                    "SELECT 1 FROM roles WHERE user_id IS NULL AND LOWER(role_name) = LOWER(%s)",
                    (name,),
                )
                if cur.fetchone():
                    continue
                
                cur.execute("SELECT COALESCE(MAX(role_id), 0) AS n FROM roles")
                next_id = cur.fetchone()[0] + 1
                
                perms = _DEFAULT_PERMS.get(name.lower(), {})
                cur.execute(
                    """
                    INSERT INTO roles (role_id, role_name, user_id, permissions_text)
                    VALUES (%s, %s, NULL, %s)
                    """,
                    (next_id, name, json.dumps(perms)),
                )
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.get("/")
def root():
    return {"status": "InvenSight API is running"}
