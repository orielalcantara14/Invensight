import os
import re
from typing import Any, Optional

def _root_admin_username() -> str:
    return os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo").strip().lower()

def sanitize_audit_details(details: str) -> str:
    """
    Strips HTML tags to prevent XSS and keeps the log clean.
    """
    if not details:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<.*?>', '', details)
    # Remove extra whitespace
    clean = " ".join(clean.split())
    return clean

def add_audit_log(cur: Any, user_id: int, action: str, entity_type: str, entity_id: Optional[int], details: str):
    """
    Central utility to insert an audit log record.
    Now records every movement, including those by the Root Admin.
    """
    # Fetch username for additional context if needed (though we record user_id)
    cur.execute("SELECT username FROM users WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        return
        
    # Skip logging if the user is the Root Admin for privacy/security
    uname = (row["username"] or "").strip().lower()
    if uname == _root_admin_username() or uname == "rootadmin":
        return
        
    sanitized_details = sanitize_audit_details(details)
        
    cur.execute(
        """
        INSERT INTO auditlog (user_id, action, entity_type, entity_id, timestamp, details)
        VALUES (%s, %s, %s, %s, NOW(), %s)
        """,
        (user_id, action, entity_type, entity_id, sanitized_details),
    )
