import re
from fastapi import APIRouter, HTTPException
from database import get_connection
from models import LoginRequest, LoginResponse
import psycopg2.extras
import bcrypt

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
                SELECT user_id, username, full_name, employee_id, role, is_active, password_hash, email
                FROM users
                WHERE username IS NOT NULL AND TRIM(username) <> ''
                  AND LOWER(username) = LOWER(%s)
                """,
                (ident,),
            )
            row = cur.fetchone()

            if not row:
                eid = _parse_employee_id(ident)
                if eid is not None:
                    cur.execute(
                        """
                        SELECT user_id, username, full_name, employee_id, role, is_active, password_hash, email
                        FROM users
                        WHERE employee_id = %s
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
            cur.execute(
                """
                INSERT INTO auditlog (user_id, action, entity_type, entity_id, timestamp, details)
                VALUES (%s, %s, %s, %s, NOW(), %s)
                """,
                (
                    row["user_id"],
                    "LOGIN",
                    "user",
                    row["user_id"],
                    f"User signed in: {row.get('username') or row['user_id']}",
                ),
            )
            conn.commit()

            return LoginResponse(
                user_id=row["user_id"],
                username=row["username"] or "",
                full_name=row["full_name"],
                employee_id=row["employee_id"],
                role=row["role"],
                email=row.get("email"),
            )
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
