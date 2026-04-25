import os
import psycopg2
from dotenv import load_dotenv
from datetime import date, timedelta

load_dotenv()

def get_db_stats():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "InvenSight"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "Rocketman09"),
        port=os.getenv("DB_PORT", "5432")
    )
    cur = conn.cursor()
    
    # Check last 60 days of sales
    cur.execute("""
        SELECT DATE(invoice_date) as d, SUM(total_amount) as rev
        FROM sales
        WHERE invoice_date >= CURRENT_DATE - INTERVAL '60 days'
        GROUP BY 1
        ORDER BY 1;
    """)
    rows = cur.fetchall()
    
    print("--- SALES DATA (LAST 60 DAYS) ---")
    for r in rows:
        print(f"{r[0]}: {r[1]:,.2f}")
    
    # Calculate average of non-zero days
    non_zeros = [r[1] for r in rows if r[1] > 0]
    if non_zeros:
        avg = sum(non_zeros) / len(non_zeros)
        print(f"\nAverage revenue (on days with sales): {avg:,.2f}")
        print(f"Projected 30-day (Simple): {avg * 30:,.2f}")
    else:
        print("\nNo sales found in last 60 days.")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    try:
        get_db_stats()
    except Exception as e:
        print(f"Error: {e}")
