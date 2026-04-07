from fastapi import APIRouter, Header, HTTPException
from typing import List, Optional
import logging
from database import get_connection

router = APIRouter()
log = logging.getLogger("invensight.notifications")

def dispatch_notification(type: str, title: str, message: str, link: Optional[str] = None, target_roles: List[str] = None):
    """
    Utility function to dispatch a notification to targeted roles, respecting user preferences.
    types: 'out_of_stock', 'order_completed', 'stock_movement', 'sales_forecast', 'new_user'
    """
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, role FROM users WHERE is_active = TRUE")
            all_users = cur.fetchall()
            
            # Filter by target_roles
            users = []
            if target_roles:
                target_roles_lower = [r.lower() for r in target_roles]
                for user in all_users:
                    if user['role'] and user['role'].lower() in target_roles_lower:
                        users.append(user['user_id'])
            else:
                users = [u['user_id'] for u in all_users]

            if not users:
                return

            # Check user preferences
            placeholders = ','.join(['%s'] * len(users))
            cur.execute(f"SELECT user_id FROM user_settings WHERE setting_key = %s AND setting_value = FALSE AND user_id IN ({placeholders})", [type] + users)
            disabled_users = set(r['user_id'] for r in cur.fetchall())
            
            final_users = [u for u in users if u not in disabled_users]
            
            for u in final_users:
                cur.execute("""
                    INSERT INTO notifications (user_id, type, title, message, link)
                    VALUES (%s, %s, %s, %s, %s)
                """, (u, type, title, message, link))
    except Exception as e:
        log.error(f"Dispatch Notification Error: {e}")
    finally:
        conn.close()

@router.get("/")
def get_notifications(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT notification_id, type, title, message, link, is_read, created_at
                FROM notifications 
                WHERE user_id = %s 
                ORDER BY created_at DESC 
                LIMIT 50
            """, (user_id,))
            return cur.fetchall()
    except Exception as e:
        log.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

@router.put("/read-all")
def mark_all_read(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s", (user_id,))
        return {"status": "success"}
    finally:
        conn.close()

@router.put("/{notification_id}/read")
def mark_read(notification_id: int, x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("UPDATE notifications SET is_read = TRUE WHERE notification_id = %s AND user_id = %s", (notification_id, user_id))
        return {"status": "success"}
    finally:
        conn.close()

@router.delete("/clear-all")
def clear_all(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("DELETE FROM notifications WHERE user_id = %s", (user_id,))
        return {"status": "success"}
    finally:
        conn.close()

@router.delete("/{notification_id}")
def delete_notification(notification_id: int, x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("DELETE FROM notifications WHERE notification_id = %s AND user_id = %s", (notification_id, user_id))
        return {"status": "success"}
    finally:
        conn.close()
