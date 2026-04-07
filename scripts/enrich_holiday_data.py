import psycopg2
import psycopg2.extras
from datetime import date, timedelta
import random
import os

# Database Connection Info (from docker-compose.yml)
DB_CONFIG = {
    "dbname": "InvenSight",
    "user": "postgres",
    "password": "Rocketman09",
    "host": "localhost",
    "port": "5432"
}

# PH Holidays for the last 365 days (approx April 2025 - April 2026)
HOLIDAYS = [
    (date(2025, 4, 17), "Maundy Thursday"),
    (date(2025, 4, 18), "Good Friday"),
    (date(2025, 5, 1), "Labor Day"),
    (date(2025, 6, 12), "Independence Day"),
    (date(2025, 8, 25), "National Heroes Day"),
    (date(2025, 11, 1), "All Saints Day"),
    (date(2025, 11, 30), "Bonifacio Day"),
    (date(2025, 12, 25), "Christmas Day"),
    (date(2025, 12, 30), "Rizal Day"),
    (date(2026, 1, 1), "New Year's Day"),
    (date(2026, 2, 25), "EDSA People Power"),
    (date(2026, 4, 2), "Maundy Thursday 2026"),
]

def enrich_data():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        print("Connected to database...")

        # 1. Get all active products
        cur.execute("SELECT product_id, product_name FROM products WHERE status != 'Archived'")
        products = cur.fetchall()
        if not products:
            print("No active products found to associate sales with.")
            return

        print(f"Applying holiday spikes to {len(products)} products...")

        # 2. Inject Holiday Spikes
        for h_date, h_name in HOLIDAYS:
            print(f"Injecting spike for {h_name} ({h_date})...")
            
            # Generate 8-15 separate sales for this day
            for _ in range(random.randint(8, 15)):
                invoice_date = h_date.isoformat() + " " + f"{random.randint(9, 21):02d}:{random.randint(0, 59):02d}:00"
                total_amount = random.uniform(5000, 15000) # Significant revenue spike
                
                # Insert Sale
                cur.execute(
                    "INSERT INTO sales (invoice_date, total_amount, status) VALUES (%s, %s, 'Completed') RETURNING invoice_id",
                    (invoice_date, total_amount)
                )
                invoice_id = cur.fetchone()['invoice_id']
                
                # Insert Sold Items for all products equally
                for prod in products:
                    qty = random.randint(5, 15) # High quantity for holiday
                    cur.execute(
                        "INSERT INTO sold_items (invoice_id, product_id, quantity, unit_price) VALUES (%s, %s, %s, %s)",
                        (invoice_id, prod['product_id'], qty, total_amount / (len(products) * qty))
                    )

        # 3. Inject Baseline Noise (ensure AI sees non-zero trend)
        # We'll add some minor sales for every few days in the past year if they are missing
        print("Injecting baseline data to ensure continuity...")
        start_date = date.today() - timedelta(days=365)
        for i in range(365):
            curr = start_date + timedelta(days=i)
            # Skip if it's already a holiday (we already injected spikes)
            if any(h[0] == curr for h in HOLIDAYS):
                continue
                
            # 30% chance of a "regular" sale day
            if random.random() < 0.3:
                total_amount = random.uniform(500, 2000)
                invoice_date = curr.isoformat() + " 12:00:00"
                cur.execute(
                    "INSERT INTO sales (invoice_date, total_amount, status) VALUES (%s, %s, 'Completed') RETURNING invoice_id",
                    (invoice_date, total_amount)
                )
                invoice_id = cur.fetchone()['invoice_id']
                for prod in products:
                    qty = random.randint(1, 3)
                    cur.execute(
                        "INSERT INTO sold_items (invoice_id, product_id, quantity, unit_price) VALUES (%s, %s, %s, %s)",
                        (invoice_id, prod['product_id'], qty, total_amount / (len(products) * qty))
                    )

        conn.commit()
        print("Successfully enriched database with holiday patterns!")
        
    except Exception as e:
        print(f"Error: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    enrich_data()
