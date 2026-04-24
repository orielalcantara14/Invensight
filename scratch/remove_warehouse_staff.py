import os
import sys

# Adjust path to find database.py
sys.path.append(os.path.join(os.getcwd(), "server"))

import psycopg2
from database import get_connection

def remove_warehouse_staff():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check for users with this role
            cur.execute("SELECT user_id, username FROM users WHERE LOWER(role) = 'warehouse staff'")
            users = cur.fetchall()
            if users:
                print(f"Warning: Found {len(users)} users with 'Warehouse Staff' role. They will be unassigned.")
                for uid, uname in users:
                    print(f" - User: {uname} (ID: {uid})")
                # Unassign them
                cur.execute("UPDATE users SET role = NULL WHERE LOWER(role) = 'warehouse staff'")
            
            # Delete from roles table
            cur.execute("DELETE FROM roles WHERE LOWER(role_name) = 'warehouse staff'")
            print("Deleted 'Warehouse Staff' from roles table.")
            
            conn.commit()
    finally:
        conn.close()

if __name__ == "__main__":
    remove_warehouse_staff()
