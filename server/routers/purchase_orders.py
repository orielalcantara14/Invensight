from fastapi import APIRouter, HTTPException, Header
from database import get_connection
from models import (
    CreatePurchaseOrderRequest, 
    PurchaseOrderResponse, 
    PurchaseOrderItemResponse,
    MarkOrderReceivedRequest
)
import psycopg2.extras
from utils.audit import add_audit_log
from routers.notifications import dispatch_notification
from datetime import date, datetime, timedelta
from typing import Optional
import random
import string
import logging

logger = logging.getLogger("invensight.purchase_orders")

router = APIRouter()

def _invalidate_analytics_cache(cur):
    """
    Marks the analytics cache as stale and clears the payload
    so that the next request will re-calculate based on new stock.
    """
    cur.execute(
        "UPDATE analytics_model_cache SET status = 'stale', payload = '{}'::jsonb WHERE model_key = 'stock_prediction'"
    )

@router.get("/upcoming-deliveries")
def get_upcoming_deliveries():
    conn = get_connection()
    try:
        tomorrow = date.today() + timedelta(days=1)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    po.order_id,
                    po.supplier_id,
                    s.supplier_name,
                    po.expected_delivery,
                    po.total_items,
                    po.notes
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                WHERE po.status = 'Pending' AND po.expected_delivery = %s
                ORDER BY po.expected_delivery ASC
            """, (tomorrow,))
            rows = cur.fetchall()
            result = []
            for row in rows:
                order = dict(row)
                if isinstance(order.get("expected_delivery"), date):
                    order["expected_delivery"] = order["expected_delivery"].isoformat()
                result.append(order)
            return {"deliveries": result, "count": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


def _generate_order_id():
    chars = string.ascii_uppercase + string.digits
    return "PO-" + "".join(random.choices(chars, k=8))


@router.get("/", response_model=list)
def get_purchase_orders(start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            query = """
                SELECT 
                    po.order_id,
                    po.supplier_id,
                    s.supplier_name,
                    po.user_id,
                    po.status,
                    po.expected_delivery,
                    po.created_at,
                    po.received_at,
                    po.total_items,
                    po.notes,
                    po.receipt_number
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                WHERE po.status != 'Archived'
            """
            params = []
            if start_date:
                query += " AND po.created_at >= %s"
                params.append(start_date)
            if end_date:
                query += " AND po.created_at <= %s::timestamp + interval '1 day' - interval '1 second'"
                params.append(end_date)
                
            query += " ORDER BY po.created_at DESC"
            
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            result = []
            for row in rows:
                order = dict(row)
                if isinstance(order.get("created_at"), datetime):
                    order["created_at"] = order["created_at"].isoformat()
                if isinstance(order.get("received_at"), datetime):
                    order["received_at"] = order["received_at"].isoformat()
                if isinstance(order.get("expected_delivery"), date):
                    order["expected_delivery"] = order["expected_delivery"].isoformat()
                result.append(order)
            return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/{order_id}")
def get_purchase_order(order_id: str):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    po.order_id,
                    po.supplier_id,
                    s.supplier_name,
                    po.user_id,
                    po.status,
                    po.expected_delivery,
                    po.created_at,
                    po.received_at,
                    po.total_items,
                    po.notes,
                    po.receipt_number
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                WHERE po.order_id = %s
            """, (order_id,))
            order_row = cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=404, detail="Purchase order not found")

            order = dict(order_row)
            if isinstance(order.get("created_at"), datetime):
                order["created_at"] = order["created_at"].isoformat()
            if isinstance(order.get("received_at"), datetime):
                order["received_at"] = order["received_at"].isoformat()
            if isinstance(order.get("expected_delivery"), date):
                order["expected_delivery"] = order["expected_delivery"].isoformat()

            cur.execute("""
                SELECT 
                    poi.item_id,
                    poi.product_id,
                    p.product_name,
                    poi.quantity,
                    poi.unit_price,
                    poi.damage_count
                FROM purchase_order_items poi
                LEFT JOIN products p ON poi.product_id = p.product_id
                WHERE poi.order_id = %s
            """, (order_id,))
            items = [dict(row) for row in cur.fetchall()]
            order["items"] = items

            return order
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/")
def create_purchase_order(
    payload: CreatePurchaseOrderRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT supplier_id, supplier_name, status FROM supplier WHERE supplier_id = %s",
                (payload.supplier_id,),
            )
            supplier_row = cur.fetchone()
            if not supplier_row:
                raise HTTPException(status_code=404, detail="Supplier not found")
            if (supplier_row.get("status") or "").strip().lower() == "inactive":
                raise HTTPException(status_code=400, detail="This supplier is currently inactive.")

            for item in payload.items:
                cur.execute("""
                    SELECT 
                        p.product_id, 
                        p.product_name, 
                        p.status,
                        CAST(p.unit_price AS FLOAT) as unit_price,
                        COALESCE(i.reorder_level, 5) AS reorder_level
                    FROM products p
                    LEFT JOIN inventory i ON p.product_id = i.product_id
                    WHERE p.product_id = %s
                """, (item.product_id,))
                product_row = cur.fetchone()
                if not product_row:
                    raise HTTPException(status_code=400, detail=f"Product ID {item.product_id} not found in inventory")
                if (product_row.get("status") or "").strip().lower() == "archived":
                    raise HTTPException(status_code=400, detail=f"Product '{product_row['product_name']}' is archived and cannot be added to purchase orders.")
                
                reorder_level = product_row["reorder_level"]
                if item.quantity < reorder_level:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Order quantity for {product_row['product_name']} must be at least {reorder_level} (reorder level)"
                    )
                
                if item.unit_price is not None and product_row["unit_price"] is not None:
                    if abs(item.unit_price - product_row["unit_price"]) > 0.01:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Unit price for {product_row['product_name']} must be {product_row['unit_price']}"
                        )

            order_id = _generate_order_id()
            total_items = sum(item.quantity for item in payload.items)
            today = date.today()
            reference_type = "purchase_orders"

            cur.execute("""
                INSERT INTO purchase_orders (order_id, supplier_id, user_id, status, expected_delivery, total_items, notes)
                VALUES (%s, %s, NULL, 'Pending', %s, %s, %s) RETURNING *
            """, (order_id, payload.supplier_id, payload.expected_delivery, total_items, payload.notes))
            cur.fetchone()

            for item in payload.items:
                cur.execute("""
                    INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price)
                    VALUES (%s, %s, %s, %s)
                """, (order_id, item.product_id, item.quantity, item.unit_price))

            cur.execute("""
                UPDATE supplier
                SET total_orders = total_orders + 1
                WHERE supplier_id = %s
            """, (payload.supplier_id,))

            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "CREATE_ORDER",
                    "order",
                    0,
                    f"Created purchase order: {order_id} (Supplier ID: {payload.supplier_id})"
                )

            conn.commit()
            return {"ok": True, "order_id": order_id}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/{order_id}/receive")
def mark_order_as_received(
    order_id: str,
    payload: MarkOrderReceivedRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT po.order_id, po.supplier_id, s.supplier_name, po.status 
                FROM purchase_orders po
                JOIN supplier s ON po.supplier_id = s.supplier_id
                WHERE po.order_id = %s
            """, (order_id,))
            order_row = cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=404, detail="Purchase order not found")
            if order_row["status"] == "Received":
                raise HTTPException(status_code=400, detail="Order is already received")

            # Create a lookup for damage counts from payload
            damage_lookup = {item.product_id: item.damage_count for item in payload.items}
            damage_map = {} # Track damages for auto-return

            cur.execute("""
                SELECT product_id, quantity FROM purchase_order_items WHERE order_id = %s
            """, (order_id,))
            items = cur.fetchall()

            for item in items:
                pid = item["product_id"]
                ordered_qty = item["quantity"]
                item_damage = damage_lookup.get(pid, 0)
                net_qty = ordered_qty - item_damage
                
                # Update item record with damage count
                cur.execute("""
                    UPDATE purchase_order_items 
                    SET damage_count = %s 
                    WHERE order_id = %s AND product_id = %s
                """, (item_damage, order_id, pid))
                damage_map[pid] = item_damage

                # Update Inventory Stock
                cur.execute("""
                    SELECT inventory_id, quantity, expected, actual
                    FROM inventory WHERE product_id = %s FOR UPDATE
                """, (pid,))
                inv_row = cur.fetchone()
                if not inv_row:
                    raise HTTPException(status_code=400, detail=f"Product ID {pid} not found in inventory")

                quantity_before = inv_row["quantity"]
                expected_before = inv_row["expected"]
                actual_before = inv_row["actual"]
                
                # Only add net_qty (good items) to all inventory counts
                quantity_after = quantity_before + net_qty
                expected_after = expected_before + net_qty
                actual_after = actual_before + net_qty

                difference_before = actual_before - expected_before
                difference_after = actual_after - expected_after

                cur.execute("""
                    UPDATE inventory
                    SET quantity = %s,
                        expected = %s,
                        actual = %s,
                        last_updated = %s
                    WHERE product_id = %s
                """, (quantity_after, expected_after, actual_after, date.today(), pid))

                cur.execute(
                    """
                    INSERT INTO inventory_stock_events (
                        inventory_id, product_id, event_type,
                        quantity_before, quantity_after,
                        expected_before, expected_after,
                        actual_before, actual_after,
                        quantity_delta, expected_delta, actual_delta,
                        difference_before, difference_after,
                        reference_type, reference_id, reason
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        inv_row["inventory_id"], pid, "PO_RECEIVED",
                        quantity_before, quantity_after,
                        expected_before, expected_after,
                        actual_before, actual_after,
                        net_qty, net_qty, net_qty,
                        int(difference_before), int(difference_after),
                        "purchase_orders", order_id, f"Received {net_qty} good items (Damages: {item_damage})"
                    ),
                )

            # --- 2. Handle Automated Damages Return ---
            # Group damaged items for a single return record
            damaged_items = [
                {"product_id": pid, "quantity": item_damage}
                for pid, item_damage in damage_map.items()
                if item_damage > 0
            ]

            if damaged_items:
                cur.execute(
                    """
                    INSERT INTO product_returns (supplier_id, status, reason, bypass_inventory)
                    VALUES (%s, 'Pending', %s, TRUE)
                    RETURNING return_id
                    """,
                    (order_row["supplier_id"], f"Damaged on arrival (PO {order_id})")
                )
                new_return_id = cur.fetchone()["return_id"]

                for di in damaged_items:
                    cur.execute(
                        "INSERT INTO product_return_items (return_id, product_id, quantity) VALUES (%s, %s, %s)",
                        (new_return_id, di["product_id"], di["quantity"])
                    )

                logger.info(f"Auto-generated product return #{new_return_id} for damages in PO {order_id}")

            # Update Order Status
            cur.execute("""
                UPDATE purchase_orders
                SET status = 'Received', 
                    received_at = CURRENT_TIMESTAMP,
                    receipt_number = %s,
                    notes = %s
                WHERE order_id = %s
            """, (payload.receipt_number, payload.notes or order_row.get("notes"), order_id))

            cur.execute("""
                UPDATE supplier
                SET completed_orders = completed_orders + 1
                WHERE supplier_id = %s
            """, (order_row["supplier_id"],))

            # Notification and Audit Log
            dispatch_notification(
                type="order_completed",
                title="Purchase Order Received",
                message=f"Purchase order {order_id} received. Receipt: {payload.receipt_number}",
                link=f"/orders?id={order_id}",
                target_roles=["Administrator", "Manager"]
            )

            if x_actor_user_id:
                add_audit_log(
                    cur, int(x_actor_user_id), "RECEIVE_ORDER", "order", 0,
                    f"Received PO: {order_id} (Receipt: {payload.receipt_number})"
                )

            _invalidate_analytics_cache(cur)
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


@router.delete("/{order_id}")
def delete_purchase_order(
    order_id: str,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT order_id, status FROM purchase_orders WHERE order_id = %s
            """, (order_id,))
            order_row = cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=404, detail="Purchase order not found")
            if order_row["status"] == "Received":
                raise HTTPException(status_code=400, detail="Cannot delete a received order")

            # Since Pending orders no longer affect inventory stocks, we just archive the order record.
            cur.execute("UPDATE purchase_orders SET status = 'Archived' WHERE order_id = %s", (order_id,))

            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "ARCHIVE_ORDER",
                    "order",
                    0,
                    f"Archived purchase order: {order_id}"
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


@router.put("/{order_id}/archive")
def archive_purchase_order(
    order_id: str,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Archive a received or cancelled purchase order (soft archive)."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT order_id, status FROM purchase_orders WHERE order_id = %s",
                (order_id,),
            )
            order_row = cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=404, detail="Purchase order not found")
            if order_row["status"] == "Pending":
                raise HTTPException(status_code=400, detail="Cannot archive a pending order. Delete it instead.")
            if order_row["status"] == "Archived":
                raise HTTPException(status_code=400, detail="Order is already archived")
            
            cur.execute(
                "UPDATE purchase_orders SET status = 'Archived' WHERE order_id = %s",
                (order_id,),
            )
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "ARCHIVE_ORDER",
                    "order",
                    0,
                    f"Archived purchase order: {order_id}"
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
