from database import get_connection

def check_indexes():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename IN ('sales', 'sold_items')
            """)
            rows = cur.fetchall()
            for row in rows:
                print(f"Index: {row[0]}")
                print(f"Def:   {row[1]}\n")
    finally:
        conn.close()

if __name__ == "__main__":
    check_indexes()
