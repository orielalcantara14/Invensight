import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from datetime import date, timedelta

# Load environment variables
load_dotenv('c:/Users/rovhi/Desktop/InvenSight/server/.env')

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "InvenSight"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "Rocketman09")
    )

def analyze_sales():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Check sales count from 2026-03-23
            cur.execute("SELECT COUNT(*) as count FROM sales WHERE invoice_date >= '2026-03-23'")
            count_to_delete = cur.fetchone()["count"]
            print(f"Sales to delete from 2026-03-23 onwards: {count_to_delete}")

            # Get historical daily stats for the 30 days BEFORE 2026-03-23
            cur.execute("""
                SELECT 
                    invoice_date, 
                    SUM(total_amount) as daily_revenue, 
                    COUNT(*) as transaction_count
                FROM sales 
                WHERE invoice_date < '2026-03-23' 
                AND invoice_date >= '2026-02-21'
                GROUP BY invoice_date 
                ORDER BY invoice_date DESC
            """)
            rows = cur.fetchall()
            print("\nHistorical stats (last 30 days before cut-off):")
            for r in rows:
                print(f"{r['invoice_date']}: Revenue: {r['daily_revenue']:.2f}, Count: {r['transaction_count']}")
            
            if rows:
                avg_rev = sum(r['daily_revenue'] for r in rows) / len(rows)
                avg_count = sum(r['transaction_count'] for r in rows) / len(rows)
                print(f"\nAverage Daily Revenue: {avg_rev:.2f}")
                print(f"Average Daily Transaction Count: {avg_count:.1f}")

            # Also check top products sold in that period to make generation realistic
            cur.execute("""
                SELECT si.product_id, p.product_name, SUM(si.quantity) as total_qty, AVG(si.unit_price) as avg_price
                FROM sold_items si
                JOIN sales s ON si.invoice_id = s.invoice_id
                JOIN products p ON si.product_id = p.product_id
                WHERE s.invoice_date < '2026-03-23'
                GROUP BY si.product_id, p.product_name
                ORDER BY total_qty DESC
                LIMIT 10
            """)
            top_prods = cur.fetchall()
            print("\nTop 10 Products (pre-cutoff):")
            for p in top_prods:
                print(f"ID: {p['product_id']}, Name: {p['product_name']}, Qty: {p['total_qty']}, Avg Price: {p['avg_price']:.2f}")

    finally:
        conn.close()

if __name__ == "__main__":
    analyze_sales()
