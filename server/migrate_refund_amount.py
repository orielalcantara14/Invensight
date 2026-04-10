from database import get_connection

def migrate():
    conn = get_connection()
    try:
        cur = conn.cursor()
        print("Checking for refund_amount column...")
        cur.execute("""
            SELECT count(*) 
            FROM information_schema.columns 
            WHERE table_name = 'customer_returns' AND column_name = 'refund_amount'
        """)
        exists = cur.fetchone()[0] > 0
        
        if not exists:
            print("Adding refund_amount column to customer_returns...")
            cur.execute("ALTER TABLE customer_returns ADD COLUMN refund_amount NUMERIC(15,2) DEFAULT 0.00")
            conn.commit()
            print("Migration successful.")
        else:
            print("Column already exists.")
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
