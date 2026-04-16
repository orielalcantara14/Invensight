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
import bcrypt
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
from routers.customer_returns import router as customer_returns_router
from routers.archive import router as archive_router
from routers.notifications import router as notifications_router
from routers.settings import router as settings_router
from routers.reports import router as reports_router
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
def init_database_schema():
    """Create all base tables and sequences (Deterministic schema for new environments)."""
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            # 1. Sequences
            cur.execute("CREATE SEQUENCE IF NOT EXISTS sales_invoice_id_seq")
            cur.execute("CREATE SEQUENCE IF NOT EXISTS sold_items_sold_item_id_seq")
            cur.execute("CREATE SEQUENCE IF NOT EXISTS payments_payment_id_seq")

            # 2. Base Tables (Order matters for FKs)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS roles (
                    role_id SERIAL PRIMARY KEY,
                    role_name VARCHAR(100) NOT NULL UNIQUE,
                    permissions_text TEXT,
                    user_id INTEGER
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE,
                    full_name VARCHAR(255) NOT NULL,
                    employee_id SERIAL,
                    password_hash VARCHAR(255),
                    role VARCHAR(100),
                    is_active BOOLEAN DEFAULT TRUE,
                    last_login DATE,
                    permissions_json JSONB,
                    email VARCHAR(255),
                    address TEXT,
                    password_changed_at DATE,
                    failed_attempts INTEGER DEFAULT 0
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS supplier (
                    supplier_id SERIAL PRIMARY KEY,
                    supplier_name VARCHAR(255) NOT NULL,
                    address TEXT,
                    email VARCHAR(255),
                    contact_number VARCHAR(100),
                    product_supplied TEXT,
                    total_orders INTEGER DEFAULT 0,
                    completed_orders INTEGER DEFAULT 0,
                    status VARCHAR(50) DEFAULT 'Active'
                )
            """)
            # Migration: Ensure failed_attempts column exists
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='failed_attempts') THEN
                        ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;
                    END IF;
                END $$;
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS categories (
                    category_id SERIAL PRIMARY KEY,
                    category_name VARCHAR(100) NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS products (
                    product_id SERIAL PRIMARY KEY,
                    sku VARCHAR(100) UNIQUE,
                    product_name VARCHAR(255) NOT NULL,
                    category_id INTEGER REFERENCES categories(category_id),
                    supplier_id INTEGER REFERENCES supplier(supplier_id),
                    unit_price DECIMAL(10, 2) NOT NULL,
                    pos_price DECIMAL(10, 2),
                    unit_of_measurement VARCHAR(50),
                    specific_category VARCHAR(150),
                    status VARCHAR(50) DEFAULT 'Active',
                    date_added DATE DEFAULT CURRENT_DATE
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS inventory (
                    inventory_id SERIAL PRIMARY KEY,
                    product_id INTEGER REFERENCES products(product_id),
                    quantity INTEGER NOT NULL DEFAULT 0,
                    expected INTEGER NOT NULL DEFAULT 0,
                    actual INTEGER NOT NULL DEFAULT 0,
                    reorder_level INTEGER NOT NULL DEFAULT 10,
                    last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
                    reason_adjustment TEXT NOT NULL DEFAULT '',
                    status VARCHAR(50) DEFAULT 'Active'
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pos_terminals (
                    terminal_id SERIAL PRIMARY KEY,
                    terminal_name VARCHAR(100) NOT NULL,
                    location VARCHAR(255),
                    status VARCHAR(50) DEFAULT 'Active',
                    pos_id INTEGER
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sales (
                    invoice_id INTEGER PRIMARY KEY DEFAULT nextval('sales_invoice_id_seq'),
                    invoice_date DATE DEFAULT CURRENT_DATE,
                    total_amount DECIMAL(10, 2),
                    tax_amount DECIMAL(10, 2),
                    service_charge DECIMAL(10, 2),
                    customer_info TEXT,
                    customer_name VARCHAR(255),
                    contact_number VARCHAR(100),
                    address TEXT,
                    payment_method VARCHAR(50),
                    cash_received DECIMAL(10, 2),
                    cash_given DECIMAL(10, 2),
                    change_amount DECIMAL(10, 2),
                    payment_status VARCHAR(50) DEFAULT 'Paid',
                    failure_reason TEXT,
                    user_id INTEGER REFERENCES users(user_id),
                    pos_terminal_id INTEGER,
                    transaction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    paymongo_source_id VARCHAR(255),
                    invoice_id_old INTEGER
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sold_items (
                    sold_item_id INTEGER PRIMARY KEY DEFAULT nextval('sold_items_sold_item_id_seq'),
                    invoice_id INTEGER REFERENCES sales(invoice_id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES products(product_id),
                    quantity INTEGER NOT NULL,
                    unit_price DECIMAL(10, 2) NOT NULL,
                    subtotal DECIMAL(10, 2),
                    total_amount DECIMAL(10, 2)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                    payment_id INTEGER PRIMARY KEY DEFAULT nextval('payments_payment_id_seq'),
                    invoice_id INTEGER REFERENCES sales(invoice_id),
                    amount_paid DECIMAL(10, 2) NOT NULL,
                    payment_method VARCHAR(50),
                    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    transaction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    paymongo_source_id VARCHAR(255)
                )
            """)
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
            cur.execute("""
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    order_id VARCHAR(50) PRIMARY KEY,
                    supplier_id INTEGER REFERENCES supplier(supplier_id),
                    user_id INTEGER REFERENCES users(user_id),
                    status VARCHAR(50) DEFAULT 'Pending',
                    expected_delivery DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    received_at TIMESTAMP,
                    notes TEXT,
                    total_items INTEGER DEFAULT 0,
                    receipt_number VARCHAR(100)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS purchase_order_items (
                    item_id SERIAL PRIMARY KEY,
                    order_id VARCHAR(50) REFERENCES purchase_orders(order_id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES products(product_id),
                    quantity INTEGER NOT NULL,
                    unit_price DECIMAL(10, 2),
                    damage_count INTEGER DEFAULT 0
                )
            """)
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
                CREATE TABLE IF NOT EXISTS product_price_history (
                    history_id SERIAL PRIMARY KEY,
                    product_id INTEGER REFERENCES products(product_id),
                    old_price DECIMAL(10, 2),
                    new_price DECIMAL(10, 2),
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    changed_by INTEGER
                )
            """)
            cur.execute("""
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
            """)
            cur.execute("""
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
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_analytics_model_runs_key_time ON analytics_model_runs(model_key, started_at DESC)")
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    notification_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    type VARCHAR(50) NOT NULL,
                    title VARCHAR(150) NOT NULL,
                    message TEXT NOT NULL,
                    link VARCHAR(255),
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS customer_returns (
                    return_id SERIAL PRIMARY KEY,
                    rma_number VARCHAR(50) UNIQUE NOT NULL,
                    sale_id INTEGER REFERENCES sales(invoice_id),
                    customer_name VARCHAR(255),
                    contact_number VARCHAR(100),
                    return_date DATE DEFAULT CURRENT_DATE,
                    return_type VARCHAR(50) NOT NULL,
                    status VARCHAR(50) DEFAULT 'Pending',
                    reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS customer_return_items (
                    item_id SERIAL PRIMARY KEY,
                    return_id INTEGER REFERENCES customer_returns(return_id) ON DELETE CASCADE,
                    product_id INTEGER REFERENCES products(product_id),
                    quantity INTEGER NOT NULL,
                    is_defective BOOLEAN DEFAULT FALSE,
                    is_damaged BOOLEAN DEFAULT FALSE
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_settings (
                    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    setting_key VARCHAR(50) NOT NULL,
                    setting_value BOOLEAN NOT NULL DEFAULT true,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, setting_key)
                );
            """)
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS generated_reports (
                    report_id SERIAL PRIMARY KEY,
                    report_type VARCHAR(100) NOT NULL,
                    start_date DATE,
                    end_date DATE,
                    generated_by VARCHAR(255) NOT NULL,
                    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    description TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 3. Default Data
            cur.execute("""
                INSERT INTO system_settings (setting_key, setting_value, description)
                VALUES ('tax_rate', '0.03', 'Current sales tax rate (3%)')
                ON CONFLICT (setting_key) DO NOTHING
            """)
            
            # Ensure column exists before seeding
            cur.execute("ALTER TABLE pos_terminals ADD COLUMN IF NOT EXISTS pos_id INTEGER")
            
            cur.execute("""
                INSERT INTO pos_terminals (terminal_id, terminal_name, location, status, pos_id)
                VALUES (1, 'POS Terminal #01', 'Main', 'Active', 1)
                ON CONFLICT (terminal_id) DO NOTHING
            """)

            # 4. Seed or Update Root Admin
            username = os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo")
            password = os.getenv("ROOT_ADMIN_KEY", "changeit_now_123")
            
            if password:
                hash_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
                
                # Check if root admin exists
                cur.execute("SELECT user_id FROM users WHERE username = %s", (username,))
                existing = cur.fetchone()
                
                if not existing:
                    cur.execute(
                        """
                        INSERT INTO users (username, full_name, password_hash, role, is_active)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (username, "Root Admin", hash_pw, "administrator", True))
                    log.info("Seeded initial root admin account: %s", username)
                else:
                    cur.execute("""
                        UPDATE users SET password_hash = %s, is_active = TRUE, role = 'administrator'
                        WHERE username = %s
                    """, (hash_pw, username))
                    log.info("Synchronized root admin credentials for: %s", username)

            # 5. Seed Demo Data (If empty)
            cur.execute("SELECT COUNT(*) FROM products")
            if cur.fetchone()[0] == 0:
                log.info("Products empty. Seeding demo data...")
                    
                # Supplier
                cur.execute("""
                    INSERT INTO supplier (supplier_id, supplier_name, status)
                    VALUES (1, 'Main Supplier Corp', 'Active')
                    ON CONFLICT (supplier_id) DO NOTHING
                """)
                
                # Categories
                cur.execute("""
                    INSERT INTO categories (category_id, category_name)
                    VALUES (1, 'Engine Parts'), (2, 'Accessories')
                    ON CONFLICT (category_id) DO NOTHING
                """)
                
                # Products
                cur.execute("""
                    INSERT INTO products (product_id, category_id, supplier_id, product_name, sku, unit_price, pos_price, status)
                    VALUES 
                        (1, 1, 1, 'Spark Plug X-01', 'SPK-001', 150.00, 250.00, 'Active'),
                        (2, 2, 1, 'Premium Moto Helmet', 'HLM-001', 1200.00, 1800.00, 'Active')
                    ON CONFLICT (product_id) DO NOTHING
                """)
                
                # Inventory
                cur.execute("""
                    INSERT INTO inventory (inventory_id, product_id, quantity, expected, actual, reorder_level, last_updated)
                    VALUES 
                        (1, 1, 50, 50, 50, 10, CURRENT_DATE),
                        (2, 2, 15, 15, 15, 5, CURRENT_DATE)
                    ON CONFLICT (inventory_id) DO NOTHING
                """)
                log.info("Demo data seeded successfully.")

        log.info("Base database schema initialized.")
    except Exception as e:
        log.error("Failed to initialize base schema: %s", e)
    finally:
        conn.close()


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
app.include_router(customer_returns_router, prefix="/api/customer-returns", tags=["Customer Returns"])
app.include_router(dashboard_router, prefix="/api")
app.include_router(analytics_router, prefix="/api/analytics")
app.include_router(archive_router, prefix="/api/archive", tags=["Archive"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Mount the uploads directory to /uploads path
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

DEFAULT_ROLE_TEMPLATES = [
    ("Administrator", "Full system access, user management, and advanced reporting."),
    ("Manager", "Complete operational control, inventory management, and reporting."),
    ("Sales Staff", "Handles front-line sales, inventory viewing, and customer returns."),
    ("Cashier", "Restricted access for high-speed POS transactions only."),
]


@app.on_event("startup")
def connect_database_on_startup():
    """Verify PostgreSQL is up and initialize schema."""
    verify_database_connection()
    init_database_schema()


@app.on_event("startup")
def run_migrations():
    """Run data migrations and legacy fixes after the base schema is guaranteed to exist."""
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            # 1. Product Schema Fixes
            cur.execute("ALTER TABLE products DROP COLUMN IF EXISTS description")
            cur.execute("ALTER TABLE products ALTER COLUMN sku TYPE VARCHAR(100)")
            cur.execute("UPDATE products SET status = 'Active' WHERE status IS NULL OR status = ''")

            # 2. Inventory Migration (Legacy quantity_on_hand support)
            cur.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'inventory' AND column_name = 'quantity_on_hand'
            """)
            if cur.fetchone():
                cur.execute("UPDATE inventory SET quantity = quantity_on_hand WHERE quantity = 0 AND quantity_on_hand IS NOT NULL")
                cur.execute("ALTER TABLE inventory DROP COLUMN IF EXISTS quantity_on_hand")

            # 3. Sales & Sold Items Schema Fixes
            cur.execute("ALTER TABLE sales ADD COLUMN IF NOT EXISTS pos_terminal_id INTEGER")
            cur.execute("ALTER TABLE sold_items ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2)")
            cur.execute("UPDATE sold_items SET total_amount = subtotal WHERE total_amount IS NULL")

            # 4. Payments Schema Fixes
            cur.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'payments' AND column_name = 'amount'
            """)
            if cur.fetchone():
                cur.execute("ALTER TABLE payments RENAME COLUMN amount TO amount_paid")
            else:
                cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0")
            
            cur.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            
            # Sync legacy date column if it exists
            cur.execute("""
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'payments' AND column_name = 'payment_date'
            """)
            if cur.fetchone():
                cur.execute("UPDATE payments SET transaction_timestamp = payment_date WHERE transaction_timestamp IS NULL")
            else:
                cur.execute("UPDATE payments SET transaction_timestamp = CURRENT_TIMESTAMP WHERE transaction_timestamp IS NULL")

            # 5. User Schema Fixes
            cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS phone")
            cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS bio")
            
            # 6. Supplier Schema Fixes
            cur.execute("ALTER TABLE supplier ALTER COLUMN status TYPE VARCHAR(50)")
            cur.execute("ALTER TABLE supplier ALTER COLUMN product_supplied TYPE TEXT")

            # 6. Inventory Schema Fixes
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active'")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS serial_start VARCHAR(100)")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS serial_end VARCHAR(100)")
            cur.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry_date DATE")
            cur.execute("UPDATE inventory SET status = 'Active' WHERE status IS NULL OR status = ''")

            # 7. POS Terminals Fixes (Critical for seeding)
            cur.execute("ALTER TABLE pos_terminals ADD COLUMN IF NOT EXISTS pos_id INTEGER")

            # 6. Clean up obsolete tables
            cur.execute("DROP TABLE IF EXISTS pos_management CASCADE")

            # 7. Inventory & PO Reconciliation Schema Updates
            cur.execute("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100)")
            cur.execute("ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS damage_count INTEGER DEFAULT 0")
            cur.execute("""
                INSERT INTO system_settings (setting_key, setting_value, description)
                VALUES ('last_expected_reset', '', 'Last date the inventory expected count was reset')
                ON CONFLICT (setting_key) DO NOTHING
            """)

        log.info("Schema migrations completed successfully.")
    except Exception as e:
        log.error("Migration error: %s", e)
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
            _ALL_ACTIONS = ["View", "Add", "Edit", "Delete", "Export"]
            _DEFAULT_PERMS = {
                "administrator": {
                    "Dashboard": _ALL_ACTIONS,
                    "Sales": _ALL_ACTIONS,
                    "Inventory": _ALL_ACTIONS,
                    "Products": _ALL_ACTIONS,
                    "Suppliers": _ALL_ACTIONS,
                    "Orders": _ALL_ACTIONS,
                    "Reports": _ALL_ACTIONS,
                    "User Management": _ALL_ACTIONS,
                    "Role Permissions": _ALL_ACTIONS,
                    "Forecasting": _ALL_ACTIONS,
                    "Stock Prediction": _ALL_ACTIONS,
                    "Audit Log": _ALL_ACTIONS,
                    "Archive": _ALL_ACTIONS,
                    "Supplier Return": _ALL_ACTIONS
                },
                "manager": {
                    "Dashboard": ["View", "Export"],
                    "Sales": ["View", "Add", "Edit", "Export"],
                    "Inventory": ["View", "Add", "Edit", "Export"],
                    "Products": ["View", "Add", "Edit", "Export"],
                    "Suppliers": ["View", "Add", "Edit", "Export"],
                    "Orders": ["View", "Add", "Edit", "Export"],
                    "Reports": ["View", "Export"],
                    "Forecasting": ["View", "Export"],
                    "Stock Prediction": ["View", "Export"],
                    "Archive": ["View"],
                    "Supplier Return": ["View", "Add", "Edit", "Export"],
                    "Audit Log": ["View", "Export"]
                },
                "sales staff": {
                    "Dashboard": ["View"],
                    "Sales": ["View", "Add"],
                    "Inventory": ["View"],
                    "Products": ["View"],
                    "Supplier Return": ["View", "Add"]
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

# Trigger reload
