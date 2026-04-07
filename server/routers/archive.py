from fastapi import APIRouter, HTTPException, Header
from database import get_connection
import psycopg2.extras
from utils.audit import add_audit_log

router = APIRouter()


# ──────────────────────────── PRODUCTS ───────────────────────────────────────

@router.get("/products")
def get_archived_products():
    """Return all products with status = 'Archived'."""
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
                    CAST(COALESCE(p.pos_price, 0) AS FLOAT) AS pos_price,
                    p.status,
                    p.date_added
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE p.status = 'Archived'
                ORDER BY p.product_name
            """)
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/products/{product_id}/restore")
def restore_product(
    product_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Restore an archived product by setting status = 'Active'."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE products SET status = 'Active' WHERE product_id = %s AND status = 'Archived' RETURNING product_id",
                (product_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Archived product not found")
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "RESTORE_PRODUCT",
                    "product",
                    product_id,
                    f"Restored product ID: {product_id}"
                )
            
            conn.commit()
            return {"ok": True}
    except HTTPException:
        raise
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
    """Permanently delete an archived product from the database."""
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT product_id, status FROM products WHERE product_id = %s", (product_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Product not found")
            if row["status"] != "Archived":
                raise HTTPException(status_code=400, detail="Product must be archived before permanent deletion")
            # Remove sold_items references (keep null)
            cur.execute("DELETE FROM inventory WHERE product_id = %s", (product_id,))
            cur.execute("DELETE FROM products WHERE product_id = %s", (product_id,))
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "PERMANENT_DELETE",
                    "product",
                    product_id,
                    f"Permanently deleted product ID: {product_id}"
                )
                
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


# ──────────────────────────── SUPPLIERS ──────────────────────────────────────

@router.get("/suppliers")
def get_archived_suppliers():
    """Return all suppliers with status = 'Archived'."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM supplier WHERE status = 'Archived' ORDER BY supplier_name"
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/suppliers/{supplier_id}/restore")
def restore_supplier(
    supplier_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Restore an archived supplier by setting status = 'Active'."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE supplier SET status = 'Active' WHERE supplier_id = %s AND status = 'Archived' RETURNING supplier_id",
                (supplier_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Archived supplier not found")
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "RESTORE_SUPPLIER",
                    "supplier",
                    supplier_id,
                    f"Restored supplier ID: {supplier_id}"
                )
                
            conn.commit()
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ──────────────────────────── ORDERS ─────────────────────────────────────────

@router.get("/orders")
def get_archived_orders():
    """Return all purchase orders with status = 'Archived'."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    po.order_id,
                    po.supplier_id,
                    COALESCE(s.supplier_name, 'Unknown Supplier') AS supplier_name,
                    po.status,
                    po.created_at,
                    po.expected_delivery,
                    po.received_at,
                    po.notes,
                    (SELECT COUNT(*) FROM purchase_order_items poi WHERE poi.order_id = po.order_id) AS total_items
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                WHERE po.status = 'Archived'
                ORDER BY po.created_at DESC
            """)
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/orders/{order_id}/restore")
def restore_order(
    order_id: str,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Restore an archived order by setting status = 'Received'."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE purchase_orders SET status = 'Received' WHERE order_id = %s AND status = 'Archived' RETURNING order_id",
                (order_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Archived order not found")
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "RESTORE_ORDER",
                    "order",
                    0, # order table has string IDs, utility expects int. Using 0 for now as entity_id is int.
                    f"Restored order ID: {order_id}",
                    order_id # Using dynamic details if needed, but entity_id is int.
                )
            
            conn.commit()
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ──────────────────────── PRODUCT RETURNS ────────────────────────────────────

@router.get("/product-returns")
def get_archived_product_returns():
    """Return all product returns with status = 'Archived'."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    pr.return_id,
                    pr.supplier_id,
                    COALESCE(s.supplier_name, 'Unknown Supplier') AS supplier_name,
                    pr.reason,
                    pr.status,
                    pr.created_at,
                    pr.approved_at,
                    pr.rejected_at,
                    COALESCE((
                        SELECT SUM(pri.quantity)
                        FROM product_return_items pri
                        WHERE pri.return_id = pr.return_id
                    ), 0) AS total_quantity
                FROM product_returns pr
                LEFT JOIN supplier s ON pr.supplier_id = s.supplier_id
                WHERE pr.status = 'Archived'
                ORDER BY pr.created_at DESC
            """)
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/product-returns/{return_id}/restore")
def restore_product_return(
    return_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Restore an archived product return by setting status = 'Resolved'."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE product_returns SET status = 'Approved' WHERE return_id = %s AND status = 'Archived' RETURNING return_id",
                (return_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Archived return not found")
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "RESTORE_RETURN",
                    "return",
                    return_id,
                    f"Restored return ID: {return_id}"
                )
                
            conn.commit()
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
