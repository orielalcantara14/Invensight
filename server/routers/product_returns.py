from fastapi import APIRouter, HTTPException, Header
from database import get_connection
from models import CreateProductReturnRequest
import psycopg2.extras
from datetime import date, datetime
from typing import Optional
import logging

logger = logging.getLogger("invensight.product_returns")
from utils.audit import add_audit_log
router = APIRouter()


def _serialize_datetime_fields(row: dict) -> dict:
    """Normalize datetime fields to ISO strings for the frontend."""
    for key in ("created_at", "approved_at", "rejected_at"):
        if key in row and isinstance(row[key], datetime):
            row[key] = row[key].isoformat()
    return row


@router.get("/")
def get_product_returns(start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            query = """
                SELECT
                    pr.return_id,
                    pr.supplier_id,
                    s.supplier_name,
                    pr.status,
                    pr.created_at,
                    pr.approved_at,
                    pr.rejected_at,
                    pr.reason,
                    COALESCE(SUM(pri.quantity), 0) AS total_quantity
                FROM product_returns pr
                LEFT JOIN product_return_items pri ON pri.return_id = pr.return_id
                LEFT JOIN supplier s ON pr.supplier_id = s.supplier_id
                WHERE pr.status != 'Archived'
            """
            params = []
            if start_date:
                query += " AND pr.created_at >= %s"
                params.append(start_date)
            if end_date:
                query += " AND pr.created_at <= %s::timestamp + interval '1 day' - interval '1 second'"
                params.append(end_date)
            
            query += """
                GROUP BY
                    pr.return_id,
                    pr.supplier_id,
                    s.supplier_name,
                    pr.status,
                    pr.created_at,
                    pr.approved_at,
                    pr.rejected_at,
                    pr.reason
                ORDER BY pr.created_at DESC
            """
            
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            return [_serialize_datetime_fields(dict(row)) for row in rows]
    except Exception as e:
        logger.error("Error fetching product returns", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/{return_id}")
def get_product_return(return_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    pr.return_id,
                    pr.supplier_id,
                    s.supplier_name,
                    pr.status,
                    pr.created_at,
                    pr.approved_at,
                    pr.rejected_at,
                    pr.reason
                FROM product_returns pr
                LEFT JOIN supplier s ON pr.supplier_id = s.supplier_id
                WHERE pr.return_id = %s
                """,
                (return_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Product return not found")

            cur.execute(
                """
                SELECT
                    pri.item_id,
                    pri.product_id,
                    p.product_name,
                    pri.quantity
                FROM product_return_items pri
                LEFT JOIN products p ON pri.product_id = p.product_id
                WHERE pri.return_id = %s
                ORDER BY pri.item_id
                """,
                (return_id,),
            )
            items = [dict(r) for r in cur.fetchall()]
            total_quantity = sum(i["quantity"] for i in items)

            result = _serialize_datetime_fields(dict(row))
            result["items"] = items
            result["total_quantity"] = total_quantity
            return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching product return detail", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/")
def create_product_return(
    payload: CreateProductReturnRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Return items are required")

    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT supplier_id FROM supplier WHERE supplier_id = %s", (payload.supplier_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Supplier not found")

            for item in payload.items:
                if item.quantity <= 0:
                    raise HTTPException(status_code=400, detail="Return quantity must be greater than 0")

            cur.execute(
                """
                INSERT INTO product_returns (supplier_id, status, reason)
                VALUES (%s, 'Pending', %s)
                RETURNING return_id
                """,
                (payload.supplier_id, payload.reason or ""),
            )
            return_row = cur.fetchone()
            return_id = return_row["return_id"]

            today = date.today()
            reason = (payload.reason or "").strip() or f"Product return #{return_id}"
            reference_type = "product_returns"

            # Allocate the return against Expected + Actual (sellable), but do not touch physical Quantity yet.
            for item in payload.items:
                cur.execute(
                    """
                    SELECT
                        inventory_id,
                        quantity,
                        expected,
                        actual
                    FROM inventory
                    WHERE product_id = %s
                    FOR UPDATE
                    """,
                    (item.product_id,),
                )
                inv = cur.fetchone()
                if not inv:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product ID {item.product_id} not found in inventory",
                    )

                quantity_before = inv["quantity"]
                expected_before = inv["expected"]
                actual_before = inv["actual"]

                if actual_before < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Cannot allocate return for product ID {item.product_id}. "
                            f"Available (Actual): {actual_before}, Requested: {item.quantity}"
                        ),
                    )

                if expected_before < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Cannot allocate return for product ID {item.product_id}. "
                            f"Available (Expected): {expected_before}, Requested: {item.quantity}"
                        ),
                    )

                quantity_after = quantity_before
                expected_after = expected_before - item.quantity
                actual_after = actual_before - item.quantity

                difference_before = (2 * actual_before) - quantity_before - expected_before
                difference_after = (2 * actual_after) - quantity_after - expected_after

                cur.execute(
                    """
                    UPDATE inventory
                    SET
                        expected = expected - %s,
                        actual = actual - %s,
                        last_updated = %s,
                        reason_adjustment = %s
                    WHERE product_id = %s
                    """,
                    (item.quantity, item.quantity, today, f"Return allocated: {reason}", item.product_id),
                )

                cur.execute(
                    """
                    INSERT INTO product_return_items (return_id, product_id, quantity)
                    VALUES (%s, %s, %s)
                    """,
                    (return_id, item.product_id, item.quantity),
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
                        item.product_id,
                        "RETURN_ALLOCATED",
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
                        reference_type,
                        str(return_id),
                        reason,
                    ),
                )

            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "CREATE_RETURN",
                    "return",
                    return_id,
                    f"Created product return #{return_id} (Supplier ID: {payload.supplier_id})"
                )

            conn.commit()
            return {"ok": True, "return_id": return_id}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/{return_id}/approve")
def approve_product_return(
    return_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT return_id, status
                FROM product_returns
                WHERE return_id = %s
                FOR UPDATE
                """,
                (return_id,),
            )
            return_row = cur.fetchone()
            if not return_row:
                raise HTTPException(status_code=404, detail="Product return not found")

            if return_row["status"] != "Pending":
                raise HTTPException(status_code=400, detail="Only Pending returns can be approved")

            cur.execute("SELECT product_id, quantity FROM product_return_items WHERE return_id = %s", (return_id,))
            items = cur.fetchall()

            today = date.today()
            reference_type = "product_returns"
            for item in items:
                cur.execute(
                    """
                    SELECT
                        inventory_id,
                        quantity,
                        expected,
                        actual
                    FROM inventory
                    WHERE product_id = %s
                    FOR UPDATE
                    """,
                    (item["product_id"],),
                )
                inv = cur.fetchone()
                if not inv:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product ID {item['product_id']} not found in inventory",
                    )

                quantity_before = inv["quantity"]
                expected_before = inv["expected"]
                actual_before = inv["actual"]

                if quantity_before < item["quantity"]:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Cannot remove returned quantity for product ID {item['product_id']}. "
                            f"Available (Quantity): {quantity_before}, Requested: {item['quantity']}"
                        ),
                    )

                quantity_after = quantity_before - item["quantity"]
                expected_after = expected_before
                actual_after = actual_before

                difference_before = (2 * actual_before) - quantity_before - expected_before
                difference_after = (2 * actual_after) - quantity_after - expected_after

                cur.execute(
                    """
                    UPDATE inventory
                    SET
                        quantity = quantity - %s,
                        last_updated = %s,
                        reason_adjustment = %s
                    WHERE product_id = %s
                    """,
                    (item["quantity"], today, f"Return removed: #{return_id}", item["product_id"]),
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
                        item["product_id"],
                        "RETURN_APPROVED",
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
                        reference_type,
                        str(return_id),
                        "",
                    ),
                )

            cur.execute(
                """
                UPDATE product_returns
                SET status = 'Approved', approved_at = CURRENT_TIMESTAMP
                WHERE return_id = %s
                """,
                (return_id,),
            )

            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "APPROVE_RETURN",
                    "return",
                    return_id,
                    f"Approved product return #{return_id}"
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


@router.put("/{return_id}/reject")
def reject_product_return(
    return_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT return_id, status
                FROM product_returns
                WHERE return_id = %s
                FOR UPDATE
                """,
                (return_id,),
            )
            return_row = cur.fetchone()
            if not return_row:
                raise HTTPException(status_code=404, detail="Product return not found")

            if return_row["status"] != "Pending":
                raise HTTPException(status_code=400, detail="Only Pending returns can be rejected")

            cur.execute("SELECT product_id, quantity FROM product_return_items WHERE return_id = %s", (return_id,))
            items = cur.fetchall()

            today = date.today()
            reference_type = "product_returns"
            # Release the allocation back to Expected + Actual (sellable), but keep physical Quantity unchanged.
            for item in items:
                cur.execute(
                    """
                    SELECT
                        inventory_id,
                        quantity,
                        expected,
                        actual
                    FROM inventory
                    WHERE product_id = %s
                    FOR UPDATE
                    """,
                    (item["product_id"],),
                )
                inv = cur.fetchone()
                if not inv:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product ID {item['product_id']} not found in inventory",
                    )

                quantity_before = inv["quantity"]
                expected_before = inv["expected"]
                actual_before = inv["actual"]

                cur.execute(
                    """
                    UPDATE inventory
                    SET
                        expected = expected + %s,
                        actual = actual + %s,
                        last_updated = %s,
                        reason_adjustment = %s
                    WHERE product_id = %s
                    """,
                    (item["quantity"], item["quantity"], today, f"Return rejected: #{return_id}", item["product_id"]),
                )

                quantity_after = quantity_before
                expected_after = expected_before + item["quantity"]
                actual_after = actual_before + item["quantity"]

                difference_before = (2 * actual_before) - quantity_before - expected_before
                difference_after = (2 * actual_after) - quantity_after - expected_after

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
                        item["product_id"],
                        "RETURN_REJECTED",
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
                        reference_type,
                        str(return_id),
                        "",
                    ),
                )

            cur.execute(
                """
                UPDATE product_returns
                SET status = 'Rejected', rejected_at = CURRENT_TIMESTAMP
                WHERE return_id = %s
                """,
                (return_id,),
            )

            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "REJECT_RETURN",
                    "return",
                    return_id,
                    f"Rejected product return #{return_id}"
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


@router.put("/{return_id}/archive")
def archive_product_return(
    return_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Archive an approved or rejected product return."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT return_id, status FROM product_returns WHERE return_id = %s",
                (return_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Product return not found")
            if row["status"] == "Pending":
                raise HTTPException(status_code=400, detail="Cannot archive a pending return.")
            if row["status"] == "Archived":
                raise HTTPException(status_code=400, detail="Return is already archived")
            
            cur.execute(
                "UPDATE product_returns SET status = 'Archived' WHERE return_id = %s",
                (return_id,),
            )
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "ARCHIVE_RETURN",
                    "return",
                    return_id,
                    f"Archived product return #{return_id}"
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
