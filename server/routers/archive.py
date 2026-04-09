from fastapi import APIRouter, HTTPException, Header, Query
from database import get_connection
import psycopg2.extras
from utils.audit import add_audit_log

router = APIRouter()

# Helper to validate stage
def validate_stage(stage: str):
    if stage not in ["Archived", "Deleted"]:
        raise HTTPException(status_code=400, detail="Invalid stage. Must be 'Archived' or 'Deleted'.")

# ──────────────────────────── INVENTORY ──────────────────────────────────────

@router.get("/inventory")
def get_archived_inventory(stage: str = Query("Archived")):
    """Return inventory items in a specific archival stage."""
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
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
                    i.last_updated
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE i.status = %s
                ORDER BY p.product_name
            """, (stage,))
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
                "UPDATE inventory SET status = 'Deleted' WHERE inventory_id = %s AND status IN ('Active', 'Archived') RETURNING inventory_id",
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
                "UPDATE inventory SET status = 'Active' WHERE inventory_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING inventory_id",
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
            cur.execute("""
                SELECT
                    p.product_id,
                    p.product_name,
                    p.sku,
                    COALESCE(c.category_name, 'Uncategorized') AS category_name,
                    COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                    CAST(COALESCE(p.unit_price, 0) AS FLOAT) AS unit_price,
                    p.status,
                    p.date_added
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE p.status = %s
                ORDER BY p.product_name
            """, (stage,))
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
                "UPDATE products SET status = 'Deleted' WHERE product_id = %s AND status IN ('Active', 'Archived') RETURNING product_id",
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
                "UPDATE products SET status = 'Active' WHERE product_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING product_id",
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
            cur.execute("SELECT * FROM supplier WHERE status = %s ORDER BY supplier_name", (stage,))
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
            cur.execute("UPDATE supplier SET status = 'Deleted' WHERE supplier_id = %s AND status IN ('Active', 'Archived') RETURNING supplier_id", (supplier_id,))
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
            cur.execute("UPDATE supplier SET status = 'Active' WHERE supplier_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING supplier_id", (supplier_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Archive/Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.delete("/suppliers/{supplier_id}/permanent")
def permanent_delete_supplier(supplier_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM supplier WHERE supplier_id = %s AND status = 'Deleted' RETURNING supplier_id", (supplier_id,))
            if not cur.fetchone(): raise HTTPException(status_code=404, detail="Not found in Trash")
            conn.commit()
            return {"ok": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

# ──────────────────────────── ORDERS ─────────────────────────────────────────

@router.get("/orders")
def get_archived_orders(stage: str = Query("Archived")):
    validate_stage(stage)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT po.order_id, po.supplier_id, s.supplier_name, po.status, po.created_at,
                       (SELECT COUNT(*) FROM purchase_order_items WHERE order_id = po.order_id) AS total_items
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                WHERE po.status = %s
            """, (stage,))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.put("/orders/{order_id}/move-to-trash")
def move_order_to_trash(order_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE purchase_orders SET status = 'Deleted' WHERE order_id = %s AND status != 'Deleted' RETURNING order_id", (order_id,))
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
            cur.execute("UPDATE purchase_orders SET status = 'Active' WHERE order_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING order_id", (order_id,))
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
            cur.execute("""
                SELECT pr.return_id, pr.supplier_id, s.supplier_name, pr.reason, pr.status, pr.created_at
                FROM product_returns pr
                LEFT JOIN supplier s ON pr.supplier_id = s.supplier_id
                WHERE pr.status = %s
            """, (stage,))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))
    finally: conn.close()

@router.put("/product-returns/{return_id}/move-to-trash")
def move_return_to_trash(return_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE product_returns SET status = 'Deleted' WHERE return_id = %s AND status != 'Deleted' RETURNING return_id", (return_id,))
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
            cur.execute("UPDATE product_returns SET status = 'Approved' WHERE return_id = %s AND (status = 'Archived' OR status = 'Deleted') RETURNING return_id", (return_id,))
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
