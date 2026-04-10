import psycopg2
from database import get_connection

def check_columns():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'customer_returns'")
        cols = [r[0] for r in cur.fetchall()]
        print(f"customer_returns: {cols}")
        
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'sales'")
        cols = [r[0] for r in cur.fetchall()]
        print(f"sales: {cols}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_columns()
