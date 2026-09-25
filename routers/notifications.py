from fastapi import APIRouter, Header, HTTPException, Body
from typing import List, Optional
import logging
import psycopg2.extras
from database import get_connection
from datetime import timezone

router = APIRouter()
log = logging.getLogger("invensight.notifications")

def _role_matches_target(user_role: str | None, username: str | None, target_roles_lower: list[str]) -> bool:
    if not user_role:
        return False
    
    role_norm = user_role.strip().lower()
    uname_norm = (username or "").strip().lower()
    
    # Root admin always receives any administrative/operational notification
    if uname_norm == "rootadminnginamo":
        return True
        
    # System Administrator (top admin tier) receives any notification targeted to system admin, super admin, administrator, admin, manager, or warehouse staff
    if role_norm in ("system administrator", "super admin"):
        if any(t in target_roles_lower for t in ("system administrator", "super admin", "administrator", "admin", "manager", "warehouse staff")):
            return True
            
    # Administrator receives any notification targeted to administrator, admin, super admin, manager, or warehouse staff
    if role_norm == "administrator":
        if any(t in target_roles_lower for t in ("administrator", "admin", "super admin", "manager", "warehouse staff")):
            return True
            
    # Manager receives any notification targeted to manager or warehouse staff
    if role_norm == "manager":
        if any(t in target_roles_lower for t in ("manager", "warehouse staff")):
            return True
            
    # Direct match for all roles (including custom roles, Cashier, Sales Staff, etc.)
    return role_norm in target_roles_lower


def dispatch_notification(type: str, title: str, message: str, link: Optional[str] = None, target_roles: List[str] = None):
    """
    Utility function to dispatch a notification to targeted roles, respecting user preferences.
    types: 'out_of_stock', 'order_completed', 'stock_movement', 'sales_forecast', 'new_user'
    """
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT user_id, username, role FROM users WHERE is_active = TRUE")
            all_users = cur.fetchall()
            
            # Filter by target_roles
            users = []
            if target_roles:
                target_roles_lower = [r.strip().lower() for r in target_roles if r]
                for user in all_users:
                    if _role_matches_target(user.get("role"), user.get("username"), target_roles_lower):
                        users.append(user['user_id'])
            else:
                users = [u['user_id'] for u in all_users]

            if not users:
                return

            # Check user preferences
            placeholders = ','.join(['%s'] * len(users))
            cur.execute(f"SELECT user_id FROM user_settings WHERE setting_key = %s AND setting_value = 'false' AND user_id IN ({placeholders})", [type] + users)
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

def dispatch_user_security_alert(user_id: int, title: str, message: str, link: Optional[str] = None):
    """
    Directly dispatches a high-priority security alert notification to a specific user.
    """
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
                VALUES (%s, 'security_alert', %s, %s, %s, FALSE, NOW())
            """, (user_id, title, message, link or "/profile"))
    except Exception as e:
        log.error(f"Dispatch Security Alert Error: {e}")
    finally:
        conn.close()

@router.get("/")
def get_notifications(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT notification_id, type, title, message, link, is_read, created_at
                FROM notifications 
                WHERE user_id = %s 
                ORDER BY created_at DESC 
                LIMIT 50
            """, (user_id,))
            rows = cur.fetchall()
            for r in rows:
                if r.get("created_at"):
                    dt = r["created_at"]
                    if dt.tzinfo is None:
                        r["created_at"] = dt.isoformat() + "Z"
                    else:
                        r["created_at"] = dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
            return rows
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

from datetime import datetime, timedelta

_active_maintenance = {
    "is_active": False,
    "target_time": None,
    "minutes": 5,
    "message": "",
    "scheduled_at": None,
}

@router.get("/active-maintenance")
def get_active_maintenance():
    global _active_maintenance
    if not _active_maintenance.get("is_active"):
        return {"is_active": False}
    
    target = _active_maintenance.get("target_time")
    if target:
        now = datetime.now(timezone.utc)
        diff = (target - now).total_seconds()
        if diff <= 0:  # Expire immediately when target time is reached
            _active_maintenance["is_active"] = False
            return {"is_active": False}
        return {
            "is_active": True,
            "target_time": target.isoformat(),
            "minutes": _active_maintenance.get("minutes", 5),
            "message": _active_maintenance.get("message", ""),
            "seconds_remaining": max(0, int(diff)),
        }
    return {"is_active": False}

@router.post("/broadcast-maintenance")
def broadcast_maintenance(payload: dict = Body(...), x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_id = int(x_actor_user_id)
    minutes = int(payload.get("minutes", 5))
    custom_msg = (payload.get("message") or "").strip()
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT role, username FROM users WHERE user_id = %s", (user_id,))
            user = cur.fetchone()
            if not user or ((user[0] or "").lower() not in ("administrator", "super admin", "system administrator") and (user[1] or "").lower() != "rootadminnginamo"):
                 raise HTTPException(status_code=403, detail="Only administrators can broadcast notifications")
        
        now = datetime.now(timezone.utc)
        target_time = now + timedelta(minutes=minutes) if minutes > 0 else now
        
        if not custom_msg:
            if minutes > 0:
                msg = f"Scheduled system update will begin in {minutes} minutes. Active sessions may be affected. Please save your work."
            else:
                msg = "System update is starting now. Active sessions may be affected. Please save your work."
        else:
            msg = custom_msg

        global _active_maintenance
        _active_maintenance = {
            "is_active": True,
            "target_time": target_time,
            "minutes": minutes,
            "message": msg,
            "scheduled_at": now,
        }
        
        dispatch_notification(
            type="system_update",
            title=f"System Update Incoming ({minutes}m)" if minutes > 0 else "System Update Notice",
            message=msg,
            link=None,
            target_roles=None
        )
        return {
            "status": "success",
            "active_maintenance": {
                "is_active": True,
                "target_time": target_time.isoformat(),
                "minutes": minutes,
                "message": msg,
                "seconds_remaining": max(0, int((target_time - now).total_seconds()))
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error broadcasting maintenance: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

@router.post("/cancel-maintenance")
def cancel_maintenance(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT role, username FROM users WHERE user_id = %s", (user_id,))
            user = cur.fetchone()
            if not user or ((user[0] or "").lower() not in ("administrator", "super admin", "system administrator") and (user[1] or "").lower() != "rootadminnginamo"):
                 raise HTTPException(status_code=403, detail="Only administrators can cancel notifications")
        
        global _active_maintenance
        _active_maintenance = {
            "is_active": False,
            "target_time": None,
            "minutes": 5,
            "message": "",
            "scheduled_at": None,
        }
        
        dispatch_notification(
            type="system_update",
            title="System Update Cancelled",
            message="The scheduled system update has been cancelled. You may continue your normal workflow.",
            link=None,
            target_roles=None
        )
        return {"status": "success"}
    finally:
        conn.close()

@router.post("/deploy-webhook")
def deploy_webhook(payload: dict = Body(default={})):
    """
    Webhook endpoint for Render, GitHub, or CI/CD to notify active users when a deployment is triggered.
    """
    minutes = int(payload.get("minutes", 5))
    now = datetime.now(timezone.utc)
    target_time = now + timedelta(minutes=minutes)
    msg = payload.get("message") or f"A new system update has been detected on Render and is deploying in ~{minutes} minutes. Please save your work."

    global _active_maintenance
    _active_maintenance = {
        "is_active": True,
        "target_time": target_time,
        "minutes": minutes,
        "message": msg,
        "scheduled_at": now,
    }

    dispatch_notification(
        type="system_update",
        title=f"Automatic Render Deploy Alert ({minutes}m)",
        message=msg,
        link=None,
        target_roles=None
    )
    return {"status": "success", "minutes": minutes, "message": msg}
