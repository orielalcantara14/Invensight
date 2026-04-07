import os
from typing import Any, Optional

def _root_admin_username() -> str:
    return os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo").strip().lower()

def add_audit_log(cur: Any, user_id: int, action: str, entity_type: str, entity_id: Optional[int], details: str):
    """
    Central utility to insert an audit log record.
    Skips logging if the user is the Root Admin.
    """
    # Fetch username to check if it's Root Admin
    cur.execute("SELECT username FROM users WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        return
        
    username = (row.get("username") or "").strip().lower()
    if username == _root_admin_username():
        return
        
    cur.execute(
        """
        INSERT INTO auditlog (user_id, action, entity_type, entity_id, timestamp, details)
        VALUES (%s, %s, %s, %s, NOW(), %s)
        """,
        (user_id, action, entity_type, entity_id, details),
    )
