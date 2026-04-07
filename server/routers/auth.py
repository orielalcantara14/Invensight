import re
from fastapi import APIRouter, Header, HTTPException
from database import get_connection
from models import LoginRequest, LoginResponse
import psycopg2.extras
import bcrypt
import json
from utils.audit import add_audit_log

router = APIRouter()


def _parse_employee_id(ident: str) -> int | None:
    s = ident.strip()
    if not s:
        return None
    m = re.match(r"^EMP-?(\d+)$", s, re.IGNORECASE)
    if m:
        return int(m.group(1))
    if s.isdigit():
        return int(s)
    return None


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    ident = body.username.strip()
    if not ident or not body.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            row = None
            cur.execute(
                """
                SELECT 
                    u.user_id, u.username, u.full_name, u.employee_id, u.role, 
                    u.is_active, u.password_hash, u.email,
                    u.permissions_json,
                    r.permissions_text
                FROM users u
                LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.role_name) AND r.user_id IS NULL
                WHERE u.username IS NOT NULL AND TRIM(u.username) <> ''
                  AND LOWER(u.username) = LOWER(%s)
                """,
                (ident,),
            )
            row = cur.fetchone()

            if not row:
                eid = _parse_employee_id(ident)
                if eid is not None:
                    cur.execute(
                        """
                        SELECT 
                            u.user_id, u.username, u.full_name, u.employee_id, u.role, 
                            u.is_active, u.password_hash, u.email,
                            u.permissions_json,
                            r.permissions_text
                        FROM users u
                        LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.role_name) AND r.user_id IS NULL
                        WHERE u.employee_id = %s
                        """,
                        (eid,),
                    )
                    row = cur.fetchone()

            if not row:
                raise HTTPException(status_code=401, detail="Invalid username or password")

            if not row["is_active"]:
                raise HTTPException(status_code=403, detail="This account is inactive")

            stored = row["password_hash"]
            if not stored:
                raise HTTPException(status_code=401, detail="Invalid username or password")

            ok = bcrypt.checkpw(
                body.password.encode("utf-8"),
                stored.encode("utf-8") if isinstance(stored, str) else stored,
            )
            if not ok:
                raise HTTPException(status_code=401, detail="Invalid username or password")

            cur.execute(
                "UPDATE users SET last_login = CURRENT_DATE WHERE user_id = %s",
                (row["user_id"],),
            )
            # --- Audit log ---
            add_audit_log(
                cur, 
                row["user_id"], 
                "LOGIN", 
                "user", 
                row["user_id"], 
                f"User signed in: {row.get('username') or row['user_id']}"
            )
            conn.commit()

            perms = None
            if row.get("permissions_json") and isinstance(row["permissions_json"], dict) and len(row["permissions_json"]) > 0:
                perms = row["permissions_json"]
            elif row.get("permissions_text"):
                try:
                    perms = json.loads(row["permissions_text"])
                except:
                    perms = {}

            return LoginResponse(
                user_id=row["user_id"],
                username=row["username"] or "",
                full_name=row["full_name"],
                employee_id=row["employee_id"],
                role=row["role"],
                email=row.get("email"),
                permissions=perms,
            )
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@router.get("/auth/verify")
def verify_session(x_user_id: str | None = Header(default=None, alias="X-User-Id")):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="No user ID provided")
    
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id, username, full_name, role, is_active FROM users WHERE user_id = %s",
                (int(x_user_id),),
            )
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=401, detail="User no longer exists")
            if not user["is_active"]:
                raise HTTPException(status_code=401, detail="User is inactive")
            return {"ok": True, "user": user}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    finally:
        conn.close()


@router.post("/logout")
def logout(x_user_id: str | None = Header(default=None, alias="X-User-Id")):
    if not x_user_id:
        return {"ok": True}
        
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            uid = int(x_user_id)
            add_audit_log(
                cur,
                uid,
                "LOGOUT",
                "user",
                uid,
                "User signed out"
            )
            conn.commit()
    except:
        pass
    finally:
        conn.close()
    return {"ok": True}
