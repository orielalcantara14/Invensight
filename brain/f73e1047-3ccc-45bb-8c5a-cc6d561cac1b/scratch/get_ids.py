import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('c:/Users/rovhi/Desktop/InvenSight/server/.env')

def get_ids():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "InvenSight"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "Rocketman09")
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users LIMIT 1")
            user_id = cur.fetchone()[0]
            cur.execute("SELECT terminal_id FROM pos_terminals LIMIT 1")
            row = cur.fetchone()
            terminal_id = row[0] if row else 1
            print(f"USER_ID: {user_id}")
            print(f"TERMINAL_ID: {terminal_id}")
    finally:
        conn.close()

if __name__ == "__main__":
    get_ids()
