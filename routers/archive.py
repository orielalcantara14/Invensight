from fastapi import APIRouter, HTTPException, Header, Query, Body
from pydantic import BaseModel
from database import get_connection
import psycopg2.extras
from utils.audit import add_audit_log

router = APIRouter()

# Helper to validate stage
def validate_stage(stage: str):
    if stage not in ["Archived", "Deleted"]:
        raise HTTPException(status_code=400, detail="Invalid stage. Must be 'Archived' or 'Deleted'.")

def get_retention_days(cur) -> int:
    cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'deleted_folder_retention_days'")
    row = cur.fetchone()
    if row and row['setting_value']:
        try:
            return int(row['setting_value'])
        except (ValueError, TypeError):
            return 30
    return 30

# ──────────────────────────── RETENTION & AUTO-CLEANUP ────────────────────────────

@router.get("/retention")
def get_retention_setting():
    """Get the current Deleted Folder auto-delete retention period."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            days = get_retention_days(cur)
            return {"retention_days": days, "auto_delete_enabled": days > 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class RetentionPayload(BaseModel):
    retention_days: int

@router.put("/retention")
def update_retention_setting(
    payload: RetentionPayload,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Update the Deleted Folder auto-delete retention period in days (0 to disable)."""
    if payload.retention_days < 0:
        raise HTTPException(status_code=400, detail="Retention days must be >= 0 (0 to disable auto-deletion)")
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO system_settings (setting_key, setting_value, description)
                VALUES ('deleted_folder_retention_days', %s, 'Auto-delete retention period in days for Deleted Folder')
                ON CONFLICT (setting_key)
                DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
            """, (str(payload.retention_days),))

            if x_actor_user_id:
                add_audit_log(
                    cur, int(x_actor_user_id), "UPDATE_SETTINGS", "system_settings", 0,
                    f"Updated Deleted Folder retention period to {payload.retention_days} days."
                )
            conn.commit()
            return {"retention_days": payload.retention_days, "auto_delete_enabled": payload.retention_days > 0}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/auto-cleanup")
def auto_cleanup_deleted_folder(
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Purge records in Deleted Folder that exceed the retention policy period."""
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            days = get_retention_days(cur)
            if days <= 0:
                return {"purged_count": 0, "retention_days": 0, "message": "Auto-cleanup is disabled (retention set to 0/never)."}
            
            cutoff_clause = f"status = 'Deleted' AND COALESCE(deleted_at, last_updated, created_at, date_added, CURRENT_TIMESTAMP) < NOW() - INTERVAL '{days} days'"
            
            # 1. Detach and delete expired products
            cur.execute(f"SELECT product_id FROM products WHERE {cutoff_clause}")
            expired_prod_ids = [r['product_id'] for r in cur.fetchall()]
            if expired_prod_ids:
                cur.execute("UPDATE sold_items SET product_id = NULL WHERE product_id = ANY(%s)", (expired_prod_ids,))
                cur.execute("UPDATE purchase_order_items SET product_id = NULL WHERE product_id = ANY(%s)", (expired_prod_ids,))
                cur.execute("UPDATE product_return_items SET product_id = NULL WHERE product_id = ANY(%s)", (expired_prod_ids,))
                cur.execute("UPDATE customer_return_items SET product_id = NULL WHERE product_id = ANY(%s)", (expired_prod_ids,))
                cur.execute("UPDATE product_price_history SET product_id = NULL WHERE product_id = ANY(%s)", (expired_prod_ids,))
                cur.execute("DELETE FROM inventory WHERE product_id = ANY(%s)", (expired_prod_ids,))
                cur.execute("DELETE FROM products WHERE product_id = ANY(%s)", (expired_prod_ids,))

            # 2. Detach and delete expired suppliers
            cur.execute(f"SELECT supplier_id FROM supplier WHERE {cutoff_clause}")
            expired_supp_ids = [r['supplier_id'] for r in cur.fetchall()]
            if expired_supp_ids:
                cur.execute("UPDATE products SET supplier_id = NULL WHERE supplier_id = ANY(%s)", (expired_supp_ids,))
                cur.execute("UPDATE purchase_orders SET supplier_id = NULL WHERE supplier_id = ANY(%s)", (expired_supp_ids,))
                cur.execute("UPDATE product_returns SET supplier_id = NULL WHERE supplier_id = ANY(%s)", (expired_supp_ids,))
                cur.execute("DELETE FROM supplier WHERE supplier_id = ANY(%s)", (expired_supp_ids,))

            # 3. Delete expired inventory (strictly status = 'Deleted')
            cur.execute(f"DELETE FROM inventory WHERE {cutoff_clause}")
            deleted_inv = cur.rowcount if cur.rowcount > 0 else 0
            
            # 4. Delete expired purchase orders (strictly status = 'Deleted')
            cur.execute(f"DELETE FROM purchase_orders WHERE {cutoff_clause}")
            deleted_po = cur.rowcount if cur.rowcount > 0 else 0

            # 5. Delete expired product returns (strictly status = 'Deleted')
            cur.execute(f"DELETE FROM product_returns WHERE {cutoff_clause}")
            deleted_pr = cur.rowcount if cur.rowcount > 0 else 0

            # 6. Delete expired customer returns (strictly status = 'Deleted')
            cur.execute(f"DELETE FROM customer_returns WHERE {cutoff_clause}")
            deleted_cr = cur.rowcount if cur.rowcount > 0 else 0

            # 7. Detach and delete expired users in Deleted Folder
            cur.execute(f"SELECT user_id FROM users WHERE status = 'Deleted' AND (username IS NULL OR LOWER(TRIM(username)) <> 'rootadminnginamo') AND COALESCE(deleted_at, created_date, CURRENT_TIMESTAMP) < NOW() - INTERVAL '{days} days'")
            expired_user_ids = [r['user_id'] for r in cur.fetchall()]
            if expired_user_ids:
                cur.execute("UPDATE auditlog SET user_id = NULL WHERE user_id = ANY(%s)", (expired_user_ids,))
                cur.execute("UPDATE sales SET user_id = NULL WHERE user_id = ANY(%s)", (expired_user_ids,))
                cur.execute("UPDATE purchase_orders SET user_id = NULL WHERE user_id = ANY(%s)", (expired_user_ids,))
                cur.execute("UPDATE purchase_orders SET voided_by_user_id = NULL WHERE voided_by_user_id = ANY(%s)", (expired_user_ids,))
                cur.execute("UPDATE pos_shifts SET user_id = NULL WHERE user_id = ANY(%s)", (expired_user_ids,))
                cur.execute("UPDATE mechanic_payouts SET processed_by = NULL WHERE processed_by = ANY(%s)", (expired_user_ids,))
                cur.execute("UPDATE sales_import_logs SET imported_by = NULL WHERE imported_by = ANY(%s)", (expired_user_ids,))
                cur.execute("DELETE FROM roles WHERE user_id = ANY(%s)", (expired_user_ids,))
                cur.execute("DELETE FROM user_settings WHERE user_id = ANY(%s)", (expired_user_ids,))
                cur.execute("DELETE FROM notifications WHERE user_id = ANY(%s)", (expired_user_ids,))
                cur.execute("DELETE FROM users WHERE user_id = ANY(%s)", (expired_user_ids,))

            # 8. Delete expired mechanics in Deleted Folder
            cur.execute(f"SELECT mechanic_id FROM mechanics WHERE {cutoff_clause}")
            expired_mech_ids = [r['mechanic_id'] for r in cur.fetchall()]
            if expired_mech_ids:
                cur.execute("DELETE FROM mechanic_payouts WHERE mechanic_id = ANY(%s)", (expired_mech_ids,))
                cur.execute("DELETE FROM mechanics WHERE mechanic_id = ANY(%s)", (expired_mech_ids,))

            total_purged = len(expired_prod_ids) + len(expired_supp_ids) + deleted_inv + deleted_po + deleted_pr + deleted_cr + len(expired_user_ids) + len(expired_mech_ids)
            
            if x_actor_user_id and total_purged > 0:
                add_audit_log(
                    cur, int(x_actor_user_id), "PURGE_DELETED_FOLDER", "archive", 0,
                    f"Auto-cleaned up {total_purged} expired records from Deleted Folder (retention: {days} days)."
                )

            conn.commit()
            return {"purged_count": total_purged, "retention_days": days, "message": f"Successfully purged {total_purged} expired records older than {days} days from Deleted Folder."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ──────────────────────────── INVENTORY ──────────────────────────────────────

@router.get("/inventory")
def get_archived_inventory(stage: str = Query("Archived")):
    """Return inventory items in a specific archival stage."""
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            days = get_retention_days(cur)
            cur.execute("""
                SELECT
                    i.inventory_id,
                    p.product_id,
                    p.product_name,
                    p.sku,
                    COALESCE(c.category_name, 'Uncategorized') AS category_name,
                    COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                    i.quantity,
                    i.status,
                    i.last_updated,
                    COALESCE(i.deleted_at, i.last_updated) AS deleted_at,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((COALESCE(i.deleted_at, i.last_updated) + (%s || ' days')::INTERVAL) - NOW())) / 86400))
                        ELSE NULL 
                    END AS days_remaining,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            TO_CHAR(COALESCE(i.deleted_at, i.last_updated) + (%s || ' days')::INTERVAL, 'YYYY-MM-DD')
                        ELSE NULL 
                    END AS scheduled_delete_date
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE i.status = %s
                ORDER BY p.product_name
            """, (stage, days, days, stage, days, days, stage))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/inventory/{inventory_id}/move-to-trash")
def move_inventory_to_trash(
    inventory_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Move an archived inventory item to the Deleted Folder."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE inventory SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE inventory_id = %s AND status IN ('Active', 'Archived') RETURNING inventory_id",
                (inventory_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Active or Archived inventory item not found")
            
            if x_actor_user_id:
                add_audit_log(cur, int(x_actor_user_id), "TRASH_INVENTORY", "inventory", inventory_id, f"Moved inventory ID {inventory_id} to trash.")
            
            conn.commit()
            return {"ok": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/inventory/{inventory_id}/restore")
def restore_inventory(
    inventory_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Restore an archived/deleted inventory item to Active status."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE inventory SET status = 'Active', deleted_at = NULL WHERE inventory_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING inventory_id",
                (inventory_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Archived/Deleted inventory item not found")
            
            if x_actor_user_id:
                add_audit_log(cur, int(x_actor_user_id), "RESTORE_INVENTORY", "inventory", inventory_id, f"Restored inventory ID {inventory_id} to active.")
            
            conn.commit()
            return {"ok": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/inventory/{inventory_id}/permanent")
def permanent_delete_inventory(
    inventory_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Permanently delete an inventory item (only if in Deleted Folder)."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("DELETE FROM inventory WHERE inventory_id = %s AND status = 'Deleted' RETURNING inventory_id", (inventory_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Deleted inventory item not found or not in trash stage.")
            
            if x_actor_user_id:
                add_audit_log(cur, int(x_actor_user_id), "PERMANENT_DELETE_INVENTORY", "inventory", inventory_id, f"Permanently deleted inventory ID {inventory_id}.")
            
            conn.commit()
            return {"ok": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ──────────────────────────── PRODUCTS ───────────────────────────────────────

@router.get("/products")
def get_archived_products(stage: str = Query("Archived")):
    """Return products in a specific archival stage."""
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            days = get_retention_days(cur)
            cur.execute("""
                SELECT
                    p.product_id,
                    p.product_name,
                    p.sku,
                    COALESCE(c.category_name, 'Uncategorized') AS category_name,
                    COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                    CAST(COALESCE(p.unit_price, 0) AS FLOAT) AS unit_price,
                    p.status,
                    p.date_added,
                    COALESCE(p.deleted_at, p.date_added::timestamp) AS deleted_at,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((COALESCE(p.deleted_at, p.date_added::timestamp) + (%s || ' days')::INTERVAL) - NOW())) / 86400))
                        ELSE NULL 
                    END AS days_remaining,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            TO_CHAR(COALESCE(p.deleted_at, p.date_added::timestamp) + (%s || ' days')::INTERVAL, 'YYYY-MM-DD')
                        ELSE NULL 
                    END AS scheduled_delete_date
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE p.status = %s
                ORDER BY p.product_name
            """, (stage, days, days, stage, days, days, stage))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/products/{product_id}/move-to-trash")
def move_product_to_trash(
    product_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE products SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE product_id = %s AND status IN ('Active', 'Archived') RETURNING product_id",
                (product_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Active or Archived product not found")
            conn.commit()
            return {"ok": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/products/{product_id}/restore")
def restore_product(
    product_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE products SET status = 'Active', deleted_at = NULL WHERE product_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING product_id",
                (product_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Archived product not found")
            conn.commit()
            return {"ok": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/products/{product_id}/permanent")
def permanent_delete_product(
    product_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("UPDATE sold_items SET product_id = NULL WHERE product_id = %s", (product_id,))
            cur.execute("UPDATE purchase_order_items SET product_id = NULL WHERE product_id = %s", (product_id,))
            cur.execute("UPDATE product_return_items SET product_id = NULL WHERE product_id = %s", (product_id,))
            cur.execute("UPDATE customer_return_items SET product_id = NULL WHERE product_id = %s", (product_id,))
            cur.execute("UPDATE product_price_history SET product_id = NULL WHERE product_id = %s", (product_id,))
            
            cur.execute("DELETE FROM inventory WHERE product_id = %s", (product_id,))
            cur.execute("DELETE FROM products WHERE product_id = %s AND status = 'Deleted' RETURNING product_id", (product_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Product not found in trash stage")
            conn.commit()
            return {"ok": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ──────────────────────────── SUPPLIERS ──────────────────────────────────────

@router.get("/suppliers")
def get_archived_suppliers(stage: str = Query("Archived")):
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            days = get_retention_days(cur)
            cur.execute("""
                SELECT 
                    s.*,
                    COALESCE(s.deleted_at, CURRENT_TIMESTAMP) AS deleted_at,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((COALESCE(s.deleted_at, CURRENT_TIMESTAMP) + (%s || ' days')::INTERVAL) - NOW())) / 86400))
                        ELSE NULL 
                    END AS days_remaining,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            TO_CHAR(COALESCE(s.deleted_at, CURRENT_TIMESTAMP) + (%s || ' days')::INTERVAL, 'YYYY-MM-DD')
                        ELSE NULL 
                    END AS scheduled_delete_date
                FROM supplier s 
                WHERE s.status = %s 
                ORDER BY s.supplier_name
            """, (stage, days, days, stage, days, days, stage))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/suppliers/{supplier_id}/move-to-trash")
def move_supplier_to_trash(supplier_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE supplier SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE supplier_id = %s AND status IN ('Active', 'Archived') RETURNING supplier_id", (supplier_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Active or Archived supplier not found")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.put("/suppliers/{supplier_id}/restore")
def restore_supplier(supplier_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE supplier SET status = 'Active', deleted_at = NULL WHERE supplier_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING supplier_id", (supplier_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Archive/Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.delete("/suppliers/{supplier_id}/permanent")
def permanent_delete_supplier(supplier_id: int):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            cur.execute("UPDATE products SET supplier_id = NULL WHERE supplier_id = %s", (supplier_id,))
            cur.execute("UPDATE purchase_orders SET supplier_id = NULL WHERE supplier_id = %s", (supplier_id,))
            cur.execute("UPDATE product_returns SET supplier_id = NULL WHERE supplier_id = %s", (supplier_id,))
            
            cur.execute("DELETE FROM supplier WHERE supplier_id = %s AND status = 'Deleted' RETURNING supplier_id", (supplier_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: 
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

# ──────────────────────────── ORDERS ─────────────────────────────────────────

@router.get("/orders")
def get_archived_orders(stage: str = Query("Archived")):
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            days = get_retention_days(cur)
            cur.execute("""
                SELECT po.order_id, po.supplier_id, s.supplier_name, po.status, po.created_at,
                       COALESCE(po.deleted_at, po.created_at) AS deleted_at,
                       CASE 
                           WHEN %s = 'Deleted' AND %s > 0 THEN 
                               GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((COALESCE(po.deleted_at, po.created_at) + (%s || ' days')::INTERVAL) - NOW())) / 86400))
                           ELSE NULL 
                       END AS days_remaining,
                       CASE 
                           WHEN %s = 'Deleted' AND %s > 0 THEN 
                               TO_CHAR(COALESCE(po.deleted_at, po.created_at) + (%s || ' days')::INTERVAL, 'YYYY-MM-DD')
                           ELSE NULL 
                       END AS scheduled_delete_date,
                       (SELECT COUNT(*) FROM purchase_order_items WHERE order_id = po.order_id) AS total_items
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                WHERE po.status = %s
            """, (stage, days, days, stage, days, days, stage))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.put("/orders/{order_id}/move-to-trash")
def move_order_to_trash(order_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE purchase_orders SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE order_id = %s AND status != 'Deleted' RETURNING order_id", (order_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Order not found or already deleted")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.put("/orders/{order_id}/restore")
def restore_order(order_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE purchase_orders SET status = 'Active', deleted_at = NULL WHERE order_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING order_id", (order_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Archive/Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.delete("/orders/{order_id}/permanent")
def permanent_delete_order(order_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM purchase_orders WHERE order_id = %s AND status = 'Deleted' RETURNING order_id", (order_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

# ──────────────────────── PRODUCT RETURNS ────────────────────────────────────

@router.get("/product-returns")
def get_archived_product_returns(stage: str = Query("Archived")):
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            days = get_retention_days(cur)
            cur.execute("""
                SELECT pr.return_id, pr.supplier_id, s.supplier_name, pr.reason, pr.status, pr.created_at,
                       COALESCE(pr.deleted_at, pr.created_at) AS deleted_at,
                       CASE 
                           WHEN %s = 'Deleted' AND %s > 0 THEN 
                               GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((COALESCE(pr.deleted_at, pr.created_at) + (%s || ' days')::INTERVAL) - NOW())) / 86400))
                           ELSE NULL 
                       END AS days_remaining,
                       CASE 
                           WHEN %s = 'Deleted' AND %s > 0 THEN 
                               TO_CHAR(COALESCE(pr.deleted_at, pr.created_at) + (%s || ' days')::INTERVAL, 'YYYY-MM-DD')
                           ELSE NULL 
                       END AS scheduled_delete_date
                FROM product_returns pr
                LEFT JOIN supplier s ON pr.supplier_id = s.supplier_id
                WHERE pr.status = %s
            """, (stage, days, days, stage, days, days, stage))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.put("/product-returns/{return_id}/move-to-trash")
def move_return_to_trash(return_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE product_returns SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE return_id = %s AND status != 'Deleted' RETURNING return_id", (return_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Return record not found or already deleted")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.put("/product-returns/{return_id}/restore")
def restore_product_return(return_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE product_returns SET status = 'Approved', deleted_at = NULL WHERE return_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING return_id", (return_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Archive/Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.delete("/product-returns/{return_id}/permanent")
def permanent_delete_product_return(return_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM product_returns WHERE return_id = %s AND status = 'Deleted' RETURNING return_id", (return_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

# ──────────────────────── CUSTOMER RETURNS ───────────────────────────────────

@router.get("/customer-returns")
def get_archived_customer_returns(stage: str = Query("Archived")):
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            days = get_retention_days(cur)
            cur.execute("""
                SELECT return_id, rma_number, sale_id, customer_name, return_type, status, reason, created_at,
                       COALESCE(deleted_at, created_at) AS deleted_at,
                       CASE 
                           WHEN %s = 'Deleted' AND %s > 0 THEN 
                               GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((COALESCE(deleted_at, created_at) + (%s || ' days')::INTERVAL) - NOW())) / 86400))
                           ELSE NULL 
                       END AS days_remaining,
                       CASE 
                           WHEN %s = 'Deleted' AND %s > 0 THEN 
                               TO_CHAR(COALESCE(deleted_at, created_at) + (%s || ' days')::INTERVAL, 'YYYY-MM-DD')
                           ELSE NULL 
                       END AS scheduled_delete_date
                FROM customer_returns
                WHERE status = %s
                ORDER BY created_at DESC
            """, (stage, days, days, stage, days, days, stage))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.put("/customer-returns/{return_id}/move-to-trash")
def move_customer_return_to_trash(return_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE customer_returns SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE return_id = %s AND status IN ('Active', 'Archived', 'Pending', 'Returned to Supplier') RETURNING return_id", (return_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Active/Archived return not found")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.put("/customer-returns/{return_id}/restore")
def restore_customer_return(return_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE customer_returns SET status = 'Pending', deleted_at = NULL WHERE return_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING return_id", (return_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Archive/Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.delete("/customer-returns/{return_id}/permanent")
def permanent_delete_customer_return(return_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM customer_returns WHERE return_id = %s AND status = 'Deleted' RETURNING return_id", (return_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()


# ──────────────────────────── MECHANICS / SERVICES ────────────────────────────

@router.get("/mechanics")
def get_archived_mechanics(stage: str = Query("Archived")):
    """Return mechanics in a specific archival stage (Archived / Inactive vs Deleted)."""
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            days = get_retention_days(cur)
            
            # Fetch commission rate
            cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'mechanic_commission_rate'")
            rate_row = cur.fetchone()
            rate = float(rate_row["setting_value"]) if rate_row and rate_row["setting_value"] else 0.80

            status_cond = "status IN ('Inactive', 'Archived')" if stage == "Archived" else "status = 'Deleted'"
            cur.execute(f"""
                SELECT
                    mechanic_id,
                    name,
                    status,
                    earnings_adjustment,
                    deleted_at,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            GREATEST(0, CEIL(EXTRACT(EPOCH FROM ((COALESCE(deleted_at, CURRENT_TIMESTAMP) + (%s || ' days')::INTERVAL) - NOW())) / 86400))
                        ELSE NULL 
                    END AS days_remaining,
                    CASE 
                        WHEN %s = 'Deleted' AND %s > 0 THEN 
                            TO_CHAR(COALESCE(deleted_at, CURRENT_TIMESTAMP) + (%s || ' days')::INTERVAL, 'YYYY-MM-DD')
                        ELSE NULL 
                    END AS scheduled_delete_date
                FROM mechanics
                WHERE {status_cond}
                ORDER BY name
            """, (stage, days, days, stage, days, days))
            rows = [dict(r) for r in cur.fetchall()]
            
            for m in rows:
                cur.execute(
                    """
                    SELECT COALESCE(SUM(si.quantity * si.unit_price), 0.0) AS calculated_revenue
                    FROM sold_items si
                    JOIN products p ON si.product_id = p.product_id
                    WHERE p.is_service = TRUE AND LOWER(TRIM(si.mechanic_name)) = LOWER(TRIM(%s))
                      AND si.mechanic_payout_status = 'Unpaid'
                    """,
                    (m["name"],),
                )
                rev_row = cur.fetchone()
                revenue = float(rev_row["calculated_revenue"]) if rev_row else 0.0
                mechanic_share = round(revenue * rate, 2)
                store_share = round(revenue * (1.0 - rate), 2)
                adjustment = float(m.get("earnings_adjustment") or 0.0)

                m["calculated_revenue"] = revenue
                m["mechanic_share"] = mechanic_share
                m["store_share"] = store_share
                m["total_earnings"] = round(mechanic_share + adjustment, 2)
                m["id"] = m["mechanic_id"]
                m["product_name"] = f"Mechanic • {m['name']}"
                m["category_name"] = f"Commission Split: {int(rate * 100)}%"
                m["reason"] = f"Total Earnings: ₱{m['total_earnings']:.2f}"

            return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/mechanics/{mechanic_id}/move-to-trash")
def move_mechanic_to_trash(
    mechanic_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Move an archived/inactive mechanic to the Deleted Folder."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT name, status FROM mechanics WHERE mechanic_id = %s", (mechanic_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Mechanic not found")

            cur.execute(
                "UPDATE mechanics SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE mechanic_id = %s RETURNING mechanic_id, name",
                (mechanic_id,),
            )
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="Mechanic not found")

            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "TRASH_MECHANIC",
                    "mechanics",
                    mechanic_id,
                    f"Moved mechanic '{row['name']}' (ID: {mechanic_id}) to Deleted Folder."
                )
            conn.commit()
            return {"ok": True, "message": f"Mechanic '{row['name']}' moved to Deleted Folder"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/mechanics/{mechanic_id}/restore")
def restore_mechanic_from_archive(
    mechanic_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Restore an archived or deleted mechanic back to Active status."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT name, status FROM mechanics WHERE mechanic_id = %s", (mechanic_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Mechanic not found")
            if row["status"] == "Active":
                raise HTTPException(status_code=400, detail="Mechanic is already active")

            cur.execute(
                "UPDATE mechanics SET status = 'Active', deleted_at = NULL WHERE mechanic_id = %s RETURNING mechanic_id, name",
                (mechanic_id,),
            )
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="Mechanic not found")

            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "RESTORE_MECHANIC",
                    "mechanics",
                    mechanic_id,
                    f"Restored mechanic '{row['name']}' (ID: {mechanic_id}) to Active status."
                )
            conn.commit()
            return {"ok": True, "message": f"Mechanic '{row['name']}' restored successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/mechanics/{mechanic_id}/permanent")
def permanent_delete_mechanic_from_archive(
    mechanic_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Permanently delete a mechanic from Deleted Folder."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT name, status FROM mechanics WHERE mechanic_id = %s", (mechanic_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Mechanic not found")

            # Clean up foreign key references if any
            cur.execute("DELETE FROM mechanic_payouts WHERE mechanic_id = %s", (mechanic_id,))
            cur.execute("DELETE FROM mechanics WHERE mechanic_id = %s", (mechanic_id,))

            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "PERMANENT_DELETE_MECHANIC",
                    "mechanics",
                    mechanic_id,
                    f"Permanently deleted mechanic '{row['name']}' (ID: {mechanic_id}) from system."
                )
            conn.commit()
            return {"ok": True, "message": f"Mechanic '{row['name']}' permanently deleted"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ──────────────────────────── ROLES ARCHIVE ────────────────────────────

@router.get("/roles")
def get_archived_roles(stage: str = Query("Archived")):
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT r.role_id, r.role_name, r.permissions_text, r.status, r.archived_at, r.deleted_at
                FROM roles r
                WHERE r.user_id IS NULL AND r.status = %s
                ORDER BY COALESCE(r.archived_at, r.deleted_at) DESC
            """, (stage,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()

@router.put("/roles/{role_id}/archive")
def archive_role_endpoint(
    role_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT role_id, role_name, status FROM roles WHERE role_id = %s AND user_id IS NULL", (role_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Role not found")

            # Check assigned users
            cur.execute("SELECT COUNT(*)::int as c FROM users WHERE LOWER(role) = LOWER(%s)", (row["role_name"],))
            assigned = cur.fetchone()["c"]
            if assigned > 0:
                raise HTTPException(status_code=409, detail=f"Cannot archive role '{row['role_name']}' because {assigned} user(s) are currently assigned to it.")

            cur.execute("UPDATE roles SET status = 'Archived', archived_at = CURRENT_TIMESTAMP WHERE role_id = %s", (role_id,))
            if x_actor_user_id:
                add_audit_log(
                    cur, int(x_actor_user_id), "ARCHIVE_ROLE", "roles", role_id,
                    f"Moved role '{row['role_name']}' (ID: {role_id}) to Archive."
                )
            conn.commit()
            return {"ok": True, "message": f"Role '{row['role_name']}' moved to Archive."}
    finally:
        conn.close()

@router.put("/roles/{role_id}/move-to-trash")
def move_role_to_trash(
    role_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT role_id, role_name, status FROM roles WHERE role_id = %s AND user_id IS NULL", (role_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Role not found")

            cur.execute("UPDATE roles SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE role_id = %s", (role_id,))
            if x_actor_user_id:
                add_audit_log(
                    cur, int(x_actor_user_id), "TRASH_ROLE", "roles", role_id,
                    f"Moved role '{row['role_name']}' (ID: {role_id}) to Deleted Folder."
                )
            conn.commit()
            return {"ok": True, "message": f"Role '{row['role_name']}' moved to Deleted Folder."}
    finally:
        conn.close()

@router.put("/roles/{role_id}/restore")
def restore_role_from_archive(
    role_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT role_id, role_name, status FROM roles WHERE role_id = %s AND user_id IS NULL", (role_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Role not found")

            cur.execute("UPDATE roles SET status = 'Active', archived_at = NULL, deleted_at = NULL WHERE role_id = %s", (role_id,))
            if x_actor_user_id:
                add_audit_log(
                    cur, int(x_actor_user_id), "RESTORE_ROLE", "roles", role_id,
                    f"Restored role '{row['role_name']}' (ID: {role_id}) to Active status."
                )
            conn.commit()
            return {"ok": True, "message": f"Role '{row['role_name']}' restored successfully."}
    finally:
        conn.close()

@router.delete("/roles/{role_id}/permanent")
def permanent_delete_role_from_archive(
    role_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT role_id, role_name, status FROM roles WHERE role_id = %s AND user_id IS NULL", (role_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Role not found")

            cur.execute("DELETE FROM roles WHERE role_id = %s", (role_id,))
            if x_actor_user_id:
                add_audit_log(
                    cur, int(x_actor_user_id), "PERMANENT_DELETE_ROLE", "roles", role_id,
                    f"Permanently deleted role '{row['role_name']}' (ID: {role_id}) from system."
                )
            conn.commit()
            return {"ok": True, "message": f"Role '{row['role_name']}' permanently deleted."}
    finally:
        conn.close()
