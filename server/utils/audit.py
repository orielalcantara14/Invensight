import os
import re
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

PHT = timezone(timedelta(hours=8))

def _root_admin_username() -> str:
    return os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo").strip().lower()

def format_pht_time(dt: Optional[datetime] = None) -> str:
    """
    Returns time formatted in Philippine Standard Time (PST / UTC+8).
    """
    if dt is None:
        pht_dt = datetime.now(timezone.utc).astimezone(PHT)
    else:
        if dt.tzinfo is None:
            pht_dt = dt.replace(tzinfo=timezone.utc).astimezone(PHT)
        else:
            pht_dt = dt.astimezone(PHT)
    return pht_dt.strftime("%I:%M %p on %b %d, %Y")

def sanitize_audit_details(details: str) -> str:
    """
    Strips HTML tags to prevent XSS and keeps the log clean.
    """
    if not details:
        return ""
    # Clean up encoding artifacts
    clean = details.replace("â,±", "₱").replace("â‚±", "₱")
    # Remove HTML tags
    clean = re.sub(r'<.*?>', '', clean)
    # Remove extra whitespace
    clean = " ".join(clean.split())
    return clean

def enrich_audit_narrative(username: str, role: str, action: str, entity_type: str, entity_id: Optional[int], raw_details: str, dt: Optional[datetime] = None) -> str:
    """
    Builds a complete, human-readable, literal narrative in Philippine Time (UTC+8).
    """
    role_str = f" ({role})" if role else ""
    user_str = f"User {username}{role_str}" if username and username.lower() not in ("system", "none", "unknown") else "System"
    
    time_str = format_pht_time(dt)
    time_suffix = f" at {time_str}"
    
    raw = (raw_details or "").replace("â,±", "₱").replace("â‚±", "₱").strip()
    
    # 1. Sale
    if action == "CREATE_SALE" or "POS sale completed" in raw or "processed POS Sale" in raw:
        inv_match = re.search(r'Invoice(?:\s*#|\s*:)?\s*(INV-[\w\d]+)', raw, re.IGNORECASE)
        method_match = re.search(r'paid via\s*([\w\s-]+?)(?:\s+at|\.|$)|Method:\s*([\w\s-]+?)\.', raw, re.IGNORECASE)
        total_match = re.search(r'(?:totaling|Total:)\s*([₱\d\.,]+)', raw, re.IGNORECASE)
        
        inv = inv_match.group(1) if inv_match else (f"INV-{str(entity_id).zfill(5)}" if entity_id else "INV-#####")
        method = "Cash"
        if method_match:
            method = (method_match.group(1) or method_match.group(2) or "Cash").strip()
            
        total = total_match.group(1).strip() if total_match else "₱0.00"
        if not total.startswith("₱"):
            total = f"₱{total}"
            
        return f"{user_str} processed POS Sale (Invoice #{inv}) totaling {total} paid via {method}{time_suffix}."

    # 2. OTP / Login / MFA
    if action == "VERIFY_OTP" or "OTP verified" in raw:
        return f"{user_str} successfully verified 2FA OTP security code and logged into the system{time_suffix}."
    
    if action == "LOGIN" or "User signed in" in raw or "User logged in" in raw or "logged into the system" in raw:
        if "MFA Bypass" in raw or "MFA Bypassed" in raw:
            return f"{user_str} logged in successfully with MFA bypass authorization{time_suffix}."
        return f"{user_str} logged into the system successfully{time_suffix}."

    # 2.5 POS Shift & Cash Drawer
    if action == "START_SHIFT" or "started shift" in raw.lower():
        cash_match = re.search(r'Starting Cash of ₱?([\d,]+\.?\d*)', raw) or re.search(r'₱?([\d,]+\.?\d*)', raw)
        amount = f"₱{cash_match.group(1)}" if cash_match else "₱0.00"
        notes_match = re.search(r'\(Notes:\s*\'?([^\']+?)\'?\)', raw)
        notes_str = f" [Opening Notes: '{notes_match.group(1)}']" if notes_match else ""
        return f"{user_str} started cash drawer shift with Starting Cash of {amount}{notes_str}{time_suffix}."
        
    if action == "END_SHIFT" or "ended shift" in raw.lower() or "closed register" in raw.lower():
        expected_match = re.search(r'Total Expected Cash of ₱?([\d,]+\.?\d*)', raw)
        actual_match = re.search(r'Actual Count:\s*₱?([\d,]+\.?\d*)', raw)
        notes_match = re.search(r'\(Notes:\s*\'?([^\']+?)\'?\)', raw)
        
        details_list = []
        if expected_match:
            details_list.append(f"Expected: ₱{expected_match.group(1)}")
        if actual_match:
            details_list.append(f"Counted: ₱{actual_match.group(1)}")
        if notes_match:
            details_list.append(f"Closing Notes: '{notes_match.group(1)}'")
            
        extra = f" ({', '.join(details_list)})" if details_list else ""
        return f"{user_str} ended cash drawer shift and closed register{extra}{time_suffix}."

    if action == "UPDATE_SHIFT_NOTES" or "updated notes for shift" in raw.lower():
        shift_match = re.search(r'shift\s*#?(\d+)', raw, re.IGNORECASE)
        shift_id_str = f"#{shift_match.group(1)}" if shift_match else (f"#{entity_id}" if entity_id else "")
        return f"{user_str} updated cashier shift {shift_id_str} notes: {raw}{time_suffix}."

    # 3. Password
    if action == "CHANGE_PASSWORD" or "changed their password" in raw or "updated and changed their account password" in raw:
        return f"{user_str} successfully updated and changed their account password{time_suffix}."
        
    if action == "RESET_PASSWORD" or "Password reset via OTP" in raw or "reset their account password" in raw:
        return f"{user_str} successfully reset their account password via OTP verification{time_suffix}."

    # 4. Failed Login, Lockout & Concurrent Login
    if action == "CONCURRENT_LOGIN_BLOCKED" or "simultaneous login attempt" in raw.lower() or "concurrent login" in raw.lower():
        target_name = username if username and username.lower() != "system" else "account"
        return f"Security Alert: Unauthorized simultaneous login attempt blocked for user account '{target_name}' from another device{time_suffix}."

    if action == "FAILED_LOGIN" or "Failed login attempt" in raw:
        attempt_match = re.search(r'\((\d+/\d+)\)', raw)
        attempt = attempt_match.group(1) if attempt_match else "1/4"
        target_name = username if username and username.lower() != "system" else "account"
        return f"Security Alert: Failed login attempt ({attempt}) detected for user '{target_name}'{time_suffix}."
        
    if action == "ACCOUNT_LOCKOUT" or "Account deactivated after" in raw or "locked out after" in raw:
        target_name = username if username and username.lower() != "system" else "account"
        return f"Security Alert: User account '{target_name}' was automatically deactivated and locked out after 4 failed login attempts{time_suffix}."

    # 5. Purchase Orders & Receiving
    if action == "CREATE_ORDER" or "Created purchase order" in raw or "created Purchase Order" in raw:
        po_match = re.search(r'Purchase Order\s*#?(PO-[\w\d]+)|purchase order:\s*(PO-[\w\d]+)', raw, re.IGNORECASE)
        sup_match = re.search(r'Supplier\s*#?(\d+)|Supplier ID:\s*(\d+)', raw, re.IGNORECASE)
        po = (po_match.group(1) or po_match.group(2)) if po_match else f"PO-{entity_id}"
        sup_id = (sup_match.group(1) or sup_match.group(2)) if sup_match else None
        sup = f"Supplier #{sup_id}" if sup_id else "Supplier"
        return f"{user_str} created Purchase Order #{po} for {sup}{time_suffix}."

    if action == "RECEIVE_ORDER" or "Received PO" in raw or "received delivery" in raw:
        po_match = re.search(r'Purchase Order\s*#?(PO-[\w\d]+)|Received PO:\s*(PO-[\w\d]+)', raw, re.IGNORECASE)
        rec_match = re.search(r'Receipt\s*#?([\w\d-]+)|Receipt:\s*([\w\d-]+)', raw, re.IGNORECASE)
        po = (po_match.group(1) or po_match.group(2)) if po_match else f"PO-{entity_id}"
        rec = (rec_match.group(1) or rec_match.group(2)) if rec_match else "N/A"
        return f"{user_str} received delivery for Purchase Order #{po} (Official Receipt #{rec}){time_suffix}."

    if action == "NOT_RECEIVE_ORDER" or ("Marked PO" in raw and "Not Received" in raw):
        po_match = re.search(r'PO\s*#?(PO-[\w\d]+)', raw, re.IGNORECASE)
        po = po_match.group(1) if po_match else f"PO-{entity_id}"
        reason_match = re.search(r'Reason:\s*(.*)', raw, re.IGNORECASE)
        reason = f" (Reason: {reason_match.group(1).strip()})" if reason_match else ""
        return f"{user_str} marked Purchase Order #{po} as Not Received{reason}{time_suffix}."

    # 6. Inventory & Products
    if action == "UPDATE_INVENTORY" or "Updated inventory item" in raw or "updated inventory stock" in raw:
        item_match = re.search(r"inventory stock for '([^']+)'|Updated inventory item:\s*([^(\n]+)", raw, re.IGNORECASE)
        qty_match = re.search(r'(\d+)\s*(?:units|left|\))', raw, re.IGNORECASE)
        item_name = (item_match.group(1) or item_match.group(2)).strip() if item_match else "item"
        qty = qty_match.group(1) if qty_match else ""
        qty_str = f" to {qty} units in stock" if qty else ""
        return f"{user_str} updated inventory stock for '{item_name}'{qty_str}{time_suffix}."

    if action == "CREATE_PRODUCT" or "Created product" in raw or "added new product" in raw:
        prod_match = re.search(r"added new product '([^']+)'|Created product:\s*([^(\n]+)", raw, re.IGNORECASE)
        sku_match = re.search(r'SKU:\s*([^)\n]+)', raw, re.IGNORECASE)
        prod = (prod_match.group(1) or prod_match.group(2)).strip() if prod_match else "product"
        sku = f" (SKU: {sku_match.group(1).strip()})" if sku_match else ""
        return f"{user_str} added new product '{prod}'{sku} to the catalog{time_suffix}."

    # 7. User Management
    if action == "CREATE_USER" or "Created user account" in raw or "created a new user account" in raw:
        u_match = re.search(r"for '([^']+)'|user account:\s*([^(\n]+)", raw, re.IGNORECASE)
        u_name = (u_match.group(1) or u_match.group(2)).strip() if u_match else "user"
        return f"{user_str} created a new user account for '{u_name}' (ID: #{entity_id}){time_suffix}."

    if action == "DELETE_USER" or "Deleted (archived) user" in raw or "deleted/archived user account" in raw:
        u_match = re.search(r"for '([^']+)'|user:\s*([^(\n]+)", raw, re.IGNORECASE)
        u_name = (u_match.group(1) or u_match.group(2)).strip() if u_match else "user"
        return f"{user_str} deleted/archived user account '{u_name}' (ID: #{entity_id}){time_suffix}."

    # 8. CSV Import
    if action == "IMPORT_HISTORICAL_SALES" or "Imported historical sales" in raw:
        return f"{user_str} imported historical sales records from CSV file into the database{time_suffix}."

    # Strip existing " at HH:MM ... on ..." if already in raw
    clean_raw = re.sub(r'\s+at\s+\d{1,2}:\d{2}\s+(?:AM|PM)\s+on\s+[\w\s,]+(?:\.|$)', '', raw)
    if not clean_raw.startswith("User ") and user_str != "System":
        return f"{user_str}: {clean_raw}{time_suffix}."
    return f"{clean_raw}{time_suffix}."

def add_audit_log(cur: Any, user_id: int, action: str, entity_type: str, entity_id: Optional[int], details: str):
    """
    Central utility to insert an audit log record with rich narrative details in Philippine Time.
    """
    cur.execute("SELECT username, role FROM users WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        return
        
    uname = ""
    urole = ""
    if isinstance(row, dict):
        uname = (row.get("username") or "").strip()
        urole = (row.get("role") or "").strip()
    else:
        uname = (row[0] or "").strip()
        urole = (row[1] or "").strip() if len(row) > 1 else ""

    if uname.lower() == _root_admin_username() or uname.lower() == "rootadmin":
        return

    sanitized = sanitize_audit_details(details)
    enriched_details = enrich_audit_narrative(uname, urole, action, entity_type, entity_id, sanitized, dt=None)
        
    cur.execute(
        """
        INSERT INTO auditlog (user_id, action, entity_type, entity_id, timestamp, details)
        VALUES (%s, %s, %s, %s, NOW(), %s)
        """,
        (user_id, action, entity_type, entity_id, enriched_details),
    )
