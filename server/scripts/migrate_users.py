import os
import sys
from pathlib import Path

# Add current directory to path so database.py can be imported
sys.path.append(str(Path(__file__).resolve().parent))

from database import get_connection

def migrate():
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            print("Adding columns to users table...")
            cur.execute("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE,
                ADD COLUMN IF NOT EXISTS mfa_code VARCHAR(6),
                ADD COLUMN IF NOT EXISTS mfa_expiry TIMESTAMP;
            """)
            
            print("Checking for duplicate emails...")
            cur.execute("SELECT email, COUNT(*) FROM users WHERE email IS NOT NULL AND email <> '' GROUP BY email HAVING COUNT(*) > 1")
            dupes = cur.fetchall()
            if dupes:
                print(f"WARNING: Duplicate emails found: {dupes}. Cleaning up duplicates by nulling them out for safety...")
                for email, count in dupes:
                    # Keep the first one, null out the rest
                    cur.execute("UPDATE users SET email = NULL WHERE email = %s AND user_id NOT IN (SELECT MIN(user_id) FROM users WHERE email = %s)", (email, email))
            
            print("Adding UNIQUE constraint to email...")
            try:
                cur.execute("ALTER TABLE users ADD CONSTRAINT unique_user_email UNIQUE (email)")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print("Unique constraint already exists.")
                else:
                    print(f"Could not add unique constraint: {e}")
            
            print("Migration successful!")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
