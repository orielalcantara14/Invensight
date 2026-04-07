import psycopg2
import random
from datetime import datetime, timedelta
import math

DB_CONFIG = {
    "host": "localhost", "database": "InvenSight", "user": "postgres",
    "password": "Rocketman09", "port": "5432"
}

def generate_data():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("Connected to database...")
        cur.execute("TRUNCATE sales, sold_items, payments RESTART IDENTITY CASCADE;")

        cur.execute("SELECT product_id, product_name, unit_price FROM products LIMIT 10;")
        products = cur.fetchall()
        products = [(p[0], p[1], float(p[2]) if p[2] else 100.0) for p in products] if products else [(1, "Dummy", 100.0)]

        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        holidays = [(1, 1, 3.5), (2, 14, 1.8), (4, 1, 2.0), (12, 25, 4.5), (12, 31, 3.8)]

        total_sales = 0
        curr_date = start_date
        while curr_date <= end_date:
            days_passed = (curr_date - start_date).days
            growth = 1.0 + (days_passed / 365.0) * 0.4
            base_rev = (8000 if curr_date.weekday() >= 4 else 5000) * growth
            
            mult = 1.0
            for hm, hd, hm_mult in holidays:
                if curr_date.month == hm and curr_date.day == hd: mult = hm_mult
            
            daily_rev = base_rev * mult * random.uniform(0.8, 1.2)
            num_tx = max(1, int(daily_rev / 1500))
            
            for _ in range(num_tx):
                val = (daily_rev / num_tx) * random.uniform(0.9, 1.1)
                ts = curr_date.replace(hour=random.randint(9, 20), minute=random.randint(0, 59))
                
                cur.execute("""
                    INSERT INTO sales (invoice_date, total_amount, tax_amount, customer_info,
                    payment_method, payment_status, service_charge, transaction_timestamp,
                    cash_received, cash_given, change_amount)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING invoice_id
                """, (curr_date.date().isoformat(), val, 0, 'Retail Customer', 'Cash', 'Completed', 0, ts, val, val, 0))
                inv_id = cur.fetchone()[0]
                
                for _ in range(random.randint(1, 3)):
                    p = random.choice(products)
                    qty = random.randint(1, 4)
                    sub = qty * p[2]
                    cur.execute("""
                        INSERT INTO sold_items (invoice_id, product_id, quantity, unit_price, subtotal, total_amount)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (inv_id, p[0], qty, p[2], sub, sub))
                total_sales += 1
            curr_date += timedelta(days=1)
        
        conn.commit()
        print(f"SUCCESS: Generated {total_sales} sales.")
    except Exception as e:
        print(f"FAILED: {e}")
        if 'conn' in locals(): conn.rollback()
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__": generate_data()
