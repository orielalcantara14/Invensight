import os
import re
from fastapi import APIRouter, Header, HTTPException
from database import get_connection
from models import LoginRequest, LoginResponse, VerifyOTPRequest, ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
import psycopg2.extras
import bcrypt
import json
from utils.audit import add_audit_log
import secrets
from datetime import datetime, timedelta

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
                    u.permissions_json, u.must_change_password, u.failed_attempts,
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
                            u.permissions_json, u.must_change_password, u.failed_attempts,
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
                cur.execute("UPDATE users SET failed_attempts = failed_attempts + 1 WHERE user_id = %s RETURNING failed_attempts", (row["user_id"],))
                attempts_row = cur.fetchone()
                attempts = attempts_row["failed_attempts"] if attempts_row else 0
                
                if attempts >= 4:
                    cur.execute("UPDATE users SET is_active = FALSE WHERE user_id = %s", (row["user_id"],))
                    add_audit_log(cur, row["user_id"], "ACCOUNT_LOCKOUT", "user", row["user_id"], f"Account deactivated after {attempts} failed login attempts.")
                else:
                    add_audit_log(cur, row["user_id"], "FAILED_LOGIN", "user", row["user_id"], f"Failed login attempt ({attempts}/4)")
                
                conn.commit()
                raise HTTPException(status_code=401, detail="Invalid username or password")

            # Reset failed attempts on successful login
            if row["failed_attempts"] > 0:
                cur.execute("UPDATE users SET failed_attempts = 0 WHERE user_id = %s", (row["user_id"],))

            # Check if user is rootadmin or has already changed their password to bypass MFA
            username_val = row["username"]
            is_root = False
            if username_val:
                root_uname = os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo").strip().lower()
                if username_val.strip().lower() == root_uname or username_val.strip().lower() == "rootadmin":
                    is_root = True

            # Bypass MFA ONLY for rootadmin. Standard users will always require MFA.
            if is_root:
                # Bypass MFA: directly update last login and record session
                cur.execute(
                    "UPDATE users SET mfa_code = NULL, mfa_expiry = NULL, last_login = CURRENT_DATE WHERE user_id = %s",
                    (row["user_id"],),
                )
                add_audit_log(cur, row["user_id"], "LOGIN", "user", row["user_id"], "User logged in (Root Admin MFA Bypass)")
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
                    mfa_required=False,
                    must_change_password=row.get("must_change_password", False)
                )

            # Standard Flow: Generate 6-digit OTP
            otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
            expiry = datetime.now() + timedelta(minutes=15)
            
            cur.execute(
                "UPDATE users SET mfa_code = %s, mfa_expiry = %s WHERE user_id = %s",
                (otp, expiry, row["user_id"]),
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

            # Don't return full session yet, just basic info and MFA flag
            return LoginResponse(
                user_id=row["user_id"],
                username=row["username"] or "",
                full_name=row["full_name"],
                employee_id=row["employee_id"],
                role=row["role"],
                email=row.get("email"),
                permissions=perms,
                mfa_required=True,
                must_change_password=row.get("must_change_password", False),
                otp=otp
            )
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@router.post("/verify-otp", response_model=LoginResponse)
def verify_otp(body: VerifyOTPRequest):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT 
                    u.user_id, u.username, u.full_name, u.employee_id, u.role, 
                    u.is_active, u.email, u.permissions_json, r.permissions_text,
                    u.mfa_code, u.mfa_expiry, u.must_change_password
                FROM users u
                LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.role_name) AND r.user_id IS NULL
                WHERE u.user_id = %s
                """,
                (body.user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            
            if not row["mfa_code"] or row["mfa_code"] != body.otp:
                raise HTTPException(status_code=401, detail="Invalid OTP")
            
            if row["mfa_expiry"] < datetime.now():
                raise HTTPException(status_code=401, detail="OTP has expired")
            
            # Clear OTP and update last login
            cur.execute(
                "UPDATE users SET mfa_code = NULL, mfa_expiry = NULL, last_login = CURRENT_DATE WHERE user_id = %s",
                (row["user_id"],),
            )
            add_audit_log(cur, row["user_id"], "VERIFY_OTP", "user", row["user_id"], "OTP verified successfully")
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
                mfa_required=False,
                must_change_password=row["must_change_password"]
            )
    finally:
        conn.close()

@router.get("/auth/verify")
def verify_session(x_user_id: str | None = Header(default=None, alias="X-User-Id")):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT 
                    u.user_id, u.username, u.full_name, u.employee_id, u.role, 
                    u.is_active, u.email, u.permissions_json, r.permissions_text, u.must_change_password
                FROM users u
                LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.role_name) AND r.user_id IS NULL
                WHERE u.user_id = %s
                """,
                (int(x_user_id),),
            )
            row = cur.fetchone()
            if not row or not row["is_active"]:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            perms = None
            if row.get("permissions_json") and isinstance(row["permissions_json"], dict) and len(row["permissions_json"]) > 0:
                perms = row["permissions_json"]
            elif row.get("permissions_text"):
                try:
                    perms = json.loads(row["permissions_text"])
                except:
                    perms = {}
            
            # Use raw username for root check to stay compatible with Login flow
            is_root = False
            username_val = row["username"]
            if username_val:
                root_uname = os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo").strip().lower()
                if username_val.strip().lower() == root_uname or username_val.strip().lower() == "rootadmin":
                    is_root = True

            return {
                "ok": True,
                "user": {
                    "user_id": row["user_id"],
                    "username": row["username"] or "",
                    "full_name": row["full_name"],
                    "employee_id": row["employee_id"],
                    "role": row["role"],
                    "email": row.get("email"),
                    "permissions": perms,
                    "is_root_admin": is_root,
                    "must_change_password": row["must_change_password"]
                }
            }
    finally:
        conn.close()

@router.post("/change-password")
def change_password(body: ChangePasswordRequest, x_user_id: str | None = Header(default=None, alias="X-User-Id")):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            uid = int(x_user_id)
            cur.execute("SELECT password_hash, username FROM users WHERE user_id = %s", (uid,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Check current password
            if not bcrypt.checkpw(body.current_password.encode("utf-8"), row[0].encode("utf-8")):
                raise HTTPException(status_code=400, detail="Current password is incorrect")
            
            # Hash new password
            new_hash = bcrypt.hashpw(body.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            cur.execute(
                "UPDATE users SET password_hash = %s, must_change_password = FALSE WHERE user_id = %s",
                (new_hash, uid),
            )
            add_audit_log(cur, uid, "CHANGE_PASSWORD", "user", uid, f"User {row[1]} changed their password")
            conn.commit()
            return {"ok": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/forgot-password")
def forgot_password_request(body: ForgotPasswordRequest):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, username FROM users WHERE LOWER(email) = LOWER(%s) AND is_active = TRUE", (body.email,))
            row = cur.fetchone()
            if not row:
                # To prevent email enumeration, we return success even if email not found
                return {"ok": True, "message": "If this email is registered, an OTP will be sent."}
            
            otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
            expiry = datetime.now() + timedelta(minutes=15)
            cur.execute(
                "UPDATE users SET mfa_code = %s, mfa_expiry = %s WHERE user_id = %s",
                (otp, expiry, row[0]),
            )
            conn.commit()
            # In a real app, you'd send the email here. 
            # The frontend will trigger EmailJS, but we return the OTP info if needed 
            # (though normally we'd send it from the backend for security).
            # The user requested that EmailJS is used on the frontend.
            return {"ok": True, "user_id": row[0], "username": row[1], "otp": otp}
    finally:
        conn.close()

@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest):
    from models import ChangePasswordRequest as CPR # for validator reuse if needed, or just manual
    # Manual complexity check or rely on Pydantic
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id, mfa_code, mfa_expiry FROM users WHERE LOWER(email) = LOWER(%s)",
                (body.email,),
            )
            row = cur.fetchone()
            if not row or not row[1] or row[1] != body.otp:
                raise HTTPException(status_code=401, detail="Invalid or expired OTP")
            
            if row[2] < datetime.now():
                raise HTTPException(status_code=401, detail="OTP has expired")
            
            new_hash = bcrypt.hashpw(body.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            cur.execute(
                "UPDATE users SET password_hash = %s, mfa_code = NULL, mfa_expiry = NULL, must_change_password = FALSE WHERE user_id = %s",
                (new_hash, row[0]),
            )
            add_audit_log(cur, row[0], "RESET_PASSWORD", "user", row[0], "Password reset via OTP successful")
            conn.commit()
            return {"ok": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
