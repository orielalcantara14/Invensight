from database import get_connection

def rollback():
    conn = get_connection()
    cur = conn.cursor()
    
    BATCH_TAG = "BATCH_IMPORT_20260422"
    
    try:
        print(f"Finding records with tag: {BATCH_TAG}...")
        cur.execute("SELECT COUNT(*) FROM sales WHERE customer_info LIKE %s", (f"%{BATCH_TAG}%",))
        count = cur.fetchone()[0]
        
        if count == 0:
            print("No records found to delete.")
            return
            
        print(f"Found {count} sales to delete. This will also delete associated sold_items.")
        confirm = input(f"Are you sure you want to delete {count} records? (y/n): ")
        if confirm.lower() != 'y':
            print("Abort.")
            return
            
        cur.execute("DELETE FROM sales WHERE customer_info LIKE %s", (f"%{BATCH_TAG}%",))
        conn.commit()
        print(f"Successfully deleted {count} records.")
        
    except Exception as e:
        conn.rollback()
        print(f"Error: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    rollback()
