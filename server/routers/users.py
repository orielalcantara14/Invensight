from fastapi import APIRouter, HTTPException
from database import get_connection
from models import (
    CreateUserRequest,
    CreateRoleRequest,
    UpdateRoleRequest,
    UpdateUserRequest,
    UserResponse,
    RoleResponse,
)
import psycopg2.extras
import bcrypt
import json
from datetime import date

router = APIRouter()


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
                ORDER BY user_id
                """
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
def update_user(user_id: int, body: UpdateUserRequest):
    uname = body.username.strip()
    if not uname:
        raise HTTPException(status_code=400, detail="Username is required")

    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")

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
def deactivate_user(user_id: int):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
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
                       ) AS user_count
                FROM roles r
                WHERE r.user_id IS NULL
                ORDER BY r.role_name
                """
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
