from fastapi import APIRouter, HTTPException
from database import get_connection
from models import InventoryResponse, CreateInventoryRequest, UpdateInventoryRequest, InventoryDiscrepancyRequest
import psycopg2.extras
from datetime import date
import logging
import re
from utils import build_sku

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
            (
                (2 * COALESCE(i.actual, 0)) - COALESCE(i.quantity, 0) - COALESCE(i.expected, 0)
            )::int AS difference,
            COALESCE(i.reorder_level, 10) AS reorder_level,
            COALESCE(p.unit_price::float, 0.0) AS unit_price,
            CASE
                WHEN COALESCE(i.actual, 0) = 0 THEN 'Out of Stock'
                WHEN COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10) THEN 'Low'
                ELSE 'Normal'
            END AS status,
            COALESCE(i.last_updated::text, '') AS last_updated,
            COALESCE(i.reason_adjustment, '') AS reason_adjustment
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
        WHERE i.inventory_id = %s
        """,
        (inventory_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return dict(row)

@router.get("/")
def get_inventory():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
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
                    (
                        (2 * COALESCE(i.actual, 0)) - COALESCE(i.quantity, 0) - COALESCE(i.expected, 0)
                    )::int AS difference,
                    COALESCE(i.reorder_level, 10) AS reorder_level,
                    COALESCE(p.unit_price::float, 0.0) AS unit_price,
                    CASE
                    WHEN COALESCE(i.actual, 0) = 0 THEN 'Out of Stock'
                    WHEN COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10) THEN 'Low'
                        ELSE 'Normal'
                    END AS status,
                    COALESCE(i.last_updated::text, '') AS last_updated,
                    COALESCE(i.reason_adjustment, '') AS reason_adjustment
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                WHERE p.status != 'Archived'
                ORDER BY p.product_name
                """
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error(f"Error fetching inventory: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/")
def add_inventory_item(payload: CreateInventoryRequest):
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
                        specific_category = %s, unit_of_measurement = %s
                    WHERE product_id = %s
                    """,
                    (payload.product_name, supplier_id, payload.category_id, 
                     payload.specific_category, payload.unit_of_measurement, product_id)
                )
            else:
                cur.execute("SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products")
                product_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO products (
                        product_id, product_name, sku, supplier_id, category_id, 
                        specific_category, unit_of_measurement, date_added
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (product_id, payload.product_name, sku, supplier_id, payload.category_id,
                     payload.specific_category, payload.unit_of_measurement, date.today())
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
                    inventory_id, product_id, quantity, expected, actual, reorder_level, last_updated, reason_adjustment
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    inventory_id,
                    product_id,
                    payload.quantity,
                    payload.expected, # Use expected from payload
                    payload.quantity, # actual = quantity on creation
                    payload.reorder_level,
                    date.today(),
                    "Initial stock"
                ),
            )
            
            # Inventory reference removed from pos_management as table is dropped
            
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
def update_inventory_item(inventory_id: int, payload: UpdateInventoryRequest):
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
            
            cur.execute("SELECT quantity FROM inventory WHERE inventory_id = %s", (inventory_id,))
            current_quantity = cur.fetchone()["quantity"]
            
            new_quantity = payload.quantity
            if payload.actual != current_quantity and payload.reason_adjustment:
                # A physical count was performed and a reason was given.
                # Update the live quantity to match the actual count.
                new_quantity = payload.actual

            cur.execute(
                """
                UPDATE inventory SET 
                    quantity = %s, 
                    expected = %s,
                    actual = %s,
                    reorder_level = %s, 
                    last_updated = %s,
                    reason_adjustment = %s
                WHERE inventory_id = %s
                """,
                (
                    new_quantity,
                    payload.expected, # Update expected with the provided value
                    payload.actual,   # Update actual with the provided value
                    payload.reorder_level,
                    date.today(),
                    payload.reason_adjustment,
                    inventory_id
                ),
            )
            
            # Inventory reference removed from pos_management as table is dropped
            
            conn.commit()
            return _get_inventory_item(cur, inventory_id)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{inventory_id}/")
def delete_inventory_item(inventory_id: int):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            cur.execute("DELETE FROM inventory WHERE inventory_id = %s", (inventory_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Inventory item not found")
            
            conn.commit()
            return {"message": "Inventory item deleted"}
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
                    COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) <= 0) AS critical_count,
                    COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) > 0 AND COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10)) AS low_count,
                    COUNT(*) FILTER (WHERE COALESCE(i.actual, 0) <= COALESCE(i.reorder_level, 10)) AS total_low_stock
                FROM inventory i
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
def add_inventory_discrepancy(inventory_id: int, payload: InventoryDiscrepancyRequest):
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

            difference_before = (2 * actual_before) - quantity_before - expected_before
            difference_after = (2 * actual_after) - quantity_after - expected_after

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
