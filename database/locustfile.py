from locust import HttpUser, task, between

class InvenSightComprehensiveLoadTest(HttpUser):
    """
    Simulates real-world concurrent traffic across all main modules of InvenSight:
    - POS / Cashier terminal transactions and lookups
    - Inventory management & stock threshold tracking
    - Sales records and tax settings
    - Motorcycle mechanics and service records
    - Purchase orders & deliveries
    - Notifications & audit security logs
    - Managerial Dashboard & AI Prophet Analytics
    """
    # Realistic human think-time for store staff (scanning barcodes, viewing tables)
    wait_time = between(1.5, 3.5)

    def on_start(self):
        # Authenticated session headers using active admin/staff user ID
        self.headers = {
            "X-User-Id": "10",
            "X-Actor-User-Id": "10",
            "Content-Type": "application/json"
        }

    # ==========================================
    # 1. CASHIER & POS TERMINAL WORKFLOWS
    # ==========================================
    @task(6)
    def test_pos_products(self):
        """Cashier scanning and searching POS items"""
        with self.client.get("/api/pos-products", headers=self.headers, name="GET /api/pos-products", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    @task(3)
    def test_product_categories(self):
        """Filtering products by motorcycle parts category"""
        with self.client.get("/api/categories", headers=self.headers, name="GET /api/categories", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    @task(2)
    def test_pos_tax_rate(self):
        """Retrieving system tax/VAT configurations for invoice calculation"""
        with self.client.get("/api/settings/tax-rate", headers=self.headers, name="GET /api/settings/tax-rate", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    @task(2)
    def test_current_shift(self):
        """Verifying cashier active drawer shift"""
        with self.client.get("/api/shifts/current", headers=self.headers, name="GET /api/shifts/current", catch_response=True) as resp:
            if resp.status_code in [200, 404]: # 404 is valid if no shift currently open
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    # ==========================================
    # 2. INVENTORY & STOCK MANAGEMENT
    # ==========================================
    @task(5)
    def test_inventory_list(self):
        """Viewing master inventory stock table"""
        with self.client.get("/api/inventory", headers=self.headers, name="GET /api/inventory", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    @task(3)
    def test_low_stock_badge(self):
        """Querying low stock counter for urgent reorders"""
        with self.client.get("/api/inventory/low-stock-count/", headers=self.headers, name="GET /api/inventory/low-stock-count/", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    @task(4)
    def test_products_catalog(self):
        """Viewing master catalog and SKU details"""
        with self.client.get("/api/products", headers=self.headers, name="GET /api/products", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    # ==========================================
    # 3. SALES & INVOICE MANAGEMENT
    # ==========================================
    @task(4)
    def test_sales_history(self):
        """Auditing recent invoices and customer receipts"""
        with self.client.get("/api/sales", headers=self.headers, name="GET /api/sales", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    # ==========================================
    # 4. MECHANICS & SERVICE WORKFLOWS
    # ==========================================
    @task(3)
    def test_mechanics_roster(self):
        """Viewing mechanics directory, job counts, and payout rates"""
        with self.client.get("/api/mechanics", headers=self.headers, name="GET /api/mechanics", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    # ==========================================
    # 5. PURCHASE ORDERS & DELIVERIES
    # ==========================================
    @task(2)
    def test_purchase_orders(self):
        """Checking purchase order pipeline"""
        with self.client.get("/api/purchase-orders", headers=self.headers, name="GET /api/purchase-orders", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    # ==========================================
    # 6. NOTIFICATIONS & SECURITY AUDITING
    # ==========================================
    @task(3)
    def test_notifications(self):
        """Checking unread stock alerts and system notices"""
        with self.client.get("/api/notifications", headers=self.headers, name="GET /api/notifications", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    # ==========================================
    # 7. DASHBOARD & AI FORECASTING
    # ==========================================
    @task(4)
    def test_dashboard_stats(self):
        """Loading executive dashboard KPIs (revenue, low stock, daily sales)"""
        with self.client.get("/api/dashboard/stats", headers=self.headers, name="GET /api/dashboard/stats", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    @task(2)
    def test_analytics_overview(self):
        """Loading sales trend curves and category breakdowns"""
        with self.client.get("/api/analytics/overview", headers=self.headers, name="GET /api/analytics/overview", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")

    @task(2)
    def test_stock_prediction(self):
        """Executing Prophet AI replenishment forecasts"""
        with self.client.get("/api/analytics/stock-prediction", headers=self.headers, name="GET /api/analytics/stock-prediction", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Status {resp.status_code}")
