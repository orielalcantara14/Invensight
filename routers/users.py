import os
import secrets
import urllib.request
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from database import get_connection
from models import (
    CreateUserRequest,
    CreateRoleRequest,
    UpdateRoleRequest,
    UpdateUserRequest,
    UserResponse,
    RoleResponse,
    UserManagementStatsResponse,
    AuditLogEntryResponse,
    UpdateAuditLogRequest,
)
import psycopg2.extras
import bcrypt
import json
from datetime import date
from pydantic import BaseModel
from utils.audit import add_audit_log
from routers.notifications import dispatch_notification

router = APIRouter()

ROOT_ADMIN_USERNAME_ENV = "ROOT_ADMIN_USERNAME"
ROOT_ADMIN_KEY_ENV = "ROOT_ADMIN_KEY"
ROLE_SYSTEM_ADMIN = "system administrator"
ROLE_SUPER_ADMIN = "super admin"
ROLE_ADMINISTRATOR = "administrator"
ROLE_MANAGER = "manager"
ROLE_SALES_STAFF = "sales staff"
ROLE_CASHIER = "cashier"

# Strict Hierarchy: Root Admin (100) > System Administrator (80) > Administrator (60) > Manager (40) > Sales Staff / Cashier (20)
ROLE_HIERARCHY = {
    ROLE_SYSTEM_ADMIN: 80,
    ROLE_SUPER_ADMIN: 80,
    "system admin": 80,
    ROLE_ADMINISTRATOR: 60,
    "admin": 60,
    ROLE_MANAGER: 40,
    ROLE_SALES_STAFF: 20,
    ROLE_CASHIER: 20,
}

ROLE_LABELS = {
    ROLE_SYSTEM_ADMIN: "System Administrator",
    ROLE_SUPER_ADMIN: "System Administrator",
    ROLE_ADMINISTRATOR: "Administrator",
    ROLE_MANAGER: "Manager",
    ROLE_SALES_STAFF: "Sales Staff",
    ROLE_CASHIER: "Cashier",
}


def _get_role_level(role_name: str | None) -> int:
    if not role_name:
        return 0
    return ROLE_HIERARCHY.get(role_name.strip().lower(), 30)


def _can_actor_manage_target_user(actor: dict, target_user: dict) -> bool:
    if actor.get("is_root_admin"):
        return True
    if _is_root_admin_username(target_user.get("username")):
        return False
    if actor.get("user_id") == target_user.get("user_id"):
        return False  # Cannot delete/trash own account
    actor_role = actor.get("role_key") or ""
    actor_level = 100 if actor.get("is_root_admin") else _get_role_level(actor_role)
    target_level = _get_role_level(target_user.get("role"))
    return actor_level > target_level


def _can_actor_assign_role(actor: dict, requested_role: str) -> bool:
    if actor.get("is_root_admin"):
        return True
    actor_role = actor.get("role_key") or ""
    actor_level = 100 if actor.get("is_root_admin") else _get_role_level(actor_role)
    requested_level = _get_role_level(requested_role)
    return actor_level > requested_level


def _root_admin_username() -> str:
    return os.getenv(ROOT_ADMIN_USERNAME_ENV, "rootadminnginamo").strip().lower()


def _is_root_admin_username(username: str | None) -> bool:
    if not username:
        return False
    return username.strip().lower() == _root_admin_username()


def _require_root_admin_key(x_root_admin_key: str | None) -> None:
    expected = os.getenv(ROOT_ADMIN_KEY_ENV, "").strip()
    if not expected:
        raise HTTPException(
            status_code=501,
            detail=f"{ROOT_ADMIN_KEY_ENV} is not configured on the server",
        )
    if not x_root_admin_key or not secrets.compare_digest(x_root_admin_key, expected):
        raise HTTPException(status_code=403, detail="Forbidden")


class RootAdminResetRequest(BaseModel):
    new_password: str
    new_username: Optional[str] = None


@router.get("/user-management-stats", response_model=UserManagementStatsResponse)
def user_management_stats(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    """
    Active sessions: active users whose last_login date is today (server date).
    Matches `last_login` updates on sign-in (auth router sets CURRENT_DATE).
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            is_root = actor.get("is_root_admin")

            cur.execute(
                """
                SELECT COUNT(*)::int AS c
                FROM users
                WHERE is_active = true
                  AND last_login IS NOT NULL
                  AND last_login = CURRENT_DATE
                  AND (username IS NULL OR LOWER(TRIM(username)) <> %s)
                """
                ,
                (_root_admin_username(),),
            )
            active_sessions = cur.fetchone()["c"]

            if is_root:
                cur.execute("SELECT COUNT(*)::int AS c FROM auditlog")
            else:
                cur.execute(
                    """
                    SELECT COUNT(*)::int AS c 
                    FROM auditlog a
                    LEFT JOIN users u ON a.user_id = u.user_id
                    WHERE u.username IS NULL OR LOWER(TRIM(u.username)) <> %s
                    """,
                    (_root_admin_username(),)
                )
            audit_log_count = cur.fetchone()["c"]
    finally:
        conn.close()

    return UserManagementStatsResponse(
        active_sessions=active_sessions,
        audit_log_count=audit_log_count,
    )


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _normalize_role(role: str | None) -> str:
    return (role or "").strip().lower()


def _canonical_role_or_400(role: str) -> str:
    role_str = (role or "").strip()
    if not role_str:
        raise HTTPException(status_code=400, detail="Role is required")
    norm = role_str.lower()
    if norm in ("admin", "administrator"):
        return "administrator"
    if norm in ("system administrator", "system admin", "super admin"):
        return "system administrator"
    return role_str


def _role_label(role_key: str) -> str:
    norm = _normalize_role(role_key)
    if norm in ROLE_LABELS:
        return ROLE_LABELS[norm]
    return role_key


def _normalize_permissions(perms: object) -> dict[str, set[str]]:
    if not isinstance(perms, dict):
        return {}
    normalized: dict[str, set[str]] = {}
    for module_raw, actions_raw in perms.items():
        module = str(module_raw).strip().lower()
        if not module:
            continue
        actions: set[str] = set()
        if isinstance(actions_raw, list):
            for action_raw in actions_raw:
                action = str(action_raw).strip().lower()
                if action:
                    actions.add(action)
        if actions:
            normalized[module] = actions
    return normalized


def _sanitize_permissions_for_storage(perms: object) -> dict[str, list[str]]:
    if not isinstance(perms, dict):
        return {}
    cleaned: dict[str, list[str]] = {}
    for module_raw, actions_raw in perms.items():
        module = str(module_raw).strip()
        if not module:
            continue
        seen: set[str] = set()
        ordered_actions: list[str] = []
        if isinstance(actions_raw, list):
            for action_raw in actions_raw:
                action = str(action_raw).strip()
                key = action.lower()
                if not action or key in seen:
                    continue
                seen.add(key)
                ordered_actions.append(action)
        if ordered_actions:
            cleaned[module] = ordered_actions
    return cleaned


def _is_subset_permissions(
    child: dict[str, set[str]],
    parent: dict[str, set[str]],
) -> bool:
    for module, actions in child.items():
        parent_actions = parent.get(module, set())
        if not actions.issubset(parent_actions):
            return False
    return True


def _parse_actor_user_id_or_401(x_actor_user_id: str | None) -> int:
    if not x_actor_user_id or not x_actor_user_id.strip():
        raise HTTPException(status_code=401, detail="Missing actor identity")
    try:
        return int(x_actor_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid actor user id")


def _get_actor_or_403(cur, actor_user_id: int) -> dict:
    cur.execute(
        """
        SELECT u.user_id, u.username, u.role, u.is_active, u.permissions_json, r.permissions_text
        FROM users u
        LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.role_name) AND r.user_id IS NULL
        WHERE u.user_id = %s
        """,
        (actor_user_id,),
    )
    actor = cur.fetchone()
    if not actor:
        raise HTTPException(status_code=403, detail="Actor not found")
    if not actor["is_active"]:
        raise HTTPException(status_code=403, detail="Inactive actor account")
    actor["role_key"] = _normalize_role(actor.get("role"))
    actor["is_root_admin"] = _is_root_admin_username(actor.get("username"))
    
    # Merge permissions: prefer user-specific permissions_json if not empty, otherwise fallback to role's permissions_text
    perms = None
    if actor.get("permissions_json") and isinstance(actor["permissions_json"], dict) and len(actor["permissions_json"]) > 0:
        perms = actor["permissions_json"]
    elif actor.get("permissions_text"):
        try:
            perms = json.loads(actor["permissions_text"])
        except:
            perms = {}
    
    actor["permissions_norm"] = _normalize_permissions(perms)
    return actor


NON_ADMIN_ROLES = (ROLE_MANAGER, ROLE_SALES_STAFF, ROLE_CASHIER)
RESTRICTED_MODULES_FOR_NON_ADMIN_ROLES = ("user management", "role permissions")


def _actor_has_permission(actor: dict, module: str, action: str) -> bool:
    if actor.get("is_root_admin") or actor.get("role_key") in (ROLE_SYSTEM_ADMIN, ROLE_SUPER_ADMIN):
        return True
    module_key = module.strip().lower()
    action_key = action.strip().lower()
    return action_key in actor.get("permissions_norm", {}).get(module_key, set())


def _enforce_non_admin_target_module_restrictions(
    target_role_key: str,
    assigned_permissions_norm: dict[str, set[str]],
) -> None:
    target_key = _normalize_role(target_role_key)
    if target_key not in NON_ADMIN_ROLES:
        return
    forbidden = [
        m for m in assigned_permissions_norm.keys() if m in RESTRICTED_MODULES_FOR_NON_ADMIN_ROLES
    ]
    if forbidden:
        raise HTTPException(
            status_code=400,
            detail="Manager, Sales Staff, and Cashier cannot be assigned user-management or role-permission privileges",
        )


def _require_role_management_access(cur, x_actor_user_id: str | None, action: str) -> dict:
    actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
    actor = _get_actor_or_403(cur, actor_user_id)
    if actor["is_root_admin"] or actor.get("role_key") in (ROLE_SYSTEM_ADMIN, ROLE_SUPER_ADMIN):
        return actor
    if actor["role_key"] not in (ROLE_ADMINISTRATOR,):
        raise HTTPException(status_code=403, detail="Only Root Admin, System Administrators, and Administrators can manage roles")
    if not _actor_has_permission(actor, "Role Permissions", action):
        raise HTTPException(status_code=403, detail=f"Missing {action} permission for Role Permissions module")
    return actor


@router.get("/users", response_model=list[UserResponse])
def list_users(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)

            where_clauses = ["(username IS NULL OR LOWER(TRIM(username)) <> %s)"]
            params = [_root_admin_username()]

            query = f"""
                SELECT user_id, username, full_name, employee_id, role, is_active, last_login, email, permissions_json
                FROM users
                WHERE {" AND ".join(where_clauses)}
                ORDER BY user_id
            """
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
    finally:
        conn.close()

    out: list[UserResponse] = []
    for r in rows:
        ll = r["last_login"]
        out.append(
            UserResponse(
                id=r["user_id"],
                username=r["username"] or "",
                full_name=r["full_name"],
                employee_id=r["employee_id"],
                role=r["role"],
                is_active=r["is_active"],
                last_login=ll.isoformat() if ll else None,
                email=r.get("email"),
                permissions_json=r.get("permissions_json"),
            )
        )
    return out


@router.post("/users", response_model=UserResponse)
def create_user(
    body: CreateUserRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
):
    if not body.username.strip():
        raise HTTPException(status_code=400, detail="Username is required")
    if _is_root_admin_username(body.username):
        raise HTTPException(status_code=403, detail="This username is reserved")
    target_role_key = _canonical_role_or_400(body.role)
    requested_permissions_for_storage = _sanitize_permissions_for_storage(body.permissions or {})
    requested_permissions_norm = _normalize_permissions(requested_permissions_for_storage)
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)

            if not actor.get("is_root_admin"):
                if not _actor_has_permission(actor, "User Management", "Add"):
                    raise HTTPException(status_code=403, detail="Missing Add User permission")
                if not _can_actor_assign_role(actor, target_role_key):
                    raise HTTPException(
                        status_code=403,
                        detail=f"Your role cannot create or assign accounts with role '{target_role_key}'.",
                    )

            _enforce_non_admin_target_module_restrictions(
                target_role_key,
                requested_permissions_norm,
            )
            cur.execute(
                """
                SELECT role_name FROM roles
                WHERE user_id IS NULL AND (
                    LOWER(TRIM(role_name)) = LOWER(TRIM(%s))
                    OR (LOWER(TRIM(%s)) IN ('admin', 'administrator') AND LOWER(TRIM(role_name)) IN ('admin', 'administrator'))
                    OR (LOWER(TRIM(%s)) IN ('system administrator', 'system admin', 'super admin') AND LOWER(TRIM(role_name)) IN ('system administrator', 'system admin', 'super admin'))
                )
                LIMIT 1
                """,
                (target_role_key, target_role_key, target_role_key),
            )
            matched_role = cur.fetchone()
            if not matched_role:
                raise HTTPException(
                    status_code=400,
                    detail="Role does not exist. Add it under Roles or pick an existing role.",
                )
            role_to_save = matched_role["role_name"]

            cur.execute(
                "SELECT 1 FROM users WHERE LOWER(username) = LOWER(%s)",
                (body.username.strip(),),
            )
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Username already exists")

            cur.execute("SELECT COALESCE(MAX(user_id), 0) AS n FROM users")
            next_uid = cur.fetchone()["n"] + 1
            cur.execute("SELECT COALESCE(MAX(employee_id), 0) AS n FROM users")
            next_eid = cur.fetchone()["n"] + 1
            perms_json = json.dumps(requested_permissions_for_storage)
            email_val = (body.email or "").strip().lower() or None
            if email_val:
                cur.execute("SELECT 1 FROM users WHERE LOWER(email) = %s", (email_val,))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="Email already in use")

            # Use the temporary password as generated and shown by the frontend
            pwd_hash = _hash_password(body.password)

            cur.execute(
                """
                INSERT INTO users (
                    user_id, employee_id, password_hash, full_name, role,
                    is_active, created_date, last_login, username, permissions_json, email,
                    must_change_password
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, NULL, %s, %s::jsonb, %s, TRUE)
                RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email, permissions_json
                """,
                (
                    next_uid,
                    next_eid,
                    pwd_hash,
                    body.full_name.strip(),
                    _role_label(target_role_key),
                    body.is_active,
                    date.today(),
                    body.username.strip(),
                    perms_json,
                    email_val,
                ),
            )
            row = cur.fetchone()
            
            # --- Audit log ---
            add_audit_log(
                cur,
                actor_user_id,
                "CREATE_USER",
                "user",
                row["user_id"],
                f"Created user account: {body.username.strip()} (ID: {row['user_id']})"
            )
            
            # --- Notification ---
            dispatch_notification(
                type="new_user",
                title="New User Added",
                message=f"User {body.username.strip()} has been added to the system.",
                link="/users",
                target_roles=["Administrator", "System Administrator", "Super Admin"]
            )
            
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    # --- Dispatch onboarding welcome email via EmailJS directly from backend ---
    if row and row.get("email"):
        try:
            full_name_raw = (row.get("full_name") or "").strip()
            first_name_extracted = full_name_raw
            if "," in full_name_raw:
                parts = full_name_raw.split(",", 1)
                first_name_extracted = parts[1].strip().split()[0] if parts[1].strip() else full_name_raw
            elif " " in full_name_raw:
                first_name_extracted = full_name_raw.split()[0]

            role_display = (row.get("role") or "STAFF").upper()
            username_clean = (row.get("username") or "").strip()

            emailjs_data = {
                "service_id": "service_kzur8un",
                "template_id": "template_nn7zdgv",
                "user_id": "ZnEuZEpNlMgItPEBG",
                "template_params": {
                    "first_name": first_name_extracted,
                    "First_Name": first_name_extracted,
                    "FIRST_NAME": first_name_extracted,
                    "full_name": first_name_extracted,
                    "Full_Name": first_name_extracted,
                    "name": first_name_extracted,
                    "to_name": first_name_extracted,
                    "username": username_clean,
                    "Username": username_clean,
                    "USERNAME": username_clean,
                    "password": body.password,
                    "Password": body.password,
                    "PASSWORD": body.password,
                    "system_id": username_clean,
                    "System_Id": username_clean,
                    "role": role_display,
                    "Role": role_display,
                    "ROLE": role_display,
                    "email": row.get("email"),
                    "to_email": row.get("email"),
                    "Email": row.get("email"),
                    "login_url": "https://www.inven-sight.com/",
                    "Login_Url": "https://www.inven-sight.com/",
                }
            }
            req = urllib.request.Request(
                "https://api.emailjs.com/api/v1.0/email/send",
                data=json.dumps(emailjs_data).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Origin": "https://www.inven-sight.com",
                    "Referer": "https://www.inven-sight.com/",
                }
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                response.read()
        except Exception as email_err:
            print("Failed to dispatch welcome credentials from backend:", email_err)

    ll = row["last_login"]
    return UserResponse(
        id=row["user_id"],
        username=row["username"] or "",
        full_name=row["full_name"],
        employee_id=row["employee_id"],
        role=row["role"],
        is_active=row["is_active"],
        last_login=ll.isoformat() if ll else None,
        email=row.get("email"),
        permissions_json=row.get("permissions_json"),
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UpdateUserRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
    x_root_admin_key: str | None = Header(default=None, alias="X-Root-Admin-Key"),
):
    uname = body.username.strip()
    if not uname:
        raise HTTPException(status_code=400, detail="Username is required")
    if _is_root_admin_username(uname):
        raise HTTPException(status_code=403, detail="This username is reserved")

    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            requested_role_key = _canonical_role_or_400(body.role)
            cur.execute(
                "SELECT user_id, username, role, full_name, email, is_active, password_hash FROM users WHERE user_id = %s", (user_id,)
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="User not found")
            existing_role_key = _normalize_role(existing.get("role"))
            
            if _is_root_admin_username(existing.get("username")):
                _require_root_admin_key(x_root_admin_key)
                if not actor.get("is_root_admin"):
                    raise HTTPException(status_code=403, detail="Only Root Admin can manage Root Admin account")

            if not actor.get("is_root_admin"):
                if not _actor_has_permission(actor, "User Management", "Edit"):
                    raise HTTPException(status_code=403, detail="Missing Edit User permission")
                if not _can_actor_manage_target_user(actor, existing):
                    raise HTTPException(
                        status_code=403,
                        detail="You cannot modify this user account due to role hierarchy.",
                    )
                if not _can_actor_assign_role(actor, requested_role_key):
                    raise HTTPException(
                        status_code=403,
                        detail=f"Your role cannot assign the '{requested_role_key}' role.",
                    )

            cur.execute(
                """
                SELECT 1 FROM users
                WHERE user_id <> %s
                  AND username IS NOT NULL AND TRIM(username) <> ''
                  AND LOWER(TRIM(username)) = LOWER(TRIM(%s))
                """,
                (user_id, uname),
            )
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Username already taken")

            email_val = (body.email or "").strip().lower() or None
            if email_val:
                cur.execute("SELECT 1 FROM users WHERE LOWER(email) = %s AND user_id <> %s", (email_val, user_id))
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="Email already in use")

            cur.execute(
                """
                SELECT role_name FROM roles
                WHERE user_id IS NULL AND (
                    LOWER(TRIM(role_name)) = LOWER(TRIM(%s))
                    OR (LOWER(TRIM(%s)) IN ('admin', 'administrator') AND LOWER(TRIM(role_name)) IN ('admin', 'administrator'))
                    OR (LOWER(TRIM(%s)) IN ('system administrator', 'system admin', 'super admin') AND LOWER(TRIM(role_name)) IN ('system administrator', 'system admin', 'super admin'))
                )
                LIMIT 1
                """,
                (requested_role_key, requested_role_key, requested_role_key),
            )
            matched_role = cur.fetchone()
            if not matched_role:
                raise HTTPException(
                    status_code=400,
                    detail="Role does not exist. Pick an existing role.",
                )
            role_to_save = matched_role["role_name"]

            email_val = (body.email or "").strip() or None
            new_pw = (body.new_password or "").strip()
            
            perms_json = None
            if body.permissions is not None:
                perms_json = json.dumps(_sanitize_permissions_for_storage(body.permissions))

            if new_pw:
                existing_hash = existing.get("password_hash")
                if existing_hash:
                    hash_bytes = existing_hash.encode("utf-8") if isinstance(existing_hash, str) else existing_hash
                    if bcrypt.checkpw(new_pw.encode("utf-8"), hash_bytes):
                        raise HTTPException(
                            status_code=400,
                            detail="New password cannot be the same as the user's current password. Please choose a different password."
                        )
                pwd_hash = _hash_password(new_pw)
                if perms_json is not None:
                    cur.execute(
                        """
                        UPDATE users SET
                          username = %s,
                          full_name = %s,
                          email = %s,
                          role = %s,
                          is_active = %s,
                          password_hash = %s,
                          permissions_json = %s::jsonb
                        WHERE user_id = %s
                        RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email, permissions_json
                        """,
                        (
                            uname,
                            body.full_name.strip(),
                            email_val,
                            _role_label(requested_role_key),
                            body.is_active,
                            pwd_hash,
                            perms_json,
                            user_id,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE users SET
                          username = %s,
                          full_name = %s,
                          email = %s,
                          role = %s,
                          is_active = %s,
                          password_hash = %s
                        WHERE user_id = %s
                        RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email, permissions_json
                        """,
                        (
                            uname,
                            body.full_name.strip(),
                            email_val,
                            _role_label(requested_role_key),
                            body.is_active,
                            pwd_hash,
                            user_id,
                        ),
                    )
            else:
                if perms_json is not None:
                    cur.execute(
                        """
                        UPDATE users SET
                          username = %s,
                          full_name = %s,
                          email = %s,
                          role = %s,
                          is_active = %s,
                          permissions_json = %s::jsonb
                        WHERE user_id = %s
                        RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email, permissions_json
                        """,
                        (
                            uname,
                            body.full_name.strip(),
                            email_val,
                            _role_label(requested_role_key),
                            body.is_active,
                            perms_json,
                            user_id,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE users SET
                          username = %s,
                          full_name = %s,
                          email = %s,
                          role = %s,
                          is_active = %s
                        WHERE user_id = %s
                        RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email, permissions_json
                        """,
                        (
                            uname,
                            body.full_name.strip(),
                            email_val,
                            _role_label(requested_role_key),
                            body.is_active,
                            user_id,
                        ),
                    )
            row = cur.fetchone()

            # --- Audit log ---
            changes = []
            if body.full_name.strip() != existing.get("full_name"):
                 changes.append(f"Full Name: {existing.get('full_name')} -> {body.full_name.strip()}")
            if email_val != existing.get("email"):
                 changes.append(f"Email: {existing.get('email')} -> {email_val}")
            if _role_label(requested_role_key) != existing.get("role"):
                 changes.append(f"Role: {existing.get('role')} -> {_role_label(requested_role_key)}")
            if body.is_active != existing.get("is_active"):
                 changes.append(f"Active: {existing.get('is_active')} -> {body.is_active}")
            if new_pw:
                 changes.append("Password updated")
            if perms_json is not None:
                 changes.append("Permissions updated")

            change_str = ", ".join(changes) if changes else "No account fields changed"

            add_audit_log(
                cur,
                actor_user_id,
                "UPDATE_USER",
                "user",
                user_id,
                f"Updated user account: {uname}. Changes: {change_str}"
            )

            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    ll = row["last_login"]
    return UserResponse(
        id=row["user_id"],
        username=row["username"] or "",
        full_name=row["full_name"],
        employee_id=row["employee_id"],
        role=row["role"],
        is_active=row["is_active"],
        last_login=ll.isoformat() if ll else None,
        email=row.get("email"),
        permissions_json=row.get("permissions_json"),
    )


@router.delete("/users/{user_id}")
def deactivate_user(
    user_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
    x_root_admin_key: str | None = Header(default=None, alias="X-Root-Admin-Key"),
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            cur.execute(
                "SELECT user_id, username, role FROM users WHERE user_id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            
            if actor_user_id == user_id:
                raise HTTPException(status_code=403, detail="You cannot deactivate your own account")

            if _is_root_admin_username(row.get("username")):
                _require_root_admin_key(x_root_admin_key)
                if not actor.get("is_root_admin"):
                    raise HTTPException(status_code=403, detail="Only Root Admin can manage Root Admin account")

            if not actor.get("is_root_admin"):
                if not _actor_has_permission(actor, "User Management", "Delete"):
                    raise HTTPException(status_code=403, detail="Missing Delete User permission")
                if not _can_actor_manage_target_user(actor, row):
                    raise HTTPException(
                        status_code=403,
                        detail="You cannot deactivate this user account due to role hierarchy.",
                    )
            cur.execute(
                "UPDATE users SET is_active = false, status = 'Archived' WHERE user_id = %s RETURNING user_id, username, full_name",
                (user_id,),
            )
            deleted_row = cur.fetchone()
            if not deleted_row:
                raise HTTPException(status_code=404, detail="User not found")
            
            # --- Audit log ---
            add_audit_log(
                cur,
                actor_user_id,
                "DELETE_USER",
                "user",
                user_id,
                f"Archived user account: {deleted_row.get('username', '')} (ID: {user_id})"
            )
            
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {"ok": True}


# ─────────────────────────────────────────────
# Archive endpoints (Two-Stage Lifecycle)
# ─────────────────────────────────────────────

def _get_retention_days(cur) -> int:
    cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'deleted_folder_retention_days'")
    row = cur.fetchone()
    if row and row.get("setting_value"):
        try:
            return int(row["setting_value"])
        except (ValueError, TypeError):
            return 30
    return 30


@router.get("/archive/users")
def get_archived_users(
    stage: str = Query("Archived"),
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
):
    """Return users based on archive stage (Archived or Deleted)."""
    if stage not in ["Archived", "Deleted"]:
        raise HTTPException(status_code=400, detail="Invalid stage. Must be 'Archived' or 'Deleted'.")
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            if not (actor.get("is_root_admin") or actor["role_key"] in (ROLE_SYSTEM_ADMIN, ROLE_SUPER_ADMIN, ROLE_ADMINISTRATOR)):
                raise HTTPException(status_code=403, detail="Not allowed to view archive")
            
            days = _get_retention_days(cur)

            cur.execute(
                """
                SELECT 
                    user_id, username, full_name, employee_id, role, is_active, status, last_login, email, permissions_json,
                    COALESCE(deleted_at, created_date) AS deleted_at,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((COALESCE(deleted_at, created_date, NOW()) + (%s || ' days')::INTERVAL) - NOW())) / 86400))
                        ELSE NULL 
                    END AS days_remaining,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            TO_CHAR(COALESCE(deleted_at, created_date, NOW()) + (%s || ' days')::INTERVAL, 'YYYY-MM-DD')
                        ELSE NULL 
                    END AS scheduled_delete_date
                FROM users
                WHERE (
                    (%s = 'Archived' AND is_active = false AND (status = 'Archived' OR status IS NULL OR status = 'Active'))
                    OR (%s = 'Deleted' AND status = 'Deleted')
                )
                  AND (username IS NULL OR LOWER(TRIM(username)) <> %s)
                ORDER BY user_id
                """,
                (stage, days, days, stage, days, days, stage, stage, _root_admin_username()),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    out = []
    for r in rows:
        ll = r["last_login"]
        out.append({
            "id": r["user_id"],
            "username": r["username"] or "",
            "full_name": r["full_name"],
            "employee_id": r["employee_id"],
            "role": r["role"],
            "is_active": r["is_active"],
            "status": r.get("status") or ("Archived" if not r["is_active"] else "Active"),
            "last_login": ll.isoformat() if ll else None,
            "email": r.get("email"),
            "days_remaining": r.get("days_remaining"),
            "scheduled_delete_date": r.get("scheduled_delete_date"),
        })
    return out


@router.put("/archive/users/{user_id}/move-to-trash")
@router.put("/users/{user_id}/move-to-trash")
def move_user_to_trash(
    user_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
):
    """Move an archived user to the Deleted Folder based on role hierarchy."""
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)

            cur.execute(
                "SELECT user_id, username, role, is_active, status FROM users WHERE user_id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            if _is_root_admin_username(row.get("username")):
                raise HTTPException(status_code=403, detail="The root admin account cannot be moved to Deleted Folder")
            if actor_user_id == user_id:
                raise HTTPException(status_code=403, detail="You cannot move your own account to Deleted Folder")

            target_role_key = _normalize_role(row.get("role"))

            # Role hierarchy check
            if not actor.get("is_root_admin"):
                if not _actor_has_permission(actor, "User Management", "Delete"):
                    raise HTTPException(status_code=403, detail="Missing Delete User permission")
                if not _can_actor_manage_target_user(actor, row):
                    raise HTTPException(status_code=403, detail="You cannot move this user to Deleted Folder due to role hierarchy.")

            cur.execute(
                "UPDATE users SET is_active = false, status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE user_id = %s RETURNING user_id, username",
                (user_id,),
            )
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="User not found")

            add_audit_log(
                cur,
                actor_user_id,
                "TRASH_USER",
                "user",
                user_id,
                f"Moved user account '{row.get('username', '')}' (ID: {user_id}) to Deleted Folder."
            )
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {"ok": True}


@router.put("/archive/users/{user_id}/restore")
def restore_user(
    user_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
):
    """Restore an archived or deleted user by setting is_active = true, status = 'Active', deleted_at = NULL."""
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            cur.execute(
                "SELECT user_id, username, role, is_active, status FROM users WHERE user_id = %s",
                (user_id,),
            )
            target = cur.fetchone()
            if not target:
                raise HTTPException(status_code=404, detail="User not found")
            if target["is_active"] and target.get("status") == "Active":
                raise HTTPException(status_code=400, detail="User is already active")
                
            if not actor.get("is_root_admin"):
                if not _actor_has_permission(actor, "User Management", "Edit"):
                    raise HTTPException(status_code=403, detail="Missing Edit User permission")
                if not _can_actor_manage_target_user(actor, target):
                    raise HTTPException(status_code=403, detail="You cannot restore this user due to role hierarchy.")

            cur.execute(
                "UPDATE users SET is_active = true, status = 'Active', deleted_at = NULL WHERE user_id = %s RETURNING user_id, username",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Archived user not found")
            add_audit_log(
                cur,
                actor_user_id,
                "RESTORE_USER",
                "user",
                user_id,
                f"Restored (activated) user: {row.get('username', '')} (ID: {user_id})"
            )
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {"ok": True}


@router.delete("/archive/users/{user_id}/permanent")
def permanent_delete_user(
    user_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
):
    """Permanently delete a user from the database based on role hierarchy. User must already be archived (is_active=false)."""
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)

            cur.execute(
                "SELECT user_id, username, role, is_active FROM users WHERE user_id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            if row["is_active"]:
                raise HTTPException(status_code=400, detail="User must be archived before permanent deletion")
            
            # Root admin check (hard ghost check)
            if _is_root_admin_username(row.get("username")):
                raise HTTPException(status_code=403, detail="The root admin account cannot be permanently deleted")
            
            # Prevent self-deletion
            if actor_user_id == user_id:
                raise HTTPException(status_code=403, detail="You cannot permanently delete your own account")

            # Role hierarchy check for permanent deletion
            if not actor.get("is_root_admin"):
                if not _actor_has_permission(actor, "User Management", "Delete"):
                    raise HTTPException(status_code=403, detail="Missing Delete User permission")
                if not _can_actor_manage_target_user(actor, row):
                    raise HTTPException(status_code=403, detail="You cannot permanently delete this user due to role hierarchy.")

            # Nullify references before deleting to avoid ForeignKeyViolation and preserve all history
            cur.execute("UPDATE auditlog SET user_id = NULL WHERE user_id = %s", (user_id,))
            cur.execute("UPDATE sales SET user_id = NULL WHERE user_id = %s", (user_id,))
            cur.execute("UPDATE purchase_orders SET user_id = NULL WHERE user_id = %s", (user_id,))
            cur.execute("UPDATE purchase_orders SET voided_by_user_id = NULL WHERE voided_by_user_id = %s", (user_id,))
            cur.execute("UPDATE pos_shifts SET user_id = NULL WHERE user_id = %s", (user_id,))
            cur.execute("UPDATE mechanic_payouts SET processed_by = NULL WHERE processed_by = %s", (user_id,))
            cur.execute("UPDATE sales_import_logs SET imported_by = NULL WHERE imported_by = %s", (user_id,))
            cur.execute("DELETE FROM roles WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM user_settings WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM notifications WHERE user_id = %s", (user_id,))
            
            cur.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
            
            # --- Audit log ---
            add_audit_log(
                cur,
                actor_user_id,
                "PERMANENT_DELETE",
                "user",
                user_id,
                f"Permanently deleted user: {row.get('username', '')} (ID: {user_id})"
            )
            
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {"ok": True}


@router.get("/audit-logs", response_model=list[AuditLogEntryResponse])
def get_audit_logs(
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            is_root = actor.get("is_root_admin")

            # Build WHERE clause
            where_clauses = []
            params = []

            # Privacy filters for non-root
            if not is_root:
                where_clauses.append("(u.username IS NULL OR (LOWER(TRIM(u.username)) <> %s AND LOWER(TRIM(u.username)) <> 'rootadmin'))")
                params.append(_root_admin_username())
                where_clauses.append("(u.role IS NULL OR LOWER(TRIM(u.role)) <> 'root admin')")

            # Entity Type filter
            if entity_type and entity_type.lower() != "all":
                # Map frontend labels to DB values
                mapping = {
                    "sale": "sales",
                    "return": ["return", "customer_returns"]
                }
                key = entity_type.lower()
                if key in mapping:
                    mapped = mapping[key]
                    if isinstance(mapped, list):
                        placeholders = ",".join(["%s"] * len(mapped))
                        where_clauses.append(f"a.entity_type IN ({placeholders})")
                        params.extend(mapped)
                    else:
                        where_clauses.append("a.entity_type = %s")
                        params.append(mapped)
                else:
                    where_clauses.append("LOWER(a.entity_type) = %s")
                    params.append(key)

            # User filter
            if user_id:
                where_clauses.append("a.user_id = %s")
                params.append(user_id)

            where_sql = ""
            if where_clauses:
                where_sql = "WHERE " + " AND ".join(where_clauses)

            query = f"""
                SELECT 
                    a.log_id, 
                    a.user_id, 
                    COALESCE(u.username, SUBSTRING(a.details FROM 'User\\s+([^\\s(:]+)'), 'Deleted User') as username, 
                    COALESCE(u.role, SUBSTRING(a.details FROM 'User\\s+[^\\s(:]+\\s*\\(([^)]+)\\)'), 'Staff') as role,
                    a.action, 
                    a.entity_type, 
                    a.entity_id, 
                    REPLACE((a.timestamp AT TIME ZONE current_setting('timezone') AT TIME ZONE 'UTC')::text, ' ', 'T') || 'Z' as timestamp, 
                    a.details
                FROM auditlog a
                LEFT JOIN users u ON a.user_id = u.user_id
                {where_sql}
                ORDER BY a.timestamp DESC
                LIMIT 400
            """
            
            cur.execute(query, tuple(params))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.patch("/audit-logs/{log_id}")
def edit_audit_log(
    log_id: int,
    payload: UpdateAuditLogRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            
            if not (actor.get("is_root_admin") or actor["role_key"] in (ROLE_SYSTEM_ADMIN, ROLE_SUPER_ADMIN, ROLE_ADMINISTRATOR)):
                raise HTTPException(status_code=403, detail="Only Administrators and Super Admins can edit audit logs")
            
            # Build dynamic UPDATE query
            updates = []
            params = []
            
            if payload.action is not None:
                updates.append("action = %s")
                params.append(payload.action)
            if payload.entity_type is not None:
                updates.append("entity_type = %s")
                params.append(payload.entity_type)
            if payload.entity_id is not None:
                updates.append("entity_id = %s")
                params.append(payload.entity_id)
            if payload.timestamp is not None:
                updates.append("timestamp = %s")
                params.append(payload.timestamp)
            if payload.details is not None:
                updates.append("details = %s")
                params.append(payload.details)
                
            if not updates:
                return {"ok": True, "message": "No changes provided"}
                
            params.append(log_id)
            query = f"UPDATE auditlog SET {', '.join(updates)} WHERE log_id = %s"
            cur.execute(query, tuple(params))
            
            return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/audit-logs")
def delete_audit_logs(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            
            if not (actor.get("is_root_admin") or actor["role_key"] in (ROLE_SYSTEM_ADMIN, ROLE_SUPER_ADMIN, ROLE_ADMINISTRATOR)):
                raise HTTPException(status_code=403, detail="Only Administrators and Super Admins can clear audit logs")
            
            # Clear all logs for unified maintenance
            cur.execute("DELETE FROM auditlog")
            
            add_audit_log(cur, actor_user_id, "CLEAR_LOGS", "system", None, "Cleared system audit logs")
            
            conn.commit()
            return {"ok": True}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/roles", response_model=list[RoleResponse])
def list_roles(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            is_root = actor.get("is_root_admin")

            where_clauses = ["r.user_id IS NULL"]
            params = [_root_admin_username()]

            if not is_root:
                where_clauses.append("LOWER(r.role_name) <> 'super admin'")

            query = f"""
                SELECT r.role_id, r.role_name,
                       COALESCE(r.permissions_text, '') AS permissions_text,
                       (
                         SELECT COUNT(*)::int FROM users u
                         WHERE u.role = r.role_name
                           AND (u.username IS NULL OR LOWER(TRIM(u.username)) <> %s)
                       ) AS user_count
                FROM roles r
                WHERE {" AND ".join(where_clauses)}
                ORDER BY r.role_name
            """
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
    finally:
        conn.close()

    out: list[RoleResponse] = []
    for r in rows:
        perms = {}
        pt = (r["permissions_text"] or "").strip()
        if pt:
            try:
                parsed = json.loads(pt)
                if isinstance(parsed, dict):
                    perms = parsed
            except:
                # If it's malformed (like a plain text description), fallback to empty dict
                pass
        
        out.append(
            RoleResponse(
                id=r["role_id"],
                name=r["role_name"],
                permissions=perms,
                user_count=r["user_count"],
            )
        )
    return out


@router.post("/roles", response_model=RoleResponse)
def create_role(
    body: CreateRoleRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")
    if len(name) > 50:
        raise HTTPException(status_code=400, detail="Role name must be 50 characters or less")

    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor = _require_role_management_access(cur, x_actor_user_id, "Add")
            if not actor.get("is_root_admin"):
                if not _can_actor_assign_role(actor, name):
                    raise HTTPException(
                        status_code=403,
                        detail=f"You cannot create a role with name '{name}' at or above your own hierarchy level.",
                    )
            cur.execute(
                """
                SELECT 1 FROM roles
                WHERE user_id IS NULL AND LOWER(role_name) = LOWER(%s)
                """,
                (name,),
            )
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="A role with this name already exists")

            cur.execute("SELECT COALESCE(MAX(role_id), 0) AS n FROM roles")
            next_rid = cur.fetchone()["n"] + 1
            perms_json = json.dumps(_sanitize_permissions_for_storage(body.permissions)) if body.permissions else "{}"
            cur.execute(
                """
                INSERT INTO roles (role_id, role_name, user_id, permissions_text)
                VALUES (%s, %s, NULL, %s)
                RETURNING role_id, role_name, permissions_text
                """,
                (next_rid, name, perms_json),
            )
            row = cur.fetchone()
            
            # --- Audit log ---
            add_audit_log(
                cur,
                _parse_actor_user_id_or_401(x_actor_user_id),
                "CREATE_ROLE",
                "role",
                row["role_id"],
                f"Created role: {name} (ID: {row['role_id']})"
            )
            
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return RoleResponse(
        id=row["role_id"],
        name=row["role_name"],
        permissions=json.loads(row["permissions_text"]) if row["permissions_text"] else {},
        user_count=0,
    )


@router.patch("/roles/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    body: UpdateRoleRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
):
    new_name = body.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Role name is required")
    if len(new_name) > 50:
        raise HTTPException(
            status_code=400, detail="Role name must be 50 characters or less"
        )

    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor = _require_role_management_access(cur, x_actor_user_id, "Edit")
            cur.execute(
                """
                SELECT role_id, role_name FROM roles
                WHERE role_id = %s AND user_id IS NULL
                """,
                (role_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Role not found")

            target_role_key = _normalize_role(row["role_name"])
            target_level = _get_role_level(target_role_key)
            actor_role = actor.get("role_key") or ""
            actor_level = 100 if actor.get("is_root_admin") else _get_role_level(actor_role)

            if not actor.get("is_root_admin"):
                if actor_level <= target_level:
                    raise HTTPException(
                        status_code=403,
                        detail="You cannot modify this role because it is at or above your own hierarchy level.",
                    )
                if not _can_actor_assign_role(actor, new_name):
                    raise HTTPException(
                        status_code=403,
                        detail=f"You cannot rename to '{new_name}' because that role level is at or above your own rank.",
                    )

            old_name = row["role_name"]

            if new_name != old_name:
                cur.execute(
                    """
                    SELECT 1 FROM roles
                    WHERE user_id IS NULL
                      AND role_id <> %s
                      AND LOWER(TRIM(role_name)) = LOWER(TRIM(%s))
                    """,
                    (role_id, new_name),
                )
                if cur.fetchone():
                    raise HTTPException(
                        status_code=409, detail="A role with this name already exists"
                    )
                cur.execute(
                    "UPDATE users SET role = %s WHERE role = %s",
                    (new_name, old_name),
                )

            perms_json = json.dumps(_sanitize_permissions_for_storage(body.permissions)) if body.permissions else "{}"
            cur.execute(
                """
                UPDATE roles
                SET role_name = %s, permissions_text = %s
                WHERE role_id = %s AND user_id IS NULL
                RETURNING role_id, role_name, permissions_text
                """,
                (new_name, perms_json, role_id),
            )
            row = cur.fetchone()
            cur.execute(
                "SELECT COUNT(*)::int AS c FROM users WHERE role = %s",
                (new_name,),
            )
            user_count = cur.fetchone()["c"]
            
            # --- Audit log ---
            add_audit_log(
                cur,
                _parse_actor_user_id_or_401(x_actor_user_id),
                "UPDATE_ROLE",
                "role",
                role_id,
                f"Updated role: {new_name} (ID: {role_id})"
            )
            
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return RoleResponse(
        id=row["role_id"],
        name=row["role_name"],
        permissions=json.loads(row["permissions_text"]) if row["permissions_text"] else {},
        user_count=user_count,
    )


@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id"),
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            actor = _require_role_management_access(cur, x_actor_user_id, "Delete")
            cur.execute(
                """
                SELECT role_id, role_name
                FROM roles
                WHERE role_id = %s AND user_id IS NULL
                """,
                (role_id,),
            )
            role_row = cur.fetchone()
            if not role_row:
                raise HTTPException(status_code=404, detail="Role not found")

            root_uname = os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo").strip().lower()
            actor_is_root = (actor.get("username") or "").strip().lower() in (root_uname, "rootadmin") or bool(actor.get("is_root_admin"))

            # Prevent deleting the actor's own active role
            actor_role = str(actor.get("role") or "").strip().lower()
            if actor_role and actor_role == str(role_row["role_name"]).strip().lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"You cannot delete role '{role_row['role_name']}' because it is your currently active role."
                )

            cur.execute(
                """
                SELECT COUNT(*)::int AS c
                FROM users
                WHERE LOWER(role) = LOWER(%s)
                """,
                (role_row["role_name"],),
            )
            assigned_count = cur.fetchone()["c"]
            if assigned_count > 0:
                raise HTTPException(
                    status_code=409,
                    detail=f"Cannot delete role '{role_row['role_name']}' because {assigned_count} user(s) are currently assigned to it. Please reassign the user(s) first.",
                )

            cur.execute(
                """
                DELETE FROM roles
                WHERE role_id = %s AND user_id IS NULL
                RETURNING role_id
                """,
                (role_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Role not found")
            
            # --- Audit log ---
            add_audit_log(
                cur,
                _parse_actor_user_id_or_401(x_actor_user_id),
                "DELETE_ROLE",
                "role",
                role_id,
                f"Deleted role: {role_row['role_name']} (ID: {role_id})"
            )
            
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {"ok": True}


@router.post("/root-admin/reset")
def reset_root_admin(
    body: RootAdminResetRequest,
    x_root_admin_key: str | None = Header(default=None, alias="X-Root-Admin-Key"),
):
    _require_root_admin_key(x_root_admin_key)

    new_pw = (body.new_password or "").strip()
    if len(new_pw) < 12:
        raise HTTPException(status_code=400, detail="Password must be at least 12 characters")

    new_uname = (body.new_username or "").strip()
    if new_uname and len(new_uname) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")

    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id, username
                FROM users
                WHERE username IS NOT NULL AND LOWER(TRIM(username)) = %s
                """,
                (_root_admin_username(),),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Root admin account not found")

            pwd_hash = _hash_password(new_pw)

            if new_uname:
                cur.execute(
                    """
                    SELECT 1 FROM users
                    WHERE user_id <> %s
                      AND username IS NOT NULL AND TRIM(username) <> ''
                      AND LOWER(TRIM(username)) = LOWER(TRIM(%s))
                    """,
                    (row["user_id"], new_uname),
                )
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="Username already taken")

                cur.execute(
                    """
                    UPDATE users
                    SET username = %s,
                        password_hash = %s
                    WHERE user_id = %s
                    RETURNING user_id, username
                    """,
                    (new_uname, pwd_hash, row["user_id"]),
                )
            else:
                cur.execute(
                    """
                    UPDATE users
                    SET password_hash = %s
                    WHERE user_id = %s
                    RETURNING user_id, username
                    """,
                    (pwd_hash, row["user_id"]),
                )

            out = cur.fetchone()

            # --- Audit log ---
            add_audit_log(
                cur,
                out["user_id"],
                "ROOT_ADMIN_RESET",
                "user",
                out["user_id"],
                f"Root admin credentials reset. New username: {out['username']}"
            )

            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {"ok": True, "user_id": out["user_id"], "username": out["username"]}

