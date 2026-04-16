from fastapi import APIRouter, HTTPException, Header
from database import get_connection
from models import InventoryResponse, CreateInventoryRequest, UpdateInventoryRequest, InventoryDiscrepancyRequest
import psycopg2.extras
from datetime import date
import logging
import re
from utils.sku import build_sku
from utils.audit import add_audit_log
from routers.notifications import dispatch_notification

logger = logging.getLogger("invensight.inventory")
router = APIRouter()

def _get_inventory_item(cur: psycopg2.extras.RealDictCursor, inventory_id: int):
    cur.execute(
        """
        SELECT
            i.inventory_id,
            p.product_id,
            COALESCE(p.product_name, 'Unknown') AS product_name,
            COALESCE(p.sku, 'N/A') AS sku,
            p.category_id,
            COALESCE(c.category_name, 'Uncategorized') AS category_name,
            p.specific_category,
            p.unit_of_measurement,
            s.supplier_name,
            COALESCE(i.quantity, 0) AS quantity,
            COALESCE(i.expected, 0) AS expected,
            COALESCE(i.actual, 0) AS actual,
            COALESCE(i.actual, 0) - COALESCE(i.expected, 0) AS difference,
            COALESCE(i.reorder_level, 10) AS reorder_level,
            COALESCE(p.unit_price::float, 0.0) AS unit_price,
            CASE
                WHEN p.status = 'Archived' THEN 'Archived'
                WHEN COALESCE(i.actual, 0) = 0 THEN 'Out of Stock'
                WHEN COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10) THEN 'Low'
                ELSE 'Normal'
            END AS status,
            COALESCE(i.last_updated::text, '') AS last_updated,
            COALESCE(i.reason_adjustment, '') AS reason_adjustment,
            i.serial_start,
            i.serial_end,
            i.expiry_date::text AS expiry_date
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
        WHERE i.inventory_id = %s AND i.status = 'Active'
        """,
        (inventory_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return dict(row)

def check_daily_reset(cur: psycopg2.extras.RealDictCursor):
    """Resets expected count to equal quantity count at the start of each day."""
    cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'last_expected_reset'")
    row = cur.fetchone()
    last_reset = row["setting_value"] if row else ""
    today_str = date.today().isoformat()

    if last_reset != today_str:
        # Perform reset: Set expected = quantity for ALL active inventory
        cur.execute("UPDATE inventory SET expected = quantity WHERE status = 'Active'")
        
        # Update last reset date
        cur.execute(
            "UPDATE system_settings SET setting_value = %s WHERE setting_key = 'last_expected_reset'",
            (today_str,)
        )
        logger.info(f"Daily inventory expected count reset performed for {today_str}")

@router.get("/")
def get_inventory():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Check for daily reset before fetching
            check_daily_reset(cur)
            conn.commit()
            
            cur.execute(
                """
                SELECT
                    i.inventory_id,
                    p.product_id,
                    COALESCE(p.product_name, 'Unknown') AS product_name,
                    COALESCE(p.sku, 'N/A') AS sku,
                    p.category_id,
                    COALESCE(c.category_name, 'Uncategorized') AS category_name,
                    p.specific_category,
                    p.unit_of_measurement,
                    s.supplier_name,
                    COALESCE(i.quantity, 0) AS quantity,
                    COALESCE(i.expected, 0) AS expected,
                    COALESCE(i.actual, 0) AS actual,
                    COALESCE(i.actual, 0) - COALESCE(i.expected, 0) AS difference,
                    COALESCE(i.reorder_level, 10) AS reorder_level,
                    COALESCE(p.unit_price::float, 0.0) AS unit_price,
                    CASE
                        WHEN p.status = 'Archived' THEN 'Archived'
                        WHEN COALESCE(i.actual, 0) = 0 THEN 'Out of Stock'
                        WHEN COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10) THEN 'Low'
                        ELSE 'Normal'
                    END AS status,
                    COALESCE(i.last_updated::text, '') AS last_updated,
                    COALESCE(i.reason_adjustment, '') AS reason_adjustment,
                    i.serial_start,
                    i.serial_end,
                    i.expiry_date::text AS expiry_date
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE i.status = 'Active'
                ORDER BY i.expiry_date ASC NULLS LAST, p.product_name
                """
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error(f"Error fetching inventory: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/")
def add_inventory_item(
    payload: CreateInventoryRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # 1. Handle Supplier
            supplier_id = None
            if payload.supplier_name:
                cur.execute("SELECT supplier_id FROM supplier WHERE supplier_name = %s", (payload.supplier_name,))
                s_row = cur.fetchone()
                if s_row:
                    supplier_id = s_row["supplier_id"]
                else:
                    cur.execute("SELECT COALESCE(MAX(supplier_id), 0) + 1 AS next_id FROM supplier")
                    supplier_id = cur.fetchone()["next_id"]
                    cur.execute(
                        "INSERT INTO supplier (supplier_id, supplier_name, status) VALUES (%s, %s, %s)",
                        (supplier_id, payload.supplier_name, "Active")
                    )

            # 2. Handle Product
            category_name = "Uncategorized"
            if payload.category_id:
                cur.execute("SELECT category_name FROM categories WHERE category_id = %s", (payload.category_id,))
                c_row = cur.fetchone()
                if c_row:
                    category_name = c_row["category_name"]

            sku = build_sku(cur, payload.sku, payload.product_name, category_name)
            
            cur.execute("SELECT product_id FROM products WHERE sku = %s", (sku,))
            p_row = cur.fetchone()
            if p_row:
                product_id = p_row["product_id"]
                cur.execute(
                    """
                    UPDATE products SET 
                        product_name = %s, supplier_id = %s, category_id = %s, 
                        specific_category = %s, unit_of_measurement = %s,
                        unit_price = %s, pos_price = %s
                    WHERE product_id = %s
                    """,
                    (payload.product_name, supplier_id, payload.category_id, 
                     payload.specific_category, payload.unit_of_measurement, 
                     payload.unit_price, payload.pos_price, product_id)
                )
            else:
                cur.execute("SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products")
                product_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO products (
                        product_id, product_name, sku, supplier_id, category_id, 
                        specific_category, unit_of_measurement, date_added,
                        unit_price, pos_price
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (product_id, payload.product_name, sku, supplier_id, payload.category_id,
                     payload.specific_category, payload.unit_of_measurement, date.today(),
                     payload.unit_price, payload.pos_price)
                )

            # 3. Handle Inventory
            cur.execute("SELECT inventory_id FROM inventory WHERE product_id = %s", (product_id,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Product already exists in inventory")
            
            cur.execute("SELECT COALESCE(MAX(inventory_id), 0) + 1 AS next_id FROM inventory")
            inventory_id = cur.fetchone()["next_id"]
            
            cur.execute(
                """
                INSERT INTO inventory (
                    inventory_id, product_id, quantity, expected, actual, reorder_level, 
                    last_updated, reason_adjustment, serial_start, serial_end, expiry_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    inventory_id,
                    product_id,
                    payload.quantity,
                    payload.expected, # Use expected from payload
                    payload.quantity, # actual = quantity on creation
                    payload.reorder_level,
                    date.today(),
                    "Initial stock",
                    payload.serial_start,
                    payload.serial_end,
                    payload.expiry_date
                ),
            )
            
            # Inventory reference removed from pos_management as table is dropped
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "ADD_INVENTORY",
                    "inventory",
                    inventory_id,
                    f"Added new inventory item: {payload.product_name} (Initial Qty: {payload.quantity})"
                )

            conn.commit()
            return _get_inventory_item(cur, inventory_id)
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/{inventory_id}/")
def update_inventory_item(
    inventory_id: int, 
    payload: UpdateInventoryRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Get current product_id
            cur.execute("SELECT product_id FROM inventory WHERE inventory_id = %s", (inventory_id,))
            inv_row = cur.fetchone()
            if not inv_row:
                raise HTTPException(status_code=404, detail="Inventory item not found")
            product_id = inv_row["product_id"]

            # 1. Handle Supplier
            supplier_id = None
            if payload.supplier_name:
                cur.execute("SELECT supplier_id FROM supplier WHERE supplier_name = %s", (payload.supplier_name,))
                s_row = cur.fetchone()
                if s_row:
                    supplier_id = s_row["supplier_id"]
                else:
                    cur.execute("SELECT COALESCE(MAX(supplier_id), 0) + 1 AS next_id FROM supplier")
                    supplier_id = cur.fetchone()["next_id"]
                    cur.execute(
                        "INSERT INTO supplier (supplier_id, supplier_name, status) VALUES (%s, %s, %s)",
                        (supplier_id, payload.supplier_name, "Active")
                    )

            # 2. Handle Product
            category_name = "Uncategorized"
            if payload.category_id:
                cur.execute("SELECT category_name FROM categories WHERE category_id = %s", (payload.category_id,))
                c_row = cur.fetchone()
                if c_row:
                    category_name = c_row["category_name"]

            sku = build_sku(cur, payload.sku, payload.product_name, category_name)

            cur.execute(
                """
                UPDATE products SET 
                    product_name = %s, sku = %s, supplier_id = %s, category_id = %s, 
                    specific_category = %s, unit_of_measurement = %s
                WHERE product_id = %s
                """,
                (payload.product_name, sku, supplier_id, payload.category_id, 
                 payload.specific_category, payload.unit_of_measurement, product_id)
            )

            # 3. Handle Inventory
            # The logic here is:
            # - `quantity` is the live, sellable stock.
            # - `expected` is incoming stock (e.g., from a PO).
            # - `actual` is the physical count during an audit.
            # When an adjustment is made (e.g., actual count differs from quantity),
            # the `quantity` is updated to match the `actual` count, and the reason is logged.
            
            # If the user provided an 'actual' count that differs from the current 'quantity',
            # we assume they are doing a stock audit and want to update the live quantity.
            # Otherwise, we just update the fields as provided.
            
            cur.execute("SELECT quantity, expected, actual FROM inventory WHERE inventory_id = %s", (inventory_id,))
            current_row = cur.fetchone()
            current_quantity = current_row["quantity"]
            current_expected = current_row["expected"]
            current_actual = current_row["actual"]
            
            new_quantity = payload.quantity
            new_actual = payload.actual
            new_expected = payload.expected
            
            # Application Logic based on Reason for Adjustment
            if payload.reason_adjustment == "Restock":
                # Editing quantity automatically updates actual and expected
                new_actual = new_quantity
                # Change in quantity is added to expected
                qty_delta = new_quantity - current_quantity
                new_expected = current_expected + qty_delta
            elif payload.reason_adjustment in ["Lost", "Damaged"]:
                # Editing actual automatically updates quantity (expected remains same)
                new_quantity = new_actual
            elif payload.reason_adjustment == "Correction":
                # Manual sync of all fields
                pass

            cur.execute(
                """
                UPDATE inventory SET 
                    quantity = %s, 
                    expected = %s,
                    actual = %s,
                    reorder_level = %s, 
                    last_updated = %s,
                    reason_adjustment = %s,
                    serial_start = %s,
                    serial_end = %s,
                    expiry_date = %s
                WHERE inventory_id = %s
                """,
                (
                    new_quantity,
                    new_expected,
                    new_actual,
                    payload.reorder_level,
                    date.today(),
                    payload.reason_adjustment,
                    payload.serial_start,
                    payload.serial_end,
                    payload.expiry_date,
                    inventory_id
                ),
            )
            
            # Inventory reference removed from pos_management as table is dropped
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "UPDATE_INVENTORY",
                    "inventory",
                    inventory_id,
                    f"Updated inventory item: {payload.product_name} (Current Qty: {new_quantity})"
                )

            conn.commit()
            return _get_inventory_item(cur, inventory_id)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{inventory_id}/")
def delete_inventory_item(
    inventory_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            cur.execute("UPDATE inventory SET status = 'Archived' WHERE inventory_id = %s AND status = 'Active' RETURNING inventory_id", (inventory_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Active inventory item not found")
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "ARCHIVE_INVENTORY",
                    "inventory",
                    inventory_id,
                    f"Archived inventory item ID: {inventory_id}"
                )
            
            conn.commit()
            return {"message": "Inventory item archived"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/low-stock-count/")
def get_low_stock_count():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) <= 0 AND p.status != 'Archived') AS critical_count,
                    COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) > 0 AND COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10) AND p.status != 'Archived') AS low_count,
                    COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10) AND p.status != 'Archived') AS total_low_stock
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                """
            )
            row = cur.fetchone()
            return {
                "critical_count": row["critical_count"],
                "low_count": row["low_count"],
                "total_low_stock": row["total_low_stock"]
            }
    except Exception as e:
        logger.error(f"Error fetching low stock count: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/{inventory_id}/trace/")
def get_inventory_trace(inventory_id: int):
    """
    Traceability ledger for this inventory item (PO pending/received, returns, etc.).
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    event_id,
                    created_at,
                    event_type,
                    reference_type,
                    reference_id,
                    reason,
                    quantity_before,
                    quantity_after,
                    expected_before,
                    expected_after,
                    actual_before,
                    actual_after,
                    quantity_delta,
                    expected_delta,
                    actual_delta,
                    difference_before,
                    difference_after
                FROM inventory_stock_events
                WHERE inventory_id = %s
                ORDER BY created_at DESC, event_id DESC
                """,
                (inventory_id,),
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error(f"Error fetching inventory trace: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/{inventory_id}/discrepancy/")
def add_inventory_discrepancy(
    inventory_id: int, 
    payload: InventoryDiscrepancyRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """
    Manual discrepancy entry from inventory trace modal.
    Applies quantity_change to both quantity and actual, logs an audit event.
    """
    conn = get_connection()
    try:
        if not payload.reason or not payload.reason.strip():
            raise HTTPException(status_code=400, detail="Reason is required.")
        if payload.quantity_change == 0:
            raise HTTPException(status_code=400, detail="Quantity change cannot be zero.")

        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    inventory_id,
                    product_id,
                    quantity,
                    expected,
                    actual
                FROM inventory
                WHERE inventory_id = %s
                FOR UPDATE
                """,
                (inventory_id,),
            )
            inv = cur.fetchone()
            if not inv:
                raise HTTPException(status_code=404, detail="Inventory item not found")

            qty_delta = payload.quantity_change
            quantity_before = inv["quantity"]
            expected_before = inv["expected"]
            actual_before = inv["actual"]

            quantity_after = quantity_before + qty_delta
            expected_after = expected_before
            actual_after = actual_before + qty_delta

            if quantity_after < 0 or actual_after < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Discrepancy cannot reduce stock below zero.",
                )

            difference_before = actual_before - expected_before
            difference_after = actual_after - expected_before # Expected doesn't change on manual adjustment

            cur.execute(
                """
                UPDATE inventory
                SET quantity = %s,
                    actual = %s,
                    last_updated = %s,
                    reason_adjustment = %s
                WHERE inventory_id = %s
                """,
                (quantity_after, actual_after, date.today(), payload.reason.strip(), inventory_id),
            )

            cur.execute(
                """
                INSERT INTO inventory_stock_events (
                    inventory_id,
                    product_id,
                    event_type,
                    quantity_before,
                    quantity_after,
                    expected_before,
                    expected_after,
                    actual_before,
                    actual_after,
                    quantity_delta,
                    expected_delta,
                    actual_delta,
                    difference_before,
                    difference_after,
                    reference_type,
                    reference_id,
                    reason
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    inv["inventory_id"],
                    inv["product_id"],
                    "MANUAL_DISCREPANCY",
                    quantity_before,
                    quantity_after,
                    expected_before,
                    expected_after,
                    actual_before,
                    actual_after,
                    quantity_after - quantity_before,
                    expected_after - expected_before,
                    actual_after - actual_before,
                    int(difference_before),
                    int(difference_after),
                    "inventory",
                    str(inventory_id),
                    payload.reason.strip(),
                ),
            )

            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "ADJUST_INVENTORY",
                    "inventory",
                    inventory_id,
                    f"Manual discrepancy adjustment: {qty_delta:+d} units. Reason: {payload.reason.strip()}"
                )

            # --- Notifications ---
            dispatch_notification(
                type="stock_movement",
                title="Stock Adjusted",
                message=f"Manual discrepancy adjustment of {qty_delta:+d} units. Reason: {payload.reason.strip()}",
                link=f"/inventory?id={inventory_id}",
                target_roles=["Administrator", "Manager"]
            )
            
            if actual_after <= 0:
                dispatch_notification(
                    type="out_of_stock",
                    title="Out of Stock Alert",
                    message=f"Inventory item ID {inventory_id} has reached 0 or less stock.",
                    link=f"/inventory?id={inventory_id}",
                    target_roles=["Administrator", "Manager"]
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
