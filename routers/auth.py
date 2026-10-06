import os
import re
import uuid
import io
import base64
import pyotp
import qrcode
from fastapi import APIRouter, Header, HTTPException, Request
from database import get_connection
from models import (
    LoginRequest, LoginResponse, VerifyOTPRequest, ResendOTPRequest, 
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest,
    SetupTOTPRequest, SetupTOTPResponse, EnableTOTPRequest, DisableTOTPRequest
)
import psycopg2.extras
import bcrypt
import json
from utils.audit import add_audit_log, format_pht_time
from routers.notifications import dispatch_user_security_alert
import secrets
from datetime import datetime, timedelta, timezone
import threading
import logging

logger = logging.getLogger(__name__)

PH_TZ = timezone(timedelta(hours=8))

_pending_disconnect_timers: dict[int, threading.Timer] = {}
_disconnect_lock = threading.Lock()


def cancel_pending_disconnect(user_id: int):
    """Cancels any pending tab-close disconnect timer when the user makes an active request or reloads (F5)."""
    with _disconnect_lock:
        timer = _pending_disconnect_timers.pop(user_id, None)
        if timer:
            timer.cancel()


def _finalize_tab_close_disconnect(user_id: int, expected_token: str | None):
    """Executes logout and records audit log when a tab closure is sustained beyond the grace period."""
    with _disconnect_lock:
        _pending_disconnect_timers.pop(user_id, None)

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT current_session_token, username FROM users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                return

            # If user is already logged out, do not record another logout
            if not row.get("current_session_token"):
                return

            # If user has a different session token now (e.g. logged in on another device), don't invalidate
            if expected_token and row.get("current_session_token") != expected_token:
                return

            cur.execute("""
                UPDATE users
                SET current_session_token = NULL,
                    session_last_active = NULL,
                    session_device_info = NULL
                WHERE user_id = %s
            """, (user_id,))

            # Debounce: avoid duplicate LOGOUT audit logs within 10 seconds
            cur.execute("""
                SELECT log_id FROM auditlog 
                WHERE user_id = %s AND action = 'LOGOUT' 
                  AND timestamp >= NOW() - INTERVAL '10 seconds'
                LIMIT 1
            """, (user_id,))
            recent = cur.fetchone()
            if not recent:
                uname = row.get("username") or f"ID {user_id}"
                add_audit_log(
                    cur,
                    user_id,
                    "LOGOUT",
                    "user",
                    user_id,
                    f"User '{uname}' logged out of the system (Browser / Tab closed)"
                )
            conn.commit()
    except Exception as e:
        logger.warning(f"Error finalizing tab close disconnect: {e}")
    finally:
        conn.close()

router = APIRouter()

def send_emailjs_otp(
    recipient_email: str,
    username: str,
    otp: str,
    expiry_minutes: int = 15
) -> bool:
    """
    Sends an OTP email through EmailJS from the backend.
    """

    import urllib.request
    import urllib.error

    service_id = os.getenv("EMAILJS_SERVICE_ID")
    template_id = os.getenv("EMAILJS_TEMPLATE_ID")
    public_key = os.getenv("EMAILJS_PUBLIC_KEY")
    private_key = os.getenv("EMAILJS_PRIVATE_KEY")

    if not service_id:
        logger.error("EmailJS ERROR: EMAILJS_SERVICE_ID is not configured")
        return False

    if not template_id:
        logger.error("EmailJS ERROR: EMAILJS_TEMPLATE_ID is not configured")
        return False

    if not public_key:
        logger.error("EmailJS ERROR: EMAILJS_PUBLIC_KEY is not configured")
        return False

    if not private_key:
        logger.error("EmailJS ERROR: EMAILJS_PRIVATE_KEY is not configured")
        return False

    expiry_time = (
        datetime.now(PH_TZ) + timedelta(minutes=expiry_minutes)
    ).strftime("%I:%M %p")

    emailjs_data = {
        "service_id": service_id,
        "template_id": template_id,
        "user_id": public_key,
        "accessToken": private_key,
        "template_params": {
            "Username": username or "User",
            "username": username or "User",
            "Password": "---",
            "passcode": otp,
            "time": expiry_time,
            "email": recipient_email,
        },
    }

    try:
        req = urllib.request.Request(
            "https://api.emailjs.com/api/v1.0/email/send",
            data=json.dumps(emailjs_data).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=15) as response:
            response_body = response.read().decode(
                "utf-8",
                errors="replace"
            )

            logger.info(
                "EmailJS OTP sent successfully to %s. Response: %s",
                recipient_email,
                response_body
            )

            return True

    except urllib.error.HTTPError as e:
        error_body = e.read().decode(
            "utf-8",
            errors="replace"
        )

        logger.error(
            "EmailJS HTTP error %s: %s",
            e.code,
            error_body
        )

        return False

    except urllib.error.URLError as e:
        logger.error(
            "EmailJS connection error: %s",
            e.reason
        )

        return False

    except Exception as e:
        logger.exception(
            "Unexpected EmailJS error: %s",
            e
        )

        return False


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
def login(body: LoginRequest, request: Request, x_device_id: str | None = Header(default=None, alias="X-Device-Id")):
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
                    u.avatar_url, u.current_session_token, u.session_last_active,
                    u.session_device_info, u.totp_enabled, u.totp_secret,
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
                            u.avatar_url, u.current_session_token, u.session_last_active,
                            u.session_device_info, u.totp_enabled, u.totp_secret,
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

            # Check if user is rootadmin
            username_val = row["username"]
            is_root = False
            if username_val:
                root_uname = os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo").strip().lower()
                if username_val.strip().lower() == root_uname or username_val.strip().lower() == "rootadmin":
                    is_root = True

            # --- SINGLE ACTIVE SESSION ENFORCEMENT ---
            # Check if account is currently active on a DIFFERENT device/PC (within last 1 minute)
            if not is_root and not body.force_disconnect and row.get("current_session_token") and row.get("session_last_active"):
                stored_device = (row.get("session_device_info") or "").strip()
                incoming_device = (x_device_id or "").strip()
                is_different_device = bool(stored_device and incoming_device and stored_device != incoming_device)
                
                if is_different_device:
                    cur.execute("""
                        SELECT 1 FROM users 
                        WHERE user_id = %s 
                          AND current_session_token IS NOT NULL 
                          AND session_last_active > NOW() - INTERVAL '1 minute'
                    """, (row["user_id"],))
                    if cur.fetchone():
                        pht_time = format_pht_time()
                        # 1. Alert the active account owner
                        dispatch_user_security_alert(
                            user_id=row["user_id"],
                            title="⚠️ Security Alert: Login Attempt Blocked",
                            message=f"Someone attempted to log into your account from another device at {pht_time}. The simultaneous login was blocked."
                        )
                        # 2. Add audit trail
                        add_audit_log(
                            cur,
                            row["user_id"],
                            "CONCURRENT_LOGIN_BLOCKED",
                            "user",
                            row["user_id"],
                            f"Security Alert: Unauthorized simultaneous login attempt blocked for user account '{row['username']}' from another device."
                        )
                        conn.commit()
                        raise HTTPException(
                            status_code=409,
                            detail="This account is currently open on another PC/device. Simultaneous logins are prohibited for security."
                        )
            elif body.force_disconnect and row.get("current_session_token"):
                add_audit_log(
                    cur,
                    row["user_id"],
                    "FORCE_LOGOUT_PREVIOUS_SESSION",
                    "user",
                    row["user_id"],
                    f"User '{row['username']}' logged in from a new device and terminated their previous active session."
                )

            # Check if global MFA and role-specific MFA are enabled from system_settings
            cur.execute("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('mfa_enabled', 'mfa_roles')")
            sys_mfa_settings = {r["setting_key"]: r["setting_value"] for r in cur.fetchall()}

            mfa_globally_enabled = True
            if "mfa_enabled" in sys_mfa_settings and sys_mfa_settings["mfa_enabled"] is not None:
                mfa_globally_enabled = str(sys_mfa_settings["mfa_enabled"]).strip().lower() not in ("false", "0", "no", "off")

            user_role = (row.get("role") or "").strip().lower()
            role_requires_mfa = mfa_globally_enabled

            if mfa_globally_enabled and "mfa_roles" in sys_mfa_settings and sys_mfa_settings["mfa_roles"]:
                try:
                    mfa_roles_data = json.loads(sys_mfa_settings["mfa_roles"])
                    if isinstance(mfa_roles_data, list):
                        normalized_roles = [str(r).strip().lower() for r in mfa_roles_data]
                        role_requires_mfa = user_role in normalized_roles
                except Exception:
                    role_requires_mfa = True

            # Bypass MFA for rootadmin OR if MFA is not required for this user's role
            if is_root or not role_requires_mfa:
                session_token = str(uuid.uuid4())
                cur.execute(
                    """
                    UPDATE users 
                    SET current_session_token = %s, session_last_active = NOW(),
                        session_device_info = %s,
                        mfa_code = NULL, mfa_expiry = NULL, last_login = CURRENT_DATE 
                    WHERE user_id = %s
                    """,
                    (session_token, x_device_id or "default_device", row["user_id"]),
                )
                audit_msg = "User logged in (Root Admin MFA Bypass)" if is_root else f"User '{row['username']}' ({row['role']}) logged in directly (MFA Disabled for Role)"
                add_audit_log(cur, row["user_id"], "LOGIN", "user", row["user_id"], audit_msg)
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
                    must_change_password=False if is_root else row.get("must_change_password", False),
                    avatar_url=row.get("avatar_url"),
                    session_token=session_token
                )

            # Check if user has TOTP (Authenticator App) enabled
            user_has_totp = bool(row.get("totp_enabled") and row.get("totp_secret"))
            if user_has_totp:
                perms = None
                if row.get("permissions_json") and isinstance(row["permissions_json"], dict) and len(row["permissions_json"]) > 0:
                    perms = row["permissions_json"]
                elif row.get("permissions_text"):
                    try:
                        perms = json.loads(row["permissions_text"])
                    except:
                        perms = {}

                # Instant TOTP flow: No email OTP dispatch, user generates rolling code in Authenticator app
                return LoginResponse(
                    user_id=row["user_id"],
                    username=row["username"] or "",
                    full_name=row["full_name"],
                    employee_id=row["employee_id"],
                    role=row["role"],
                    email=row.get("email"),
                    permissions=perms,
                    mfa_required=True,
                    mfa_method="totp",
                    totp_enabled=True,
                    must_change_password=row.get("must_change_password", False),
                    avatar_url=row.get("avatar_url")
                )

            # Standard Flow: Generate 6-digit OTP
            otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
            expiry = datetime.now() + timedelta(minutes=15)
            
            cur.execute(
                "UPDATE users SET mfa_code = %s, mfa_expiry = %s WHERE user_id = %s",
                (otp, expiry, row["user_id"]),
            )
            conn.commit()

            # Send OTP through EmailJS
            email_sent = send_emailjs_otp(
                recipient_email=row["email"],
                username=row["username"] or "User",
                otp=otp,
                expiry_minutes=15
            )

            if not email_sent:
                logger.error(
                    "OTP was generated for user %s, but EmailJS failed to send it.",
                    row["user_id"]
                )

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
                mfa_method="email",
                totp_enabled=False,
                must_change_password=row.get("must_change_password", False),
                avatar_url=row.get("avatar_url")
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
def verify_otp(body: VerifyOTPRequest, x_device_id: str | None = Header(default=None, alias="X-Device-Id")):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT 
                    u.user_id, u.username, u.full_name, u.employee_id, u.role, 
                    u.is_active, u.email, u.permissions_json, r.permissions_text,
                    u.mfa_code, u.mfa_expiry, u.must_change_password, u.avatar_url,
                    u.current_session_token, u.session_last_active, u.session_device_info,
                    u.totp_enabled, u.totp_secret
                FROM users u
                LEFT JOIN roles r ON LOWER(u.role) = LOWER(r.role_name) AND r.user_id IS NULL
                WHERE u.user_id = %s
                """,
                (body.user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            
            clean_code = body.otp.strip().replace(" ", "").replace("-", "")
            code_verified = False
            user_has_totp = bool(row.get("totp_enabled") and row.get("totp_secret"))

            # 1. If user has TOTP enabled, verify via pyotp algorithm
            if user_has_totp:
                try:
                    totp_verifier = pyotp.TOTP(row["totp_secret"].strip())
                    if totp_verifier.verify(clean_code, valid_window=1):
                        code_verified = True
                except Exception:
                    code_verified = False

            # 2. If not verified via TOTP, check email OTP as backup / fallback
            if not code_verified and row.get("mfa_code"):
                if row["mfa_code"] == clean_code:
                    if row.get("mfa_expiry") and row["mfa_expiry"] < datetime.now():
                        raise HTTPException(status_code=401, detail="Email verification code has expired. Please request a new code.")
                    code_verified = True

            if not code_verified:
                detail_msg = "Invalid 6-digit authenticator code. Check that your device time is synchronized." if user_has_totp else "Invalid verification code"
                raise HTTPException(status_code=401, detail=detail_msg)
            
            # Check single active session on a DIFFERENT device before activating
            is_root = (row["username"] or "").lower() in (os.getenv("ROOT_ADMIN_USERNAME", "rootadminnginamo").strip().lower(), "rootadmin")
            if not is_root and not body.force_disconnect and row.get("current_session_token") and row.get("session_last_active"):
                stored_device = (row.get("session_device_info") or "").strip()
                incoming_device = (x_device_id or "").strip()
                is_different_device = bool(stored_device and incoming_device and stored_device != incoming_device)
                
                if is_different_device:
                    cur.execute("""
                        SELECT 1 FROM users 
                        WHERE user_id = %s 
                          AND current_session_token IS NOT NULL 
                          AND session_last_active > NOW() - INTERVAL '1 minute'
                    """, (row["user_id"],))
                    if cur.fetchone():
                        pht_time = format_pht_time()
                        dispatch_user_security_alert(
                            user_id=row["user_id"],
                            title="⚠️ Security Alert: Login Attempt Blocked",
                            message=f"Someone attempted to log into your account from another device at {pht_time}. The simultaneous login was blocked."
                        )
                        add_audit_log(
                            cur,
                            row["user_id"],
                            "CONCURRENT_LOGIN_BLOCKED",
                            "user",
                            row["user_id"],
                            f"Security Alert: Unauthorized simultaneous login attempt blocked for user account '{row['username']}' from another device."
                        )
                        conn.commit()
                        raise HTTPException(
                            status_code=409,
                            detail="This account is currently active on another device. Simultaneous logins are disabled for security reasons."
                        )
            elif body.force_disconnect and row.get("current_session_token"):
                add_audit_log(
                    cur,
                    row["user_id"],
                    "FORCE_LOGOUT_PREVIOUS_SESSION",
                    "user",
                    row["user_id"],
                    f"User '{row['username']}' verified code and terminated their previous active session."
                )

            # Generate new active session token
            session_token = str(uuid.uuid4())
            cur.execute(
                """
                UPDATE users 
                SET current_session_token = %s, session_last_active = NOW(),
                    session_device_info = %s,
                    mfa_code = NULL, mfa_expiry = NULL, last_login = CURRENT_DATE 
                WHERE user_id = %s
                """,
                (session_token, x_device_id or "default_device", row["user_id"]),
            )
            add_audit_log(cur, row["user_id"], "LOGIN", "user", row["user_id"], f"User '{row['username']}' logged in successfully (MFA verified)")
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
                must_change_password=False if is_root else bool(row.get("must_change_password", False)),
                avatar_url=row.get("avatar_url"),
                session_token=session_token
            )
    finally:
        conn.close()


@router.post("/resend-otp")
def resend_otp(body: ResendOTPRequest):
    user_id = body.user_id
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT user_id, username, email, is_active FROM users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            if not row["is_active"]:
                raise HTTPException(status_code=403, detail="Account is inactive")
            if not row.get("email"):
                raise HTTPException(status_code=400, detail="No email associated with this account")

            otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
            expiry = datetime.now() + timedelta(minutes=15)
            
            cur.execute(
                "UPDATE users SET mfa_code = %s, mfa_expiry = %s WHERE user_id = %s",
                (otp, expiry, row["user_id"]),
            )
            conn.commit()

            # Send OTP through EmailJS
            email_sent = send_emailjs_otp(
                recipient_email=body.email.strip(),
                username=row[1] or "User",
                otp=otp,
                expiry_minutes=15
            )

            if not email_sent:
                logger.error(
                    "Forgot-password OTP was generated for user %s, but EmailJS failed to send it.",
                    row[0]
                )

            return {"ok": True, "message": "Verification code resent successfully"}
    finally:
        conn.close()


@router.post("/totp/setup", response_model=SetupTOTPResponse)
def setup_totp(body: SetupTOTPRequest):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT user_id, username, email, is_active FROM users WHERE user_id = %s", (body.user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            if not user["is_active"]:
                raise HTTPException(status_code=403, detail="User account is inactive")
            
            # Generate random base32 secret
            secret = pyotp.random_base32()
            account_name = user.get("email") or user.get("username") or f"user_{body.user_id}"
            
            # Standard otpauth URI for Google Authenticator / Authy / Microsoft Authenticator
            totp = pyotp.TOTP(secret)
            otpauth_url = totp.provisioning_uri(
                name=account_name,
                issuer_name="JonBrix InvenSight"
            )
            
            # Render PNG QR code to base64 Data URL
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=8,
                border=2,
            )
            qr.add_data(otpauth_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            qr_base64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")
            
            return SetupTOTPResponse(
                secret=secret,
                qr_code=qr_base64,
                otpauth_url=otpauth_url
            )
    finally:
        conn.close()


@router.post("/totp/enable")
def enable_totp(body: EnableTOTPRequest):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT user_id, username, is_active FROM users WHERE user_id = %s", (body.user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            if not user["is_active"]:
                raise HTTPException(status_code=403, detail="User account is inactive")
            
            clean_code = body.totp_code.strip().replace(" ", "").replace("-", "")
            totp = pyotp.TOTP(body.secret.strip())
            if not totp.verify(clean_code, valid_window=1):
                raise HTTPException(status_code=400, detail="Invalid 6-digit authenticator code. Please ensure your device clock is synchronized and try again.")
            
            cur.execute(
                "UPDATE users SET totp_secret = %s, totp_enabled = TRUE WHERE user_id = %s",
                (body.secret.strip(), body.user_id)
            )
            add_audit_log(cur, body.user_id, "2FA_ENABLED", "user", body.user_id, f"User '{user['username']}' successfully enabled Authenticator App (TOTP).")
            conn.commit()
            return {"ok": True, "message": "Authenticator App (2FA) successfully enabled!"}
    finally:
        conn.close()


@router.post("/totp/disable")
def disable_totp(body: DisableTOTPRequest):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT user_id, username, password_hash, is_active FROM users WHERE user_id = %s", (body.user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            if not user["is_active"]:
                raise HTTPException(status_code=403, detail="User account is inactive")
            
            # Security verification with current password
            stored = user["password_hash"]
            if not stored or not bcrypt.checkpw(body.password.encode("utf-8"), stored.encode("utf-8") if isinstance(stored, str) else stored):
                raise HTTPException(status_code=401, detail="Incorrect password. Your current password is required to disable 2FA.")
            
            cur.execute(
                "UPDATE users SET totp_secret = NULL, totp_enabled = FALSE WHERE user_id = %s",
                (body.user_id,)
            )
            add_audit_log(cur, body.user_id, "2FA_DISABLED", "user", body.user_id, f"User '{user['username']}' disabled Authenticator App (TOTP).")
            conn.commit()
            return {"ok": True, "message": "Authenticator App has been disabled. Login will use Email OTP if required."}
    finally:
        conn.close()


@router.post("/auth/heartbeat")
def auth_heartbeat(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_session_token: str | None = Header(default=None, alias="X-Session-Token")
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_user_id)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT current_session_token FROM users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            
            cur.execute("UPDATE users SET session_last_active = NOW() WHERE user_id = %s", (user_id,))
            conn.commit()
            cancel_pending_disconnect(user_id)
            return {"ok": True, "status": "active"}
    finally:
        conn.close()


@router.post("/auth/disconnect-beacon")
async def auth_disconnect_beacon(request: Request):
    """Receives sendBeacon on browser/tab close. Schedules a 6-second grace timer to avoid false logouts on page reload (F5)."""
    try:
        raw_body = await request.body()
        user_id = None
        session_token = None
        if raw_body:
            try:
                body = json.loads(raw_body.decode("utf-8"))
                if isinstance(body, dict):
                    user_id = body.get("user_id")
                    session_token = body.get("session_token")
            except:
                pass

        if not user_id:
            return {"ok": True}

        uid = int(user_id)
        with _disconnect_lock:
            old_timer = _pending_disconnect_timers.pop(uid, None)
            if old_timer:
                old_timer.cancel()

            timer = threading.Timer(6.0, _finalize_tab_close_disconnect, args=[uid, session_token])
            timer.daemon = True
            _pending_disconnect_timers[uid] = timer
            timer.start()
    except Exception as e:
        logger.warning(f"Disconnect beacon error: {e}")
    return {"ok": True}


@router.post("/auth/logout")
async def auth_logout(
    request: Request,
    x_user_id: str | None = Header(default=None, alias="X-User-Id")
):
    target_user_id = None
    reason = "Manual logout"
    if x_user_id:
        try:
            target_user_id = int(x_user_id)
        except:
            pass

    try:
        body = await request.json()
        if isinstance(body, dict):
            if body.get("user_id"):
                target_user_id = int(body["user_id"])
            if body.get("reason"):
                reason = str(body["reason"])
    except:
        pass

    if not target_user_id:
        return {"ok": True}

    cancel_pending_disconnect(target_user_id)

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT user_id, username, full_name, role FROM users WHERE user_id = %s", (target_user_id,))
            user_row = cur.fetchone()
            username = user_row["username"] if user_row else f"ID {target_user_id}"

            # 1. Immediately invalidate current session token and timestamps in DB
            cur.execute("""
                UPDATE users 
                SET current_session_token = NULL,
                    session_last_active = NULL,
                    session_device_info = NULL
                WHERE user_id = %s
            """, (target_user_id,))
            conn.commit()

            # 2. Debounce: avoid duplicate LOGOUT audit logs within 10 seconds for the same user
            try:
                cur.execute("""
                    SELECT log_id FROM auditlog 
                    WHERE user_id = %s AND action = 'LOGOUT' 
                      AND timestamp >= NOW() - INTERVAL '10 seconds'
                    LIMIT 1
                """, (target_user_id,))
                recent_logout = cur.fetchone()

                if not recent_logout:
                    add_audit_log(
                        cur,
                        target_user_id,
                        "LOGOUT",
                        "user",
                        target_user_id,
                        f"User '{username}' logged out of the system ({reason})"
                    )
                conn.commit()
            except Exception as audit_err:
                logger.warning(f"Could not write logout audit log: {audit_err}")

            return {"ok": True}
    finally:
        conn.close()


@router.get("/auth/verify")
def verify_session(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    x_session_token: str | None = Header(default=None, alias="X-Session-Token")
):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    uid = int(x_user_id)
    cancel_pending_disconnect(uid)
    
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT 
                    u.user_id, u.username, u.full_name, u.employee_id, u.role, 
                    u.is_active, u.email, u.permissions_json, r.permissions_text, u.must_change_password, u.avatar_url
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
                    "must_change_password": row["must_change_password"],
                    "avatar_url": row.get("avatar_url")
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
            
            # Check if new password is identical to current password
            if bcrypt.checkpw(body.new_password.encode("utf-8"), row[0].encode("utf-8")):
                raise HTTPException(status_code=400, detail="New password cannot be the same as your current password. Please choose a different password.")
            
            # Hash new password
            new_hash = bcrypt.hashpw(body.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            cur.execute(
                "UPDATE users SET password_hash = %s, must_change_password = FALSE, password_changed_at = CURRENT_TIMESTAMP WHERE user_id = %s",
                (new_hash, uid),
            )
            add_audit_log(cur, uid, "CHANGE_PASSWORD", "user", uid, f"User {row[1]} changed their password")
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
            cur.execute(
                "UPDATE users SET mfa_code = %s, mfa_expiry = CURRENT_TIMESTAMP + interval '15 minutes' WHERE user_id = %s",
                (otp, row[0]),
            )
            conn.commit()

            # Send OTP through EmailJS
            email_sent = send_emailjs_otp(
                recipient_email=body.email.strip(),
                username=row[1] or "User",
                otp=otp,
                expiry_minutes=15
            )

            if not email_sent:
                logger.error(
                    "Forgot-password OTP was generated for user %s, but EmailJS failed to send it.",
                    row[0]
                )

            return {"ok": True, "user_id": row[0], "username": row[1]}
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
                """
                SELECT user_id, mfa_code, mfa_expiry, password_hash,
                       (mfa_expiry < CURRENT_TIMESTAMP) AS is_expired
                FROM users WHERE LOWER(email) = LOWER(%s)
                """,
                (body.email,),
            )
            row = cur.fetchone()
            if not row or not row[1] or row[1] != body.otp:
                raise HTTPException(status_code=401, detail="Invalid or expired OTP")
            
            if row[4]:
                raise HTTPException(status_code=401, detail="OTP has expired")
            
            stored_hash = row[3]
            if stored_hash:
                hash_bytes = stored_hash.encode("utf-8") if isinstance(stored_hash, str) else stored_hash
                if bcrypt.checkpw(body.new_password.encode("utf-8"), hash_bytes):
                    raise HTTPException(
                        status_code=400,
                        detail="New password cannot be the same as your old password. Please choose a different password."
                    )
            
            new_hash = bcrypt.hashpw(body.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            cur.execute(
                "UPDATE users SET password_hash = %s, mfa_code = NULL, mfa_expiry = NULL, must_change_password = FALSE, password_changed_at = CURRENT_TIMESTAMP WHERE user_id = %s",
                (new_hash, row[0]),
            )
            add_audit_log(cur, row[0], "RESET_PASSWORD", "user", row[0], "Password reset via OTP successful")
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
