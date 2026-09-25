import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def run():
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
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS current_session_token VARCHAR(255),
                ADD COLUMN IF NOT EXISTS session_last_active TIMESTAMP,
                ADD COLUMN IF NOT EXISTS session_device_info TEXT;
            """)
            conn.commit()
            print(f"  Successfully added session columns to users table in {db_name}.")
            cur.close()
            conn.close()
        except Exception as e:
            print(f"  Error on {db_name}: {e}")

if __name__ == "__main__":
    run()
