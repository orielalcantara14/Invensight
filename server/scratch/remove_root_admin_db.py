import os
import sys
from pathlib import Path

# Add parent directory to sys.path to import from server
server_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(server_dir))

try:
    from database import get_connection
    print("Successfully imported get_connection")
except ImportError as e:
    print(f"Error importing get_connection: {e}")
    sys.exit(1)

def main():
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # 1. Update any users assigned to 'Root Admin' to 'administrator'
        print("Checking for users assigned to 'Root Admin'...")
        cur.execute("SELECT user_id, username FROM users WHERE LOWER(role) = 'root admin'")
        affected_users = cur.fetchall()
        
        if affected_users:
            print(f"Found {len(affected_users)} users assigned to 'Root Admin'. Re-assigning to 'administrator'...")
            cur.execute("UPDATE users SET role = 'administrator' WHERE LOWER(role) = 'root admin'")
            print(f"Successfully updated {cur.rowcount} users.")
        else:
            print("No users found with 'Root Admin' role.")

        # 2. Delete the 'Root Admin' role from the roles table
        print("Checking for 'Root Admin' role in roles table...")
        cur.execute("SELECT role_id FROM roles WHERE LOWER(role_name) = 'root admin'")
        role_entry = cur.fetchone()
        
        if role_entry:
            print(f"Found 'Root Admin' role (ID: {role_entry[0]}). Deleting...")
            cur.execute("DELETE FROM roles WHERE LOWER(role_name) = 'root admin'")
            print(f"Successfully deleted {cur.rowcount} role record(s).")
        else:
            print("'Root Admin' role record not found in database.")

        conn.commit()
        print("\nDatabase cleanup completed successfully.")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during database cleanup: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
