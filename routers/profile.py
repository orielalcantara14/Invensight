from datetime import date, datetime, timedelta, timezone
from typing import Optional
import os
import shutil
import time

from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile, File
from database import get_connection
from models import (
    ActivityItem,
    ChangePasswordRequest,
    ProfileResponse,
    ProfileUpdateRequest,
    VerifyEmailRequest,
)
import psycopg2.extras
import bcrypt
from utils.audit import add_audit_log

PH_TZ = timezone(timedelta(hours=8))

router = APIRouter()


def _format_utc_iso(dt) -> Optional[str]:
    if not dt:
        return None
    if isinstance(dt, (datetime, date)):
        if isinstance(dt, datetime):
            if dt.tzinfo is None:
                return dt.isoformat() + "Z"
            return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        return dt.isoformat()
    return str(dt)


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
        created_date=_format_utc_iso(cd),
        last_login=_format_utc_iso(ll),
        password_changed_at=_format_utc_iso(pc),
        avatar_url=r.get("avatar_url"),
        temp_email=r.get("temp_email"),
        email_verification_required=bool(r.get("temp_email") and r.get("mfa_code")),
        totp_enabled=bool(r.get("totp_enabled")),
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(user_id: int = Depends(get_request_user_id)):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id, username, full_name, email, role, address,
                       employee_id, created_date, last_login, password_changed_at, is_active, avatar_url,
                       temp_email, mfa_code, totp_enabled
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
                "SELECT user_id, username, email FROM users WHERE user_id = %s AND is_active = true",
                (user_id,),
            )
            user_row = cur.fetchone()
            if not user_row:
                raise HTTPException(status_code=404, detail="User not found")
            current_email = user_row["email"]
            username_val = user_row["username"]

            updates = []
            params = []
            
            # Non-email fields
            if body.full_name is not None:
                updates.append("full_name = %s")
                params.append(body.full_name.strip())
            if body.address is not None:
                updates.append("address = %s")
                params.append((body.address or "").strip() or None)

            # Email change detection & verification
            email_verification_required = False
            otp = None
            new_email = None
            
            if body.email is not None:
                email_val = (body.email or "").strip() or None
                if email_val != current_email:
                    new_email = email_val
                    if new_email:
                        cur.execute(
                            """
                            SELECT 1 FROM users
                            WHERE user_id <> %s AND LOWER(TRIM(email)) = LOWER(TRIM(%s))
                              AND email IS NOT NULL AND TRIM(email) <> ''
                            """,
                            (user_id, new_email),
                        )
                        if cur.fetchone():
                            raise HTTPException(
                                status_code=409, detail="Email already in use"
                            )
                    
                    # If user has a current email, send verification OTP to it first.
                    if current_email:
                        import secrets
                        otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
                        expiry = datetime.now() + timedelta(minutes=15)
                        email_verification_required = True
                        
                        updates.append("temp_email = %s")
                        params.append(new_email)
                        updates.append("mfa_code = %s")
                        params.append(otp)
                        updates.append("mfa_expiry = %s")
                        params.append(expiry)
                    else:
                        # Direct update since there's no old email to verify
                        updates.append("email = %s")
                        params.append(new_email)
                        updates.append("temp_email = NULL")
                        updates.append("mfa_code = NULL")
                        updates.append("mfa_expiry = NULL")

            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")

            params.append(user_id)
            cur.execute(
                f"""
                UPDATE users SET {", ".join(updates)}
                WHERE user_id = %s
                RETURNING user_id, username, full_name, email, role, address,
                          employee_id, created_date, last_login, password_changed_at, avatar_url,
                          temp_email, mfa_code
                """,
                tuple(params),
            )
            row = cur.fetchone()
            
            # Trigger EmailJS directly from the backend to send the OTP securely
            if email_verification_required and otp and current_email:
                try:
                    import urllib.request
                    import json
                    emailjs_data = {
                        "service_id": "service_kzur8un",
                        "template_id": "template_3a3keqi",
                        "user_id": "ZnEuZEpNlMgItPEBG",
                        "template_params": {
                            "Username": username_val or "User",
                            "username": username_val or "User",
                            "Password": "---",
                            "passcode": otp,
                            "time": (datetime.now(PH_TZ) + timedelta(minutes=15)).strftime("%I:%M %p"),
                            "email": current_email
                        }
                    }
                    req = urllib.request.Request(
                        "https://api.emailjs.com/api/v1.0/email/send",
                        data=json.dumps(emailjs_data).encode("utf-8"),
                        headers={
                            "Content-Type": "application/json",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Origin": "http://localhost:5173",
                            "Referer": "http://localhost:5173/"
                        }
                    )
                    with urllib.request.urlopen(req, timeout=10) as response:
                        response.read()
                except Exception as e:
                    # Log but do not block the request
                    print("EmailJS Error during email change verification send:", e)
            
            # --- Audit log ---
            actor_id = int(x_actor_user_id) if x_actor_user_id else user_id
            audit_msg = "User Profile updated"
            if email_verification_required:
                audit_msg += f" (Email change requested to {new_email}, pending verification code sent to {current_email})"
            add_audit_log(
                cur,
                actor_id,
                "UPDATE_PROFILE",
                "user",
                user_id,
                audit_msg
            )
            
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
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
            stored_bytes = stored.encode("utf-8") if isinstance(stored, str) else stored
            if not stored or not bcrypt.checkpw(
                body.current_password.encode("utf-8"),
                stored_bytes,
            ):
                raise HTTPException(
                    status_code=400, detail="Current password is incorrect"
                )

            if bcrypt.checkpw(body.new_password.encode("utf-8"), stored_bytes):
                raise HTTPException(
                    status_code=400,
                    detail="New password cannot be the same as your current password. Please choose a different password."
                )

            new_hash = bcrypt.hashpw(
                body.new_password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            cur.execute(
                """
                UPDATE users
                SET password_hash = %s, password_changed_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                """,
                (new_hash, user_id),
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
                timestamp=_format_utc_iso(ts) or "",
            )
        )
    return out


@router.get("/profile/security-logs", response_model=list[ActivityItem])
def security_logs(
    user_id: int = Depends(get_request_user_id),
    limit: int = 15,
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT log_id, action, details, "timestamp"
                FROM auditlog
                WHERE user_id = %s 
                  AND action IN ('LOGIN', 'FAILED_LOGIN', 'ACCOUNT_LOCKOUT', 'VERIFY_OTP', 'CHANGE_PASSWORD', 'UPDATE_PROFILE')
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
                timestamp=_format_utc_iso(ts) or "",
            )
        )
    return out


import base64
import io
import logging
from PIL import Image, ImageOps

log = logging.getLogger("invensight.profile")

@router.post("/profile/avatar", response_model=ProfileResponse)
def upload_avatar(
    file: UploadFile = File(...),
    user_id: int = Depends(get_request_user_id),
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be a valid image")
    
    file_bytes = file.file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")
        
    try:
        # Process and compress with Pillow into a crisp, lightweight square thumbnail
        img = Image.open(io.BytesIO(file_bytes))
        img = ImageOps.exif_transpose(img)

        # Convert RGBA / P mode to RGB with clean white background
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[3])
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Center crop to 1:1 square
        w, h = img.size
        min_dim = min(w, h)
        left = (w - min_dim) // 2
        top = (h - min_dim) // 2
        img = img.crop((left, top, left + min_dim, top + min_dim))
        
        # Resize to standard avatar dimension (256x256 max)
        img.thumbnail((256, 256), Image.Resampling.LANCZOS)
        
        # Save as optimized JPEG
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85, optimize=True)
        compressed_bytes = buffer.getvalue()
        
        # Convert to persistent Data URL (~8KB - 16KB)
        b64_data = base64.b64encode(compressed_bytes).decode("ascii")
        avatar_data_url = f"data:image/jpeg;base64,{b64_data}"

        # Also write to local uploads directory as local fallback
        UPLOAD_DIR = "uploads"
        avatar_dir = os.path.join(UPLOAD_DIR, "avatars")
        os.makedirs(avatar_dir, exist_ok=True)
        filename = f"avatar_{user_id}_{int(time.time())}.jpg"
        filepath = os.path.join(avatar_dir, filename)
        with open(filepath, "wb") as buffer:
            buffer.write(compressed_bytes)

    except Exception as img_err:
        log.error("Failed to process avatar image: %s", img_err)
        raise HTTPException(status_code=400, detail="Invalid image file format")
    
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE users
                SET avatar_url = %s
                WHERE user_id = %s
                RETURNING user_id, username, full_name, email, role, address,
                          employee_id, created_date, last_login, password_changed_at, avatar_url,
                          temp_email, mfa_code
                """,
                (avatar_data_url, user_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
                
            actor_id = int(x_actor_user_id) if x_actor_user_id else user_id
            add_audit_log(
                cur,
                actor_id,
                "UPDATE_PROFILE",
                "user",
                user_id,
                "User updated profile picture"
            )
            conn.commit()
            return _row_to_profile(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
    return _row_to_profile(row)


@router.post("/profile/verify-email", response_model=ProfileResponse)
def verify_email(
    body: VerifyEmailRequest,
    user_id: int = Depends(get_request_user_id),
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id, username, full_name, email, temp_email, mfa_code, mfa_expiry
                FROM users WHERE user_id = %s AND is_active = true
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
            
            if not row["mfa_code"] or row["mfa_code"] != body.otp.strip():
                raise HTTPException(status_code=400, detail="Invalid verification code")
                
            if not row["mfa_expiry"] or row["mfa_expiry"] < datetime.now():
                raise HTTPException(status_code=400, detail="Verification code has expired")
                
            if not row["temp_email"]:
                raise HTTPException(status_code=400, detail="No pending email change request found")
                
            new_email = row["temp_email"]
            
            # Update user's email, clear temp fields
            cur.execute(
                """
                UPDATE users
                SET email = %s, temp_email = NULL, mfa_code = NULL, mfa_expiry = NULL
                WHERE user_id = %s
                RETURNING user_id, username, full_name, email, role, address,
                          employee_id, created_date, last_login, password_changed_at, avatar_url,
                          temp_email, mfa_code
                """,
                (new_email, user_id),
            )
            updated_row = cur.fetchone()
            
            # Audit log
            actor_id = int(x_actor_user_id) if x_actor_user_id else user_id
            add_audit_log(
                cur,
                actor_id,
                "UPDATE_PROFILE",
                "user",
                user_id,
                f"User email updated to: {new_email} (Verified via OTP)"
            )
            
            conn.commit()
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
        
    return _row_to_profile(updated_row)
