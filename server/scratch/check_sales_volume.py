from database import get_connection
import psycopg2.extras

def check_sales():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT COUNT(*) as total_rows
                FROM sold_items si
                JOIN sales s ON si.invoice_id = s.invoice_id
                WHERE s.invoice_date >= CURRENT_DATE - INTERVAL '90 days'
            """)
            print(f"Rows in last 90 days: {cur.fetchone()['total_rows']}")
            
            cur.execute("""
                SELECT COUNT(*) as total_rows
                FROM sold_items si
                JOIN sales s ON si.invoice_id = s.invoice_id
                WHERE s.invoice_date >= CURRENT_DATE - INTERVAL '365 days'
            """)
            print(f"Rows in last 365 days: {cur.fetchone()['total_rows']}")
            
            cur.execute("""
                SELECT p.product_name, SUM(si.quantity) as q
                FROM sold_items si
                JOIN sales s ON si.invoice_id = s.invoice_id
                JOIN products p ON si.product_id = p.product_id
                WHERE s.invoice_date >= CURRENT_DATE - INTERVAL '365 days'
                GROUP BY p.product_name
                ORDER BY q DESC
                LIMIT 10
            """)
            print("\nTop sellers last 365 days:")
            for row in cur.fetchall():
                print(f"{row['product_name']}: {row['q']}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_sales()
