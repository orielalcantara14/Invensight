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
)
import psycopg2.extras
import bcrypt
import json
from datetime import date
from pydantic import BaseModel

router = APIRouter()

ROOT_ADMIN_USERNAME_ENV = "ROOT_ADMIN_USERNAME"
ROOT_ADMIN_KEY_ENV = "ROOT_ADMIN_KEY"


def _root_admin_username() -> str:
    return os.getenv(ROOT_ADMIN_USERNAME_ENV, "rootadmin").strip().lower()


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
def user_management_stats():
    """
    Active sessions: active users whose last_login date is today (server date).
    Matches `last_login` updates on sign-in (auth router sets CURRENT_DATE).
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
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
            cur.execute("SELECT COUNT(*)::int AS c FROM auditlog")
            audit_log_count = cur.fetchone()["c"]
    finally:
        conn.close()

    return UserManagementStatsResponse(
        active_sessions=active_sessions,
        audit_log_count=audit_log_count,
    )


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


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
def create_user(body: CreateUserRequest):
    if not body.username.strip():
        raise HTTPException(status_code=400, detail="Username is required")
    if _is_root_admin_username(body.username):
        raise HTTPException(status_code=403, detail="This username is reserved")
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT 1 FROM roles
                WHERE user_id IS NULL AND role_name = %s
                """,
                (body.role,),
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

            perms_json = json.dumps(body.permissions or {})
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
                    body.role,
                    body.is_active,
                    date.today(),
                    body.username.strip(),
                    perms_json,
                    email_val,
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


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UpdateUserRequest,
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
            cur.execute(
                "SELECT user_id, username FROM users WHERE user_id = %s", (user_id,)
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="User not found")
            if _is_root_admin_username(existing.get("username")):
                _require_root_admin_key(x_root_admin_key)

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
                "SELECT 1 FROM roles WHERE user_id IS NULL AND role_name = %s",
                (body.role,),
            )
            if not cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="Role does not exist. Pick an existing role.",
                )

            email_val = (body.email or "").strip() or None
            new_pw = (body.new_password or "").strip()

            if new_pw:
                pwd_hash = _hash_password(new_pw)
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
                        body.role,
                        body.is_active,
                        pwd_hash,
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
                        body.role,
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
    x_root_admin_key: str | None = Header(default=None, alias="X-Root-Admin-Key"),
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id, username FROM users WHERE user_id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            if _is_root_admin_username(row.get("username")):
                _require_root_admin_key(x_root_admin_key)
            cur.execute(
                "UPDATE users SET is_active = false WHERE user_id = %s RETURNING user_id",
                (user_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")
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
            permissions=r["permissions_text"] or "",
            user_count=r["user_count"],
        )
        for r in rows
    ]


@router.post("/roles", response_model=RoleResponse)
def create_role(body: CreateRoleRequest):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")
    if len(name) > 50:
        raise HTTPException(status_code=400, detail="Role name must be 50 characters or less")

    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
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
            perms = (body.permissions or "").strip()
            cur.execute(
                """
                INSERT INTO roles (role_id, role_name, user_id, permissions_text)
                VALUES (%s, %s, NULL, %s)
                RETURNING role_id, role_name, permissions_text
                """,
                (next_rid, name, perms or None),
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
        permissions=row["permissions_text"] or "",
        user_count=0,
    )


@router.patch("/roles/{role_id}", response_model=RoleResponse)
def update_role(role_id: int, body: UpdateRoleRequest):
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

            perms = (body.permissions or "").strip()
            cur.execute(
                """
                UPDATE roles
                SET role_name = %s, permissions_text = %s
                WHERE role_id = %s AND user_id IS NULL
                RETURNING role_id, role_name, permissions_text
                """,
                (new_name, perms or None, role_id),
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
        permissions=row["permissions_text"] or "",
        user_count=user_count,
    )


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
