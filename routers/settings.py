from fastapi import APIRouter, Header, HTTPException, Body, Response, UploadFile, File
import logging
import psycopg2.extras
from database import get_connection
from decimal import Decimal
from datetime import date, datetime
import json
from utils.audit import add_audit_log

router = APIRouter()
log = logging.getLogger("invensight.settings")

class BackupEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

def check_settings_permission(cur, user_id: int):
    cur.execute("SELECT role, username FROM users WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    role = (row["role"] or "").lower() if row else ""
    username = (row["username"] or "").lower() if row else ""
    if role not in ("administrator", "super admin", "superadmin", "system administrator", "root admin", "root") and username != "rootadminnginamo":
        raise HTTPException(status_code=403, detail="Unauthorized role for system settings")

def check_super_admin_permission(cur, user_id: int):
    cur.execute("SELECT role, username FROM users WHERE user_id = %s", (user_id,))
    row = cur.fetchone()
    role = (row["role"] or "").lower() if row else ""
    username = (row["username"] or "").lower() if row else ""
    if role not in ("administrator", "super admin", "superadmin", "system administrator", "root admin", "root") and username != "rootadminnginamo":
        raise HTTPException(status_code=403, detail="Unauthorized role: Super Admin / Administrator only")

@router.get("/user")
def get_user_settings(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT setting_key, setting_value FROM user_settings WHERE user_id = %s", (user_id,))
            res = {}
            for r in cur.fetchall():
                val = r['setting_value']
                if val == 'true':
                    res[r['setting_key']] = True
                elif val == 'false':
                    res[r['setting_key']] = False
                else:
                    res[r['setting_key']] = val
            return res
    except Exception as e:
        log.error(f"Error fetching user settings: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

@router.put("/user")
def update_user_settings(settings: dict = Body(...), x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    """Update settings. Expects user settings map """
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            for key, val in settings.items():
                val_str = str(val).lower() if isinstance(val, bool) else str(val)
                cur.execute("""
                    INSERT INTO user_settings (user_id, setting_key, setting_value)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id, setting_key) 
                    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
                """, (user_id, key, val_str))
        return {"status": "success"}
    except Exception as e:
        log.error(f"Error updating user settings: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

@router.get("/system")
def get_system_settings():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT setting_key, setting_value FROM system_settings")
            return {r['setting_key']: r['setting_value'] for r in cur.fetchall()}
    except Exception as e:
        log.error(f"Error fetching system settings: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

@router.put("/system")
def update_system_settings(settings: dict = Body(...), x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT role, username FROM users WHERE user_id = %s", (user_id,))
            user_row = cur.fetchone()
            role = (user_row["role"] or "").lower() if user_row else ""
            username = (user_row["username"] or "").lower() if user_row else ""
            is_super_admin_or_above = (role in ("super admin", "system administrator") or username == "rootadminnginamo")
            is_admin_or_above = (role in ("administrator", "super admin", "system administrator") or username == "rootadminnginamo")

            for key, val in settings.items():
                if key in ("mfa_enabled", "mfa_roles") and not is_super_admin_or_above:
                    continue
                if key in ("forecast_confidence", "forecast_horizon") and not is_admin_or_above:
                    continue
                cur.execute("""
                    INSERT INTO system_settings (setting_key, setting_value)
                    VALUES (%s, %s)
                    ON CONFLICT (setting_key) 
                    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
                """, (key, str(val)))
                
                if key == "mfa_enabled":
                    is_on = str(val).strip().lower() not in ("false", "0", "no", "off")
                    add_audit_log(
                        cur,
                        user_id,
                        "UPDATE_SECURITY_SETTINGS",
                        "system",
                        None,
                        f"Multi-Factor Authentication (MFA) was turned {'ON (Enforced)' if is_on else 'OFF (Disabled)'} globally by {username or 'admin'}."
                    )
                elif key == "mfa_roles":
                    add_audit_log(
                        cur,
                        user_id,
                        "UPDATE_SECURITY_SETTINGS",
                        "system",
                        None,
                        f"MFA role configuration was updated by {username or 'admin'}."
                    )
            return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error updating system settings: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

@router.post("/login-background")
def upload_login_background(
    file: UploadFile = File(...),
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    
    # 1. Strict Content-Type check (No SVGs or executables)
    allowed_content_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if not file.content_type or file.content_type.lower() not in allowed_content_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, and WebP images are allowed.")
        
    file_bytes = file.file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    # 2. Strict file size check (Max 8MB raw upload)
    if len(file_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 8MB limit. Please upload a smaller image.")
        
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT role, username FROM users WHERE user_id = %s", (user_id,))
            user_row = cur.fetchone()
            role = (user_row["role"] or "").lower() if user_row else ""
            username = (user_row["username"] or "").lower() if user_row else ""
            if role not in ("super admin", "superadmin", "system administrator", "root admin", "root") and username != "rootadminnginamo":
                raise HTTPException(status_code=403, detail="Only Super Admin, System Administrator, and Root Admin can change the login background")
                
            from PIL import Image, ImageOps
            import io, os, time
            
            # 3. Decompression bomb protection (limit max pixels to 30MP)
            Image.MAX_IMAGE_PIXELS = 30_000_000
            
            try:
                img = Image.open(io.BytesIO(file_bytes))
                if img.format not in ("JPEG", "PNG", "WEBP", "MPO"):
                    raise HTTPException(status_code=400, detail="Unsupported image format. Please upload JPG, PNG, or WebP.")
                img = ImageOps.exif_transpose(img)
            except Exception as e:
                log.warning(f"Malicious or corrupted image upload attempt: {e}")
                raise HTTPException(status_code=400, detail="Corrupted or invalid image file.")
            
            # 4. Convert RGBA/Transparency to RGB with clean dark matte
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                bg = Image.new("RGB", img.size, (9, 9, 11))
                if img.mode != "RGBA":
                    img = img.convert("RGBA")
                bg.paste(img, mask=img.split()[3])
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
            
            # 5. Sanitize & resize down to standard 1080p max (destroys any polyglot / script payload)
            img.thumbnail((1920, 1080), Image.Resampling.LANCZOS)
            
            # 6. Re-encode strictly into clean, stripped JPEG (~150KB-300KB)
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=82, optimize=True)
            compressed_bytes = buffer.getvalue()
            
            upload_dir = os.path.join("uploads", "branding")
            os.makedirs(upload_dir, exist_ok=True)
            
            # 7. Cleanup old background file from disk
            cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'login_background_url'")
            old_row = cur.fetchone()
            if old_row and old_row.get("setting_value"):
                old_val = str(old_row["setting_value"])
                if old_val.startswith("/uploads/branding/"):
                    old_path = os.path.join(upload_dir, os.path.basename(old_val))
                    if os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                        except Exception:
                            pass
            
            filename = f"login_bg_{int(time.time())}.jpg"
            filepath = os.path.join(upload_dir, filename)
            with open(filepath, "wb") as f:
                f.write(compressed_bytes)
                
            file_url = f"/uploads/branding/{filename}"
            
            cur.execute("""
                INSERT INTO system_settings (setting_key, setting_value)
                VALUES ('login_background_url', %s)
                ON CONFLICT (setting_key)
                DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
            """, (file_url,))
            conn.commit()
            
            add_audit_log(
                cur,
                user_id,
                "UPDATE_SYSTEM_SETTINGS",
                "system",
                None,
                f"Login screen background picture was updated by {username or 'admin'}."
            )
            
            return {
                "status": "success",
                "login_background_url": file_url
            }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error uploading login background: {e}")
        raise HTTPException(status_code=500, detail="Failed to process image")
    finally:
        conn.close()

@router.delete("/login-background")
def reset_login_background(
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT role, username FROM users WHERE user_id = %s", (user_id,))
            user_row = cur.fetchone()
            role = (user_row["role"] or "").lower() if user_row else ""
            username = (user_row["username"] or "").lower() if user_row else ""
            if role not in ("super admin", "superadmin", "system administrator", "root admin", "root") and username != "rootadminnginamo":
                raise HTTPException(status_code=403, detail="Only Super Admin, System Administrator, and Root Admin can reset the login background")
                
            # Cleanup file from disk
            cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'login_background_url'")
            old_row = cur.fetchone()
            if old_row and old_row.get("setting_value"):
                old_val = str(old_row["setting_value"])
                if old_val.startswith("/uploads/branding/"):
                    old_path = os.path.join("uploads", "branding", os.path.basename(old_val))
                    if os.path.exists(old_path):
                        try:
                            os.remove(old_path)
                        except Exception:
                            pass
            
            cur.execute("DELETE FROM system_settings WHERE setting_key = 'login_background_url'")
            conn.commit()
            
            add_audit_log(
                cur,
                user_id,
                "UPDATE_SYSTEM_SETTINGS",
                "system",
                None,
                f"Login screen background was reset to default by {username or 'admin'}."
            )
            return {"status": "success", "message": "Reset to default background"}
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error resetting login background: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

CORE_BACKUP_TABLES = [
    "roles",
    "users",
    "system_settings",
    "user_settings",
    "supplier",
    "categories",
    "products",
    "inventory",
    "inventory_stock_events",
    "pos_terminals",
    "pos_shifts",
    "sales",
    "sold_items",
    "payments",
    "mechanics",
    "mechanic_payouts",
    "purchase_orders",
    "purchase_order_items",
    "customer_returns",
    "customer_return_items",
    "product_returns",
    "product_return_items",
    "expenses",
    "notifications",
    "auditlog",
]

@router.get("/backup")
def download_backup(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            check_super_admin_permission(cur, user_id)
            
            backup = {}
            for t in CORE_BACKUP_TABLES:
                try:
                    cur.execute(f'SELECT * FROM "{t}"')
                    backup[t] = [dict(r) for r in cur.fetchall()]
                except Exception as tbl_err:
                    log.warning(f"Could not backup table {t}: {tbl_err}")
                    conn.rollback()
                    continue
            
            # Audit log
            add_audit_log(cur, user_id, "BACKUP_DATABASE", "system", None, "Downloaded database backup.")
            
            json_data = json.dumps(backup, cls=BackupEncoder)
            return Response(content=json_data, media_type="application/json", headers={
                "Content-Disposition": f"attachment; filename=invensight_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            })
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error generating backup: {e}")
        raise HTTPException(status_code=500, detail=f"Backup error: {str(e)}")
    finally:
        conn.close()

@router.post("/restore")
def restore_backup(file: UploadFile = File(...), x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            check_super_admin_permission(cur, user_id)
            
            # Store current user state to restore it in case it is modified/deleted in backup
            cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
            restoring_user = dict(cur.fetchone())

            # Preserve existing audit log trail so activity history is never wiped out during restore
            cur.execute("CREATE TEMP TABLE temp_auditlog ON COMMIT DROP AS SELECT * FROM auditlog;")
            
            contents = file.file.read()
            backup = json.loads(contents)
            
            if not isinstance(backup, dict):
                raise HTTPException(status_code=400, detail="Invalid backup file format")
            
            # Truncate tables in reverse dependency order
            truncate_tables = [
                "customer_return_items", "customer_returns", "product_return_items", "product_returns",
                "purchase_order_items", "purchase_orders", "mechanic_payouts", "mechanics",
                "payments", "sold_items", "sales", "pos_shifts", "pos_terminals",
                "inventory_stock_events", "inventory", "products", "categories", "supplier",
                "user_settings", "system_settings", "notifications", "users"
            ]
            trunc_sql = "TRUNCATE " + ", ".join([f'"{t}"' for t in truncate_tables]) + " CASCADE;"
            cur.execute(trunc_sql)
            
            def restore_table(table_name):
                rows = backup.get(table_name, [])
                if not rows:
                    return
                keys = list(rows[0].keys())
                columns = ", ".join([f'"{k}"' for k in keys])
                placeholders = ", ".join(["%s"] * len(keys))
                overriding = " OVERRIDING SYSTEM VALUE" if table_name == "auditlog" else ""
                query = f'INSERT INTO "{table_name}" ({columns}){overriding} VALUES ({placeholders})'
                all_vals = []
                for row in rows:
                    all_vals.append([
                        json.dumps(row[k]) if isinstance(row.get(k), (dict, list)) else row.get(k)
                        for k in keys
                    ])
                psycopg2.extras.execute_batch(cur, query, all_vals, page_size=1000)
            
            # Restore tables in strict dependency order (auditlog is handled separately below)
            for t in CORE_BACKUP_TABLES:
                if t == "auditlog":
                    continue
                if t in backup:
                    restore_table(t)
            
            # Verify restoring user is still in the database and has same permission/role
            cur.execute("SELECT 1 FROM users WHERE user_id = %s", (user_id,))
            if not cur.fetchone():
                keys = list(restoring_user.keys())
                columns = ", ".join([f'"{k}"' for k in keys])
                placeholders = ", ".join(["%s"] * len(keys))
                query = f'INSERT INTO users ({columns}) VALUES ({placeholders})'
                vals = [
                    json.dumps(restoring_user[k]) if isinstance(restoring_user.get(k), (dict, list)) else restoring_user.get(k)
                    for k in keys
                ]
                cur.execute(query, tuple(vals))

            # Restore audit logs:
            # 1. If temp_auditlog has records from this instance, restore and preserve them.
            # 2. If temp_auditlog is empty (e.g. fresh database setup) and backup contains auditlog, restore from backup.
            cur.execute("SELECT COUNT(*) FROM temp_auditlog;")
            has_temp_logs = (cur.fetchone() or {}).get("count", 0) > 0

            if has_temp_logs:
                cur.execute("""
                    INSERT INTO auditlog (log_id, user_id, action, entity_type, entity_id, "timestamp", details)
                    OVERRIDING SYSTEM VALUE
                    SELECT 
                        t.log_id,
                        CASE WHEN u.user_id IS NOT NULL THEN t.user_id ELSE NULL END,
                        t.action,
                        t.entity_type,
                        t.entity_id,
                        t."timestamp",
                        t.details
                    FROM temp_auditlog t
                    LEFT JOIN users u ON t.user_id = u.user_id
                    ORDER BY t.log_id ASC;
                """)
            elif "auditlog" in backup and backup["auditlog"]:
                restore_table("auditlog")
            
            # Reset all PostgreSQL serial sequences to MAX(id)
            cur.execute("""
                DO $$
                DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN (
                        SELECT c.relname AS seq_name,
                               t.relname AS table_name,
                               a.attname AS column_name
                        FROM pg_class c
                        JOIN pg_depend d ON d.objid = c.oid
                        JOIN pg_class t ON t.oid = d.refobjid
                        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
                        WHERE c.relkind = 'S'
                    ) LOOP
                        BEGIN
                            EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))',
                                           r.seq_name, r.column_name, r.table_name);
                        EXCEPTION WHEN OTHERS THEN
                            NULL;
                        END;
                    END LOOP;
                END $$;
            """)
            
            # Audit log
            add_audit_log(cur, user_id, "RESTORE_DATABASE", "system", None, "Restored database from backup file.")
            
            conn.commit()
            return {"ok": True, "message": "Database restored successfully."}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        log.error(f"Error restoring backup: {e}")
        raise HTTPException(status_code=500, detail=f"Restore error: {str(e)}")
    finally:
        conn.close()
