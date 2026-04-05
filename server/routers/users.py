import os
import secrets
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
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
)
import psycopg2.extras
import bcrypt
import json
from datetime import date
from pydantic import BaseModel

router = APIRouter()

ROOT_ADMIN_USERNAME_ENV = "ROOT_ADMIN_USERNAME"
ROOT_ADMIN_KEY_ENV = "ROOT_ADMIN_KEY"
ROLE_ADMINISTRATOR = "administrator"
ROLE_MANAGER = "manager"
ROLE_SALES_STAFF = "sales staff"
MANAGEABLE_BY_ADMIN = {ROLE_MANAGER, ROLE_SALES_STAFF}
ASSIGNABLE_BY_ROOT = {ROLE_ADMINISTRATOR, ROLE_MANAGER, ROLE_SALES_STAFF}
ASSIGNABLE_BY_ADMIN = {ROLE_MANAGER, ROLE_SALES_STAFF}
RESTRICTED_MODULES_FOR_NON_ADMIN_ROLES = {"user management", "role permissions"}
ROLE_LABELS = {
    ROLE_ADMINISTRATOR: "Administrator",
    ROLE_MANAGER: "Manager",
    ROLE_SALES_STAFF: "Sales Staff",
}


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
    role_key = _normalize_role(role)
    if role_key not in ASSIGNABLE_BY_ROOT:
        raise HTTPException(
            status_code=400,
            detail="Role must be one of: Administrator, Manager, Sales Staff",
        )
    return role_key


def _role_label(role_key: str) -> str:
    return ROLE_LABELS[role_key]


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
        SELECT user_id, username, role, is_active, permissions_json
        FROM users
        WHERE user_id = %s
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
    actor["permissions_norm"] = _normalize_permissions(actor.get("permissions_json"))
    return actor


def _actor_has_permission(actor: dict, module: str, action: str) -> bool:
    if actor.get("is_root_admin"):
        return True
    module_key = module.strip().lower()
    action_key = action.strip().lower()
    return action_key in actor.get("permissions_norm", {}).get(module_key, set())


def _enforce_non_admin_target_module_restrictions(
    target_role_key: str,
    assigned_permissions_norm: dict[str, set[str]],
) -> None:
    if target_role_key not in MANAGEABLE_BY_ADMIN:
        return
    forbidden = [
        m for m in assigned_permissions_norm.keys() if m in RESTRICTED_MODULES_FOR_NON_ADMIN_ROLES
    ]
    if forbidden:
        raise HTTPException(
            status_code=400,
            detail="Manager and Sales Staff cannot be assigned user-management permissions",
        )


def _require_role_management_access(cur, x_actor_user_id: str | None, action: str) -> dict:
    actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
    actor = _get_actor_or_403(cur, actor_user_id)
    if actor["is_root_admin"]:
        return actor
    if actor["role_key"] != ROLE_ADMINISTRATOR:
        raise HTTPException(status_code=403, detail="Only Root Admin and Administrators can manage roles")
    if not _actor_has_permission(actor, "Role Permissions", action):
        raise HTTPException(status_code=403, detail=f"Missing {action} permission for Role Permissions module")
    return actor


@router.get("/users", response_model=list[UserResponse])
def list_users():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id, username, full_name, employee_id, role, is_active, last_login, email
                FROM users
                WHERE (username IS NULL OR LOWER(TRIM(username)) <> %s)
                ORDER BY user_id
                """
                ,
                (_root_admin_username(),),
            )
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

            if actor["is_root_admin"]:
                allowed_target_roles = ASSIGNABLE_BY_ROOT
            elif actor["role_key"] == ROLE_ADMINISTRATOR:
                if not _actor_has_permission(actor, "User Management", "Add User"):
                    raise HTTPException(status_code=403, detail="Missing Add User permission")
                if not _is_subset_permissions(
                    requested_permissions_norm,
                    actor["permissions_norm"],
                ):
                    raise HTTPException(
                        status_code=403,
                        detail="Cannot assign permissions outside your own access",
                    )
                allowed_target_roles = ASSIGNABLE_BY_ADMIN
            else:
                raise HTTPException(
                    status_code=403,
                    detail="Only Root Admin and Administrators can create accounts",
                )

            if target_role_key not in allowed_target_roles:
                raise HTTPException(
                    status_code=403,
                    detail="You are not allowed to create this role type",
                )
            _enforce_non_admin_target_module_restrictions(
                target_role_key,
                requested_permissions_norm,
            )
            cur.execute(
                """
                SELECT 1 FROM roles
                WHERE user_id IS NULL AND LOWER(role_name) = LOWER(%s)
                """,
                (_role_label(target_role_key),),
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="Role does not exist. Add it under Roles or pick an existing role.",
                )

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
            pwd_hash = _hash_password(body.password)
            email_val = (body.email or "").strip() or None

            cur.execute(
                """
                INSERT INTO users (
                    user_id, employee_id, password_hash, full_name, role,
                    is_active, created_date, last_login, username, permissions_json, email
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, NULL, %s, %s::jsonb, %s)
                RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email
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
            
            # --- Audit log (skip if actor is root admin) ---
            if not actor.get("is_root_admin"):
                cur.execute(
                    """
                    INSERT INTO auditlog (user_id, action, entity_type, entity_id, timestamp, details)
                    VALUES (%s, %s, %s, %s, NOW(), %s)
                    """,
                    (
                        actor_user_id,
                        "ADD_USER",
                        "user",
                        row["user_id"],
                        f"Created user account: {body.username.strip()} (ID: {row['user_id']})",
                    ),
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
                "SELECT user_id, username, role FROM users WHERE user_id = %s", (user_id,)
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="User not found")
            existing_role_key = _normalize_role(existing.get("role"))
            if _is_root_admin_username(existing.get("username")):
                _require_root_admin_key(x_root_admin_key)
                if not actor.get("is_root_admin"):
                    raise HTTPException(status_code=403, detail="Only Root Admin can manage Root Admin account")

            if actor["is_root_admin"]:
                pass
            elif actor["role_key"] == ROLE_ADMINISTRATOR:
                if not _actor_has_permission(actor, "User Management", "Edit User"):
                    raise HTTPException(status_code=403, detail="Missing Edit User permission")
                if existing_role_key not in MANAGEABLE_BY_ADMIN:
                    raise HTTPException(
                        status_code=403,
                        detail="Administrators can only manage Manager and Sales Staff accounts",
                    )
                if requested_role_key not in ASSIGNABLE_BY_ADMIN:
                    raise HTTPException(
                        status_code=403,
                        detail="Administrators cannot assign this role type",
                    )
            else:
                raise HTTPException(status_code=403, detail="Not allowed to manage users")

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

            cur.execute(
                "SELECT 1 FROM roles WHERE user_id IS NULL AND LOWER(role_name) = LOWER(%s)",
                (_role_label(requested_role_key),),
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="Role does not exist. Pick an existing role.",
                )

            email_val = (body.email or "").strip() or None
            new_pw = (body.new_password or "").strip()
            
            perms_json = None
            if body.permissions is not None:
                perms_json = json.dumps(_sanitize_permissions_for_storage(body.permissions))

            if new_pw:
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
                        RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email
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
                        RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email
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
                        RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email
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
                        RETURNING user_id, username, full_name, employee_id, role, is_active, last_login, email
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
            if _is_root_admin_username(row.get("username")):
                _require_root_admin_key(x_root_admin_key)
                if not actor.get("is_root_admin"):
                    raise HTTPException(status_code=403, detail="Only Root Admin can manage Root Admin account")
            elif actor["is_root_admin"]:
                pass
            elif actor["role_key"] == ROLE_ADMINISTRATOR:
                if not _actor_has_permission(actor, "User Management", "Delete User"):
                    raise HTTPException(status_code=403, detail="Missing Delete User permission")
                target_role_key = _normalize_role(row.get("role"))
                if target_role_key not in MANAGEABLE_BY_ADMIN:
                    raise HTTPException(
                        status_code=403,
                        detail="Administrators can only manage Manager and Sales Staff accounts",
                    )
            else:
                raise HTTPException(status_code=403, detail="Not allowed to manage users")
            cur.execute(
                "UPDATE users SET is_active = false WHERE user_id = %s RETURNING user_id",
                (user_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")
            
            # --- Audit log (skip if actor is root admin) ---
            if not actor.get("is_root_admin"):
                cur.execute(
                    """
                    INSERT INTO auditlog (user_id, action, entity_type, entity_id, timestamp, details)
                    VALUES (%s, %s, %s, %s, NOW(), %s)
                    """,
                    (
                        actor_user_id,
                        "DEACTIVATE_USER",
                        "user",
                        user_id,
                        f"Deactivated user account ID: {user_id}",
                    ),
                )
            
            conn.commit()
    except HTTPException:
        conn.rollback()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {"ok": True}


@router.get("/audit-logs", response_model=list[AuditLogEntryResponse])
def get_audit_logs(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Check if requester is root admin
            actor_user_id = _parse_actor_user_id_or_401(x_actor_user_id)
            actor = _get_actor_or_403(cur, actor_user_id)
            is_root = actor.get("is_root_admin")

            if is_root:
                # Root sees everything
                cur.execute(
                    """
                    SELECT 
                        a.log_id, 
                        a.user_id, 
                        COALESCE(u.username, 'Deleted User') as username, 
                        a.action, 
                        a.entity_type, 
                        a.entity_id, 
                        a.timestamp::text as timestamp, 
                        a.details
                    FROM auditlog a
                    LEFT JOIN users u ON a.user_id = u.user_id
                    ORDER BY a.timestamp DESC
                    LIMIT 200
                    """
                )
            else:
                # Non-root sees everything EXCEPT root admin's activities
                cur.execute(
                    """
                    SELECT 
                        a.log_id, 
                        a.user_id, 
                        COALESCE(u.username, 'Deleted User') as username, 
                        a.action, 
                        a.entity_type, 
                        a.entity_id, 
                        a.timestamp::text as timestamp, 
                        a.details
                    FROM auditlog a
                    LEFT JOIN users u ON a.user_id = u.user_id
                    WHERE u.username IS NULL OR LOWER(TRIM(u.username)) <> %s
                    ORDER BY a.timestamp DESC
                    LIMIT 200
                    """,
                    (_root_admin_username(),)
                )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/roles", response_model=list[RoleResponse])
def list_roles():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT r.role_id, r.role_name,
                       COALESCE(r.permissions_text, '') AS permissions_text,
                       (
                         SELECT COUNT(*)::int FROM users u
                         WHERE u.role = r.role_name
                           AND (u.username IS NULL OR LOWER(TRIM(u.username)) <> %s)
                       ) AS user_count
                FROM roles r
                WHERE r.user_id IS NULL
                ORDER BY r.role_name
                """
                ,
                (_root_admin_username(),),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        RoleResponse(
            id=r["role_id"],
            name=r["role_name"],
            permissions=json.loads(r["permissions_text"]) if r["permissions_text"] else {},
            user_count=r["user_count"],
        )
        for r in rows
    ]


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
            _require_role_management_access(cur, x_actor_user_id, "Create")
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
            _require_role_management_access(cur, x_actor_user_id, "Edit")
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
            _require_role_management_access(cur, x_actor_user_id, "Delete")
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

            cur.execute(
                """
                SELECT COUNT(*)::int AS c
                FROM users
                WHERE role = %s
                """,
                (role_row["role_name"],),
            )
            assigned_count = cur.fetchone()["c"]
            if assigned_count > 0:
                raise HTTPException(
                    status_code=409,
                    detail="Cannot delete role with assigned users",
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
