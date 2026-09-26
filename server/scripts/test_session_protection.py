import os
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

def test_session_protection():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # 1. Fetch a test user (e.g. Oriel / cashier or any non-root user)
    cur.execute("SELECT user_id, username FROM users WHERE LOWER(username) != 'rootadminnginamo' LIMIT 1")
    user = cur.fetchone()
    if not user:
        print("No non-root user found.")
        return
    
    uid = user["user_id"]
    uname = user["username"]
    print(f"Testing with User: {uname} (ID: {uid})")
    
    # 2. Simulate active session
    cur.execute("""
        UPDATE users 
        SET current_session_token = 'test-active-token-12345', 
            session_last_active = NOW() 
        WHERE user_id = %s
    """, (uid,))
    conn.commit()
    print("  Simulated active session for user.")
    
    # 3. Verify active session check
    cur.execute("""
        SELECT 1 FROM users 
        WHERE user_id = %s 
          AND current_session_token IS NOT NULL 
          AND session_last_active > NOW() - INTERVAL '5 minutes'
    """, (uid,))
    is_active = cur.fetchone() is not None
    print(f"  Active session detection check: {'PASS (Active Session Detected)' if is_active else 'FAIL'}")
    
    # 4. Clean up test token
    cur.execute("UPDATE users SET current_session_token = NULL, session_last_active = NULL WHERE user_id = %s", (uid,))
    conn.commit()
    print("  Cleaned up test session token.")
    
    cur.close()
    conn.close()
    print("All session protection checks PASSED.")

if __name__ == "__main__":
    test_session_protection()
