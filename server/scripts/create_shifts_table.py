import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def create_shifts_table():
    db_urls = [
        ("Cloud Render DB", os.getenv("DATABASE_URL")),
        ("Local PostgreSQL", os.getenv("LOCAL_DATABASE_URL", "postgresql://postgres:Rocketman09@localhost:5432/InvenSight"))
    ]
    
    for db_name, db_url in db_urls:
        if not db_url:
            continue
        try:
            print(f"Connecting to {db_name}...")
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pos_shifts (
                    shift_id SERIAL PRIMARY KEY,
                    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
                    terminal_id INT NULL,
                    starting_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                    cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                    total_expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                    ending_cash NUMERIC(12, 2) NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
                    notes TEXT NULL,
                    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    closed_at TIMESTAMP WITH TIME ZONE NULL
                );
            """)
            conn.commit()
            print(f"  Successfully created pos_shifts table in {db_name}.")
            cur.close()
            conn.close()
        except Exception as e:
            print(f"  Error on {db_name}: {e}")

if __name__ == "__main__":
    create_shifts_table()
