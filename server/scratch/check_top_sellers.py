from database import get_connection
import psycopg2.extras

def check_sales():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            products = ["YAMALUBE PERFORMANCE 1L", "GRASA KOBY", "TIRE SEALANT PROTIRE", "CABLE TIE", "HONDA BLUE SCT 800ML", "HONDA GEAR OIL"]
            print(f"{'Product':30} | {'30d Sales':10} | {'365d Sales':10}")
            print("-" * 55)
            for p in products:
                cur.execute("""
                    SELECT 
                        SUM(CASE WHEN s.invoice_date >= CURRENT_DATE - INTERVAL '30 days' THEN si.quantity ELSE 0 END) as q30,
                        SUM(si.quantity) as q365
                    FROM sold_items si
                    JOIN sales s ON si.invoice_id = s.invoice_id
                    JOIN products pr ON si.product_id = pr.product_id
                    WHERE pr.product_name = %s AND s.invoice_date >= CURRENT_DATE - INTERVAL '365 days'
                """, (p,))
                row = cur.fetchone()
                print(f"{p:30} | {float(row['q30'] or 0):10.2f} | {float(row['q365'] or 0):10.2f}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_sales()
