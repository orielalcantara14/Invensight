from fastapi import APIRouter, Header, HTTPException, Body
import logging
from database import get_connection

router = APIRouter()
log = logging.getLogger("invensight.settings")

@router.get("/user")
def get_user_settings(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT setting_key, setting_value FROM user_settings WHERE user_id = %s", (user_id,))
            return {r['setting_key']: r['setting_value'] for r in cur.fetchall()}
    except Exception as e:
        log.error(f"Error fetching user settings: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

@router.put("/user")
def update_user_settings(settings: dict = Body(...), x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    """Update settings. Expects { "out_of_stock": true, "order_completed": false } """
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            for key, val in settings.items():
                if isinstance(val, bool):
                    cur.execute("""
                        INSERT INTO user_settings (user_id, setting_key, setting_value)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (user_id, setting_key) 
                        DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
                    """, (user_id, key, val))
        return {"status": "success"}
    except Exception as e:
        log.error(f"Error updating user settings: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()
