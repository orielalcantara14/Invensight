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
from routers.mechanics import router as mechanics_router
from routers.shifts import router as shifts_router
from database import get_connection, verify_database_connection
from services.analytics_cache_jobs import start_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("invensight.main")

app = FastAPI(title="InvenSight API", version="1.1.0")


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
    # Only rate limit sensitive login and password reset endpoints to prevent brute-forcing
    # and avoid slow page/asset loading times on the rest of the application
    path = request.url.path
    if path in ("/api/login", "/api/verify-otp", "/api/forgot-password", "/api/reset-password"):
        client_ip = request.client.host if request.client else "unknown"
        if not login_limiter.is_allowed(client_ip):
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again after a minute."}
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
                    failed_attempts INTEGER DEFAULT 0,
                    mfa_code VARCHAR(10),
                    mfa_expiry TIMESTAMP,
                    must_change_password BOOLEAN DEFAULT FALSE,
                    created_date DATE DEFAULT CURRENT_DATE,
                    avatar_url TEXT
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
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_changed_at') THEN
                        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                    ELSE
                        ALTER TABLE users ALTER COLUMN password_changed_at TYPE TIMESTAMPTZ USING password_changed_at::timestamptz;
                    END IF;
                    UPDATE users SET password_changed_at = COALESCE(created_date::timestamptz, CURRENT_TIMESTAMP) WHERE password_changed_at IS NULL;
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
            
            # Migration: Ensure is_service column exists in products table
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_service') THEN
                        ALTER TABLE products ADD COLUMN is_service BOOLEAN DEFAULT FALSE;
                    END IF;
                END $$;
            """)

            # Migration: Ensure mechanic_name column exists in sold_items table
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sold_items' AND column_name='mechanic_name') THEN
                        ALTER TABLE sold_items ADD COLUMN mechanic_name VARCHAR(255);
                    END IF;
                END $$;
            """)

            # Prepopulate category Services
            cur.execute("SELECT category_id FROM categories WHERE category_name = 'Services'")
            srv_cat_row = cur.fetchone()
            if srv_cat_row:
                srv_cat_id = srv_cat_row[0]
            else:
                cur.execute("SELECT COALESCE(MAX(category_id), 0) + 1 AS next_id FROM categories")
                srv_cat_id = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO categories (category_id, category_name, is_active) VALUES (%s, 'Services', TRUE)",
                    (srv_cat_id,)
                )

            # Prepopulate default service products
            default_services = [
                ("SRV-CHG-OIL", "Change oil"),
                ("SRV-TUNE-UP", "Tune-up"),
                ("SRV-TIRE-CHG", "Tire change"),
                ("SRV-CVT-CLN", "CVT cleaning"),
                ("SRV-BALLRACE", "Ballrace replacement"),
                ("SRV-SHOCK-RPK", "Front shock repack"),
                ("SRV-BRK-PAD", "Brake pad replacement"),
                ("SRV-BRK-SHOE", "Brake shoe replacement"),
                ("SRV-OTHERS", "Others"),
            ]

            for sku, name in default_services:
                cur.execute("SELECT product_id FROM products WHERE sku = %s", (sku,))
                p_row = cur.fetchone()
                if p_row:
                    cur.execute(
                        "UPDATE products SET product_name = %s, category_id = %s, is_service = TRUE, status = 'Active' WHERE sku = %s",
                        (name, srv_cat_id, sku)
                    )
                else:
                    cur.execute("SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products")
                    next_prod_id = cur.fetchone()[0]
                    cur.execute(
                        """
                        INSERT INTO products (product_id, sku, product_name, category_id, unit_price, pos_price, is_service, status)
                        VALUES (%s, %s, %s, %s, 0.0, 0.0, TRUE, 'Active')
                        """,
                        (next_prod_id, sku, name, srv_cat_id)
                    )

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
            # Migration: Add bypass_inventory to product_returns
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_returns' AND column_name='bypass_inventory') THEN
                        ALTER TABLE product_returns ADD COLUMN bypass_inventory BOOLEAN DEFAULT FALSE;
                    END IF;
                END $$;
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
            cur.execute("CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON sales(invoice_date)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_sold_items_invoice_id ON sold_items(invoice_id)")
            
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
                    refund_amount DECIMAL(10, 2) DEFAULT 0,
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
                    setting_value VARCHAR(255) NOT NULL DEFAULT 'true',
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

            cur.execute("""
                CREATE TABLE IF NOT EXISTS expenses (
                    expense_id SERIAL PRIMARY KEY,
                    amount DECIMAL(10, 2) NOT NULL,
                    description TEXT,
                    expense_date DATE DEFAULT CURRENT_DATE
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS sales_import_logs (
                    import_id SERIAL PRIMARY KEY,
                    file_hash VARCHAR(64) NOT NULL UNIQUE,
                    file_name VARCHAR(255) NOT NULL,
                    row_count INTEGER NOT NULL DEFAULT 0,
                    sales_count INTEGER NOT NULL DEFAULT 0,
                    items_count INTEGER NOT NULL DEFAULT 0,
                    imported_by INTEGER REFERENCES users(user_id),
                    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS mechanics (
                    mechanic_id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    earnings_adjustment DECIMAL(10, 2) DEFAULT 0.00,
                    status VARCHAR(50) DEFAULT 'Active'
                )
            """)

            # Seed default mechanics
            for m_name in ["Danly", "Rovhic", "Cedie", "Robek"]:
                cur.execute("""
                    INSERT INTO mechanics (name, status)
                    VALUES (%s, 'Active')
                    ON CONFLICT (name) DO UPDATE SET status = 'Active'
                """, (m_name,))

            # Deactivate other legacy/default mechanics not in active use
            cur.execute("""
                UPDATE mechanics SET status = 'Inactive'
                WHERE name NOT IN ('Danly', 'Rovhic', 'Cedie', 'Robek')
            """)

            # 3. Default Data
            cur.execute("""
                INSERT INTO system_settings (setting_key, setting_value, description)
                VALUES ('tax_rate', '0.03', 'Current sales tax rate (3%)')
                ON CONFLICT (setting_key) DO NOTHING
            """)

            cur.execute("""
                INSERT INTO system_settings (setting_key, setting_value, description)
                VALUES ('mechanic_commission_rate', '0.80', 'Default mechanic payout commission rate (80%)')
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
                        UPDATE users SET is_active = TRUE, role = 'administrator'
                        WHERE username = %s
                    """, (username,))
                    log.info("Verified existing root admin account: %s", username)
            # 5. Ensure Product Categories Exist
            # Keep category_id = 1 as Services because existing
            # service products already reference this category.
            category_seed = [
                (1, "Services"),
                (2, "Engine Parts"),
                (3, "Fuel & Air System"),
                (4, "Electrical & Ignition"),
                (5, "Battery & Charging"),
                (6, "Brake System"),
                (7, "Transmission & CVT"),
                (8, "Suspension & Steering"),
                (9, "Tires & Inner Tubes"),
                (10, "Lubricants & Fluids"),
                (11, "Cooling System"),
                (12, "Body & Exterior Parts"),
                (13, "Lights & Accessories"),
                (14, "Motorcycle Accessories"),
                (15, "Maintenance Supplies"),
                (16, "Fasteners & Small Parts"),
                (17, "Performance & Upgrade Parts"),
                (18, "Safety & Riding Gear"),
                (19, "Other Parts & Accessories"),
            ]

            for category_id, category_name in category_seed:
                cur.execute(
                    """
                    INSERT INTO categories (category_id, category_name, is_active)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (category_id)
                    DO UPDATE SET
                        category_name = EXCLUDED.category_name,
                        is_active = TRUE
                    """,
                    (category_id, category_name),
                )

            # Keep the SERIAL sequence synchronized with the highest category ID
            cur.execute(
                """
                SELECT setval(
                    pg_get_serial_sequence('categories', 'category_id'),
                    COALESCE((SELECT MAX(category_id) FROM categories), 1),
                    true
                )
                """
            )

            log.info("Product categories verified successfully.")		

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

# Configure CORS origins from environment variable for deployment flexibility
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
app.include_router(mechanics_router, prefix="/api/mechanics", tags=["Mechanics"])
app.include_router(shifts_router)

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
    start_scheduler()


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
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_code VARCHAR(10)")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_expiry TIMESTAMP")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_date DATE DEFAULT CURRENT_DATE")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_email VARCHAR(255)")
            
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

            # 8. Customer Returns Schema Updates
            cur.execute("ALTER TABLE customer_returns ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0")

            # 9. Expenses Schema Updates
            cur.execute("""
                CREATE TABLE IF NOT EXISTS expenses (
                    expense_id SERIAL PRIMARY KEY,
                    amount DECIMAL(10, 2) NOT NULL,
                    description TEXT,
                    expense_date DATE DEFAULT CURRENT_DATE
                )
            """)

            # 10. User Settings VARCHAR Migration
            cur.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='user_settings' AND column_name='setting_value' AND data_type='boolean'
                    ) THEN
                        ALTER TABLE user_settings ALTER COLUMN setting_value TYPE VARCHAR(255) USING (CASE WHEN setting_value THEN 'true' ELSE 'false' END);
                    END IF;
                END $$;
            """)

            # 11. Automated Version Update Broadcast
            cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'system_version'")
            db_version_row = cur.fetchone()
            db_version = db_version_row[0] if db_version_row else None
            current_app_version = "1.1.0"
            
            if db_version != current_app_version:
                cur.execute("""
                    INSERT INTO system_settings (setting_key, setting_value, description)
                    VALUES ('system_version', %s, 'Current software version')
                    ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
                """, (current_app_version,))
                
                cur.execute("SELECT user_id FROM users WHERE is_active = TRUE")
                active_users = [r[0] for r in cur.fetchall()]
                
                update_msg = "InvenSight has been updated to v1.1.0. Role-based settings, database persistence fixes, and automatic inactivity timeouts are now live."
                for uid in active_users:
                    cur.execute("""
                        INSERT INTO notifications (user_id, type, title, message, link)
                        VALUES (%s, 'system_update', 'System Updated', %s, NULL)
                    """, (uid, update_msg))
            # 12. Migrate existing roles/users to include "Mechanic Services" permissions
            try:
                import json
                cur.execute("SELECT role_id, role_name, permissions_text FROM roles")
                roles_rows = cur.fetchall()
                for r_id, r_name, r_perms_txt in roles_rows:
                    try:
                        perms = json.loads(r_perms_txt) if r_perms_txt and r_perms_txt.strip().startswith("{") else {}
                        r_name_lower = (r_name or "").lower()
                        if r_name_lower in ["administrator", "manager"] or "User Management" in perms:
                            if "Mechanic Services" not in perms:
                                perms["Mechanic Services"] = ["View", "Add", "Edit", "Delete", "Export"]
                                cur.execute(
                                    "UPDATE roles SET permissions_text = %s WHERE role_id = %s",
                                    (json.dumps(perms), r_id)
                                )
                    except Exception as ex:
                        log.error("Failed to migrate role %s: %s", r_name, ex)

                cur.execute("SELECT user_id, username, role, permissions_json FROM users")
                users_rows = cur.fetchall()
                for u_id, u_name, u_role, u_perms in users_rows:
                    try:
                        if u_perms and isinstance(u_perms, dict) and len(u_perms) > 0:
                            u_role_lower = (u_role or "").lower()
                            if u_role_lower in ["administrator", "manager"] or "User Management" in u_perms:
                                if "Mechanic Services" not in u_perms:
                                    u_perms["Mechanic Services"] = ["View", "Add", "Edit", "Delete", "Export"]
                                    cur.execute(
                                        "UPDATE users SET permissions_json = %s::jsonb WHERE user_id = %s",
                                        (json.dumps(u_perms), u_id)
                                    )
                    except Exception as ex:
                        log.error("Failed to migrate user override for %s: %s", u_name, ex)
            except Exception as e:
                log.error("Error migrating Mechanic Services permissions: %s", e)

            # 13. Mechanic Payout Integration Migration
            try:
                # Add mechanic_payout_status column to sold_items if not exists
                cur.execute("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sold_items' AND column_name='mechanic_payout_status') THEN
                            ALTER TABLE sold_items ADD COLUMN mechanic_payout_status VARCHAR(50) DEFAULT 'Unpaid';
                            -- Migrate all existing items with a mechanic name to Paid
                            UPDATE sold_items SET mechanic_payout_status = 'Paid' WHERE mechanic_name IS NOT NULL AND TRIM(mechanic_name) <> '';
                        END IF;
                    END $$;
                """)
                
                # Create mechanic_payouts table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mechanic_payouts (
                        payout_id SERIAL PRIMARY KEY,
                        mechanic_id INTEGER REFERENCES mechanics(mechanic_id) ON DELETE CASCADE,
                        amount DECIMAL(10, 2) NOT NULL,
                        payout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        processed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
                        notes TEXT
                    )
                """)
            except Exception as e:
                log.error("Error migrating mechanic payout schema: %s", e)

            # 14. Deleted Folder Auto-Retention Schema Updates
            try:
                for tbl in ["inventory", "products", "supplier", "purchase_orders", "product_returns", "customer_returns", "users", "mechanics"]:
                    cur.execute(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;")
                cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';")
                cur.execute("""
                    INSERT INTO system_settings (setting_key, setting_value, description)
                    VALUES ('deleted_folder_retention_days', '30', 'Auto-delete retention period in days for Deleted Folder')
                    ON CONFLICT (setting_key) DO NOTHING;
                """)
                cur.execute("""
                    INSERT INTO system_settings (setting_key, setting_value, description)
                    VALUES ('cashier_session_timeout', '15', 'Inactivity timeout in minutes for Cashier POS terminals')
                    ON CONFLICT (setting_key) DO NOTHING;
                """)
            except Exception as e:
                log.error("Error migrating deleted_at columns or retention setting: %s", e)

            # 15. Ensure user foreign keys use ON DELETE SET NULL to preserve audit logs, sales, orders, and shifts
            try:
                cur.execute("""
                    DO $$
                    BEGIN
                        -- auditlog
                        ALTER TABLE auditlog DROP CONSTRAINT IF EXISTS auditlog_user_id_fkey;
                        ALTER TABLE auditlog ADD CONSTRAINT auditlog_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;

                        -- sales
                        ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_user_id_fkey;
                        ALTER TABLE sales ADD CONSTRAINT sales_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;

                        -- purchase_orders
                        ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_user_id_fkey;
                        ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;

                        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='voided_by_user_id') THEN
                            ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_voided_by_user_id_fkey;
                            ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_voided_by_user_id_fkey FOREIGN KEY (voided_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL;
                        END IF;

                        -- pos_shifts
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='pos_shifts') THEN
                            ALTER TABLE pos_shifts DROP CONSTRAINT IF EXISTS pos_shifts_user_id_fkey;
                            ALTER TABLE pos_shifts ADD CONSTRAINT pos_shifts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;
                        END IF;

                        -- mechanic_payouts
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='mechanic_payouts') THEN
                            ALTER TABLE mechanic_payouts DROP CONSTRAINT IF EXISTS mechanic_payouts_processed_by_fkey;
                            ALTER TABLE mechanic_payouts ADD CONSTRAINT mechanic_payouts_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL;
                        END IF;

                        -- sales_import_logs
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='sales_import_logs') THEN
                            ALTER TABLE sales_import_logs DROP CONSTRAINT IF EXISTS sales_import_logs_imported_by_fkey;
                            ALTER TABLE sales_import_logs ADD CONSTRAINT sales_import_logs_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES users(user_id) ON DELETE SET NULL;
                        END IF;
                    END $$;
                """)
            except Exception as e:
                log.error("Error migrating user foreign key constraints: %s", e)

            # 16. User Name Snapshotting & Historical Backfill
            try:
                # Add snapshot columns only when their tables exist.
                # This keeps production databases compatible even if
                # optional tables such as pos_shifts are not present.

                cur.execute("""
                    DO $$
                    BEGIN
                        -- POS shifts
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                              AND table_name = 'pos_shifts'
                        ) THEN
                            ALTER TABLE pos_shifts
                                ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255);
                            ALTER TABLE pos_shifts
                                ADD COLUMN IF NOT EXISTS username VARCHAR(100);
                        END IF;

                        -- Sales
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                              AND table_name = 'sales'
                        ) THEN
                            ALTER TABLE sales
                                ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255);
                            ALTER TABLE sales
                                ADD COLUMN IF NOT EXISTS cashier_username VARCHAR(100);
                        END IF;

                        -- Purchase orders
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                              AND table_name = 'purchase_orders'
                        ) THEN
                            ALTER TABLE purchase_orders
                                ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);
                            ALTER TABLE purchase_orders
                                ADD COLUMN IF NOT EXISTS voided_by_name VARCHAR(255);
                        END IF;

                        -- Mechanic payouts
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                              AND table_name = 'mechanic_payouts'
                        ) THEN
                            ALTER TABLE mechanic_payouts
                                ADD COLUMN IF NOT EXISTS processed_by_name VARCHAR(255);
                        END IF;
                    END $$;
                """)

                # Backfill POS shifts only if the table exists.
                cur.execute("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                              AND table_name = 'pos_shifts'
                        ) THEN

                            UPDATE pos_shifts s
                            SET cashier_name = COALESCE(u.full_name, u.username),
                                username = u.username
                            FROM users u
                            WHERE s.user_id = u.user_id
                              AND s.cashier_name IS NULL;

                            UPDATE pos_shifts s
                            SET cashier_name = SUBSTRING(
                                    a.details FROM 'User\\s+([^\\s(:]+)'
                                ),
                                username = SUBSTRING(
                                    a.details FROM 'User\\s+([^\\s(:]+)'
                                )
                            FROM auditlog a
                            WHERE a.entity_type = 'pos_shift'
                              AND a.entity_id = s.shift_id
                              AND s.cashier_name IS NULL
                              AND a.details ~ 'User\\s+[^\\s(:]+';

                            UPDATE pos_shifts
                            SET cashier_name = 'Sohitado, John Reimarc A.'
                            WHERE username = 'reimarc'
                              AND (
                                  cashier_name = 'reimarc'
                                  OR cashier_name IS NULL
                              );

                        END IF;
                    END $$;
                """)

                # Backfill sales from users and audit logs.
                cur.execute("""
                    UPDATE sales s
                    SET cashier_name = COALESCE(u.full_name, u.username),
                        cashier_username = u.username
                    FROM users u
                    WHERE s.user_id = u.user_id
                      AND s.cashier_name IS NULL;
                """)

                cur.execute("""
                    UPDATE sales s
                    SET cashier_name = SUBSTRING(
                            a.details FROM 'User\\s+([^\\s(:]+)'
                        ),
                        cashier_username = SUBSTRING(
                            a.details FROM 'User\\s+([^\\s(:]+)'
                        )
                    FROM auditlog a
                    WHERE a.entity_type = 'sales'
                      AND a.entity_id = s.invoice_id
                      AND s.cashier_name IS NULL
                      AND a.details ~ 'User\\s+[^\\s(:]+';

                    UPDATE sales
                    SET cashier_name = 'Sohitado, John Reimarc A.'
                    WHERE cashier_username = 'reimarc'
                      AND (
                          cashier_name = 'reimarc'
                          OR cashier_name IS NULL
                      );
                """)

                # Backfill purchase orders only if the table exists.
                cur.execute("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                              AND table_name = 'purchase_orders'
                        ) THEN

                            UPDATE purchase_orders po
                            SET created_by_name = COALESCE(u.full_name, u.username)
                            FROM users u
                            WHERE po.user_id = u.user_id
                              AND po.created_by_name IS NULL;

                            UPDATE purchase_orders po
                            SET voided_by_name = COALESCE(uv.full_name, uv.username)
                            FROM users uv
                            WHERE po.voided_by_user_id = uv.user_id
                              AND po.voided_by_name IS NULL;

                        END IF;
                    END $$;
                """)

                log.info("User name snapshot migration completed successfully.")

            except Exception as e:
                log.error("Error migrating name snapshots: %s", e)
    finally:
        conn.close()


@app.on_event("startup")
def backfill_walkin_sales():
    """Backfill dummy sales from April 26 to June 5, 2026, and standardize Walk In customer names."""
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            # Check if already backfilled
            cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'dummy_sales_backfilled'")
            row = cur.fetchone()
            if row and row[0] == 'true':
                log.info("Dummy sales already backfilled.")
                return

            log.info("Running migration: Standardizing customer names to 'Walk In customer'...")
            # Update sales customer_info
            cur.execute("""
                UPDATE sales 
                SET customer_info = 'Walk In customer' 
                WHERE customer_info IN ('Walk In', 'Walk-in', 'Walk-in Customer', 'Walk In (BATCH_IMPORT_20260422)')
            """)
            # Update sales customer_name
            cur.execute("""
                UPDATE sales 
                SET customer_name = 'Walk In customer' 
                WHERE customer_name IN ('Walk In', 'Walk-in', 'Walk-in Customer', 'Walk In (BATCH_IMPORT_20260422)')
                   OR (customer_name IS NULL AND customer_info = 'Walk In customer')
            """)
            # Update customer_returns customer_info
            cur.execute("""
                UPDATE customer_returns 
                SET customer_info = 'Walk In customer' 
                WHERE customer_info IN ('Walk In', 'Walk-in', 'Walk-in Customer')
            """)
            # Update customer_returns customer_name
            cur.execute("""
                UPDATE customer_returns 
                SET customer_name = 'Walk In customer' 
                WHERE customer_name IN ('Walk In', 'Walk-in', 'Walk-in Customer')
                   OR (customer_name IS NULL AND customer_info = 'Walk In customer')
            """)

            cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'dummy_sales_backfilled'")
            dummy_flag_row = cur.fetchone()
            if not dummy_flag_row or dummy_flag_row[0] != 'true':
                log.info("Running migration: Generating dummy sales from April 26 to June 5...")
                # Fetch active products
                cur.execute("SELECT product_id, unit_price, pos_price FROM products WHERE status = 'Active'")
                products = cur.fetchall()
                if products:
                    import random
                    import datetime
                    
                    # Fetch tax rate from system settings if exists
                    cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'tax_rate'")
                    tax_rate_row = cur.fetchone()
                    tax_rate = float(tax_rate_row[0]) if tax_rate_row else 0.03
                    
                    # Hardcoded list of product dicts
                    products_list = []
                    for p in products:
                        products_list.append({
                            "product_id": p[0],
                            "unit_price": float(p[1]) if p[1] is not None else 0.0,
                            "pos_price": float(p[2]) if p[2] is not None else None
                        })

                    start_date = datetime.date(2026, 4, 26)
                    end_date = datetime.date(2026, 6, 5)
                    
                    # Use a deterministic or pseudo-random seed to keep it consistent
                    rnd = random.Random(42)
                    
                    current_date = start_date
                    while current_date <= end_date:
                        num_sales = rnd.randint(5, 10)
                        for _ in range(num_sales):
                            user_id = rnd.choice([8, 8, 8, 7, 7, 2])
                            pos_terminal_id = 1
                            payment_method = rnd.choices(["Cash", "GCash"], weights=[0.6, 0.4])[0]
                            
                            hour = rnd.randint(9, 17)
                            minute = rnd.randint(0, 59)
                            second = rnd.randint(0, 59)
                            transaction_time = datetime.datetime.combine(
                                current_date, 
                                datetime.time(hour, minute, second)
                            )
                            
                            num_items = rnd.choices([1, 2, 3], weights=[0.6, 0.3, 0.1])[0]
                            selected_prods = rnd.sample(products_list, min(num_items, len(products_list)))
                            
                            cart_items = []
                            subtotal = 0.0
                            for prod in selected_prods:
                                qty = rnd.choices([1, 2, 3], weights=[0.85, 0.10, 0.05])[0]
                                price = prod["pos_price"] if prod["pos_price"] is not None else prod["unit_price"]
                                if price <= 0.0:
                                    price = rnd.uniform(10.0, 300.0)
                                
                                item_subtotal = round(price * qty, 2)
                                subtotal += item_subtotal
                                cart_items.append({
                                    "product_id": prod["product_id"],
                                    "quantity": qty,
                                    "unit_price": price,
                                    "subtotal": item_subtotal
                                })
                                
                            tax_amount = round(subtotal * tax_rate, 2)
                            total_amount = round(subtotal + tax_amount, 2)
                            
                            if payment_method == "Cash":
                                cash_received = float((int(total_amount / 100) + 1) * 100)
                                change_amount = round(cash_received - total_amount, 2)
                            else:
                                cash_received = total_amount
                                change_amount = 0.0
                                
                            # Insert sale
                            cur.execute("""
                                INSERT INTO sales (
                                    pos_terminal_id, user_id, invoice_date, total_amount,
                                    tax_amount, customer_info, payment_method, payment_status,
                                    service_charge, transaction_timestamp, cash_received, change_amount, cash_given,
                                    customer_name
                                )
                                VALUES (%s, %s, %s, %s, %s, 'Walk In customer', %s, 'Paid', 0.00, %s, %s, %s, %s, 'Walk In customer')
                                RETURNING invoice_id
                            """, (pos_terminal_id, user_id, current_date, total_amount, tax_amount, payment_method, transaction_time, cash_received, change_amount, cash_received))
                            invoice_id = cur.fetchone()[0]
                            
                            # Insert sold_items
                            for item in cart_items:
                                cur.execute("""
                                    INSERT INTO sold_items (invoice_id, product_id, quantity, unit_price, subtotal, total_amount)
                                    VALUES (%s, %s, %s, %s, %s, %s)
                                """, (invoice_id, item["product_id"], item["quantity"], item["unit_price"], item["subtotal"], item["subtotal"]))
                                
                            # Insert payment
                            cur.execute("""
                                INSERT INTO payments (invoice_id, payment_method, amount_paid, transaction_timestamp)
                                VALUES (%s, %s, %s, %s)
                            """, (invoice_id, payment_method, total_amount, transaction_time))
                            
                        current_date += datetime.timedelta(days=1)

                # Invalidate cache
                cur.execute("UPDATE analytics_model_cache SET status = 'stale'")
                
                # Set flag in system_settings
                cur.execute("""
                    INSERT INTO system_settings (setting_key, setting_value, description)
                    VALUES ('dummy_sales_backfilled', 'true', 'Flag indicating dummy sales backfill and walk-in renaming is complete')
                    ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'true'
                """)
                
                conn.commit()
                log.info("Migration: Standardized customer names and backfilled dummy sales successfully in database.")
            
            # Run analytics refresh job to train forecasting models with new data
            try:
                log.info("Running post-migration analytics refresh job to populate cache...")
                from services.analytics_cache_jobs import run_refresh_job
                run_refresh_job()
                log.info("Post-migration analytics refresh completed successfully.")
            except Exception as ex:
                log.error("Failed to run post-migration analytics refresh: %s", ex)
    except Exception as e:
        conn.rollback()
        log.error("Migration error standardizing customer names and backfilling dummy sales: %s", e)
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
