from database import get_connection
import psycopg2.extras

def check_specific_products():
    products = [
        "BETA GREY", "COOLANT", "PETRON SC400", "FLARINGS SCREW",
        "BRAKE MASTER REPAIR KIT HONDA BEAT", "CORSA CROSS S 130/70-13"
    ]
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            for p in products:
                cur.execute("""
                    SELECT SUM(si.quantity) as q
                    FROM sold_items si
                    JOIN sales s ON si.invoice_id = s.invoice_id
                    JOIN products pr ON si.product_id = pr.product_id
                    WHERE pr.product_name = %s
                """, (p,))
                row = cur.fetchone()
                total = row['q'] if row['q'] else 0
                
                cur.execute("""
                    SELECT SUM(si.quantity) as q
                    FROM sold_items si
                    JOIN sales s ON si.invoice_id = s.invoice_id
                    JOIN products pr ON si.product_id = pr.product_id
                    WHERE pr.product_name = %s AND s.invoice_date >= CURRENT_DATE - INTERVAL '90 days'
                """, (p,))
                row90 = cur.fetchone()
                q90 = row90['q'] if row90['q'] else 0
                
                print(f"{p}: Total={total}, Last 90d={q90}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_specific_products()
