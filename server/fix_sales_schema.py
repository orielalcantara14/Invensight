from database import get_connection

def fix():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'sales'")
    cols = [row[0] for row in cur.fetchall()]
    
    if 'customer_name' not in cols:
        print("Adding customer_name to sales...")
        cur.execute("ALTER TABLE sales ADD COLUMN customer_name VARCHAR(255)")
    if 'contact_number' not in cols:
        print("Adding contact_number to sales...")
        cur.execute("ALTER TABLE sales ADD COLUMN contact_number VARCHAR(100)")
        
    conn.commit()
    conn.close()
    print("Fix completed.")

if __name__ == "__main__":
    fix()
