from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from database import get_connection
from models import (
    ActivityItem,
    ChangePasswordRequest,
    ProfileResponse,
    ProfileUpdateRequest,
)
import psycopg2.extras
import bcrypt
from utils.audit import add_audit_log

router = APIRouter()


def get_request_user_id(x_user_id: Optional[str] = Header(None, alias="X-User-Id")) -> int:
    if not x_user_id or not str(x_user_id).strip():
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id")


def _row_to_profile(r: dict) -> ProfileResponse:
    cd = r.get("created_date")
    ll = r.get("last_login")
    pc = r.get("password_changed_at")
    return ProfileResponse(
        user_id=r["user_id"],
        username=r["username"] or "",
        full_name=r["full_name"],
        email=r.get("email"),
        role=r["role"],
        address=r.get("address"),
        employee_id=r["employee_id"],
        created_date=cd.isoformat() if cd else None,
        last_login=ll.isoformat() if ll else None,
        password_changed_at=pc.isoformat() if pc else None,
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(user_id: int = Depends(get_request_user_id)):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id, username, full_name, email, role, address,
                       employee_id, created_date, last_login, password_changed_at, is_active
                FROM users WHERE user_id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            if not row["is_active"]:
                raise HTTPException(status_code=403, detail="Account is inactive")
            return _row_to_profile(row)
    finally:
        conn.close()


@router.patch("/profile", response_model=ProfileResponse)
def update_profile(
    body: ProfileUpdateRequest,
    user_id: int = Depends(get_request_user_id),
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id FROM users WHERE user_id = %s AND is_active = true",
                (user_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found")

            updates = []
            params = []
            if body.full_name is not None:
                updates.append("full_name = %s")
                params.append(body.full_name.strip())
            if body.email is not None:
                email = (body.email or "").strip() or None
                if email:
                    cur.execute(
                        """
                        SELECT 1 FROM users
                        WHERE user_id <> %s AND LOWER(TRIM(email)) = LOWER(TRIM(%s))
                          AND email IS NOT NULL AND TRIM(email) <> ''
                        """,
                        (user_id, email),
                    )
                    if cur.fetchone():
                        raise HTTPException(
                            status_code=409, detail="Email already in use"
                        )
                updates.append("email = %s")
                params.append(email)
            if body.address is not None:
                updates.append("address = %s")
                params.append((body.address or "").strip() or None)

            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")

            params.append(user_id)
            cur.execute(
                f"""
                UPDATE users SET {", ".join(updates)}
                WHERE user_id = %s
                RETURNING user_id, username, full_name, email, role, address,
                          employee_id, created_date, last_login, password_changed_at
                """,
                tuple(params),
            )
            row = cur.fetchone()
            
            # --- Audit log ---
            actor_id = int(x_actor_user_id) if x_actor_user_id else user_id
            add_audit_log(
                cur,
                actor_id,
                "UPDATE_PROFILE",
                "user",
                user_id,
                f"User Profile updated (Self-update: {body.full_name or 'No name change'})"
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

    return _row_to_profile(row)


@router.post("/profile/change-password")
def change_password(
    body: ChangePasswordRequest,
    user_id: int = Depends(get_request_user_id),
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="New password must be at least 8 characters"
        )

    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT password_hash FROM users WHERE user_id = %s AND is_active = true",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")

            stored = row["password_hash"]
            if not stored or not bcrypt.checkpw(
                body.current_password.encode("utf-8"),
                stored.encode("utf-8") if isinstance(stored, str) else stored,
            ):
                raise HTTPException(
                    status_code=400, detail="Current password is incorrect"
                )

            new_hash = bcrypt.hashpw(
                body.new_password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            cur.execute(
                """
                UPDATE users
                SET password_hash = %s, password_changed_at = %s
                WHERE user_id = %s
                """,
                (new_hash, date.today(), user_id),
            )
            
            # --- Audit log ---
            actor_id = int(x_actor_user_id) if x_actor_user_id else user_id
            add_audit_log(
                cur,
                actor_id,
                "CHANGE_PASSWORD",
                "user",
                user_id,
                "User password changed."
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


@router.get("/profile/activity", response_model=list[ActivityItem])
def profile_activity(
    user_id: int = Depends(get_request_user_id),
    limit: int = 10,
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT log_id, action, details, "timestamp"
                FROM auditlog
                WHERE user_id = %s
                ORDER BY "timestamp" DESC
                LIMIT %s
                """,
                (user_id, min(limit, 50)),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    out = []
    for r in rows:
        ts = r["timestamp"]
        out.append(
            ActivityItem(
                log_id=r["log_id"],
                action=r["action"],
                details=r.get("details"),
                timestamp=ts.isoformat() if ts else "",
            )
        )
    return out
