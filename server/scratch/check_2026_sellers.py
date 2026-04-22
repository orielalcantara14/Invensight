from database import get_connection
import psycopg2.extras

def check_2026():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            products = ["YAMALUBE PERFORMANCE 1L", "GRASA KOBY", "TIRE SEALANT PROTIRE", "CABLE TIE", "HONDA BLUE SCT 800ML", "HONDA GEAR OIL"]
            print(f"{'Product':30} | {'2026 Sales':15}")
            print("-" * 50)
            for p in products:
                cur.execute("""
                    SELECT SUM(si.quantity) as q
                    FROM sold_items si
                    JOIN sales s ON si.invoice_id = s.invoice_id
                    JOIN products pr ON si.product_id = pr.product_id
                    WHERE pr.product_name = %s AND s.invoice_date >= '2026-01-01'
                """, (p,))
                row = cur.fetchone()
                print(f"{p:30} | {float(row['q'] or 0):15.2f}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_2026()
