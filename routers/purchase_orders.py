from fastapi import APIRouter, HTTPException, Header
from database import get_connection
from models import (
    CreatePurchaseOrderRequest, 
    CreateReplacementPurchaseOrderRequest,
    PurchaseOrderResponse, 
    PurchaseOrderItemResponse,
    MarkOrderReceivedRequest,
    MarkOrderNotReceivedRequest
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
    Marks the analytics cache as stale so that the next request will re-calculate based on new stock.
    """
    cur.execute(
        "UPDATE analytics_model_cache SET status = 'stale' WHERE model_key = 'stock_prediction'"
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


def _generate_order_id(cur):
    try:
        cur.execute("""
            SELECT order_id FROM purchase_orders 
            WHERE order_id ~ '^PO-[0-9]+$'
            ORDER BY CAST(SUBSTRING(order_id FROM 4) AS INTEGER) DESC 
            LIMIT 1
        """)
        row = cur.fetchone()
        if row and row.get("order_id"):
            num = int(row["order_id"].split("-")[1])
            return f"PO-{num + 1:06d}"
    except Exception:
        pass
    
    try:
        cur.execute("SELECT COUNT(*) AS total FROM purchase_orders")
        row = cur.fetchone()
        total = row["total"] if row else 0
        return f"PO-{total + 1:06d}"
    except Exception:
        chars = string.ascii_uppercase + string.digits
        return "PO-" + "".join(random.choices(chars, k=6))


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
                    po.receipt_number,
                    po.reference_po_id,
                    po.replaced_by_po_id,
                    po.replacement_reason,
                    po.replacement_type,
                    po.voided_at,
                    po.voided_by_user_id,
                    po.void_reason,
                    COALESCE(po.voided_by_name, u_void.full_name, u_void.username, 'Administrator') AS voided_by_name
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                LEFT JOIN users u_void ON po.voided_by_user_id = u_void.user_id
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

            # Fast parent lookup to trace origin PO and chain
            cur.execute("SELECT order_id, reference_po_id, replaced_by_po_id, status FROM purchase_orders")
            all_po_nodes = {r["order_id"]: r for r in cur.fetchall()}

            def trace_lineage(oid):
                curr = oid
                visited = {curr}
                chain = []
                while curr in all_po_nodes and all_po_nodes[curr].get("reference_po_id"):
                    ref = all_po_nodes[curr]["reference_po_id"]
                    if not ref or ref in visited:
                        break
                    visited.add(ref)
                    chain.append(ref)
                    curr = ref
                origin = chain[-1] if chain else None
                return origin, list(reversed(chain))

            result = []
            for row in rows:
                order = dict(row)
                if isinstance(order.get("created_at"), datetime):
                    order["created_at"] = order["created_at"].isoformat()
                if isinstance(order.get("received_at"), datetime):
                    order["received_at"] = order["received_at"].isoformat()
                if isinstance(order.get("voided_at"), datetime):
                    order["voided_at"] = order["voided_at"].isoformat()
                if isinstance(order.get("expected_delivery"), date):
                    order["expected_delivery"] = order["expected_delivery"].isoformat()
                
                origin_id, lineage = trace_lineage(order["order_id"])
                order["origin_po_id"] = origin_id
                order["origin_chain_ids"] = lineage
                order["replacement_depth"] = len(lineage)
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
                    po.receipt_number,
                    po.reference_po_id,
                    po.replaced_by_po_id,
                    po.replacement_reason,
                    po.replacement_type,
                    po.voided_at,
                    po.voided_by_user_id,
                    po.void_reason,
                    COALESCE(u_void.full_name, u_void.username, 'Administrator') AS voided_by_name
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                LEFT JOIN users u_void ON po.voided_by_user_id = u_void.user_id
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
            if isinstance(order.get("voided_at"), datetime):
                order["voided_at"] = order["voided_at"].isoformat()
            if isinstance(order.get("expected_delivery"), date):
                order["expected_delivery"] = order["expected_delivery"].isoformat()

            # Trace ancestors (Backwards chain from root origin down to immediate parent)
            chain_backwards = []
            curr_ref = order.get("reference_po_id")
            visited_back = {order_id}
            while curr_ref and curr_ref not in visited_back:
                visited_back.add(curr_ref)
                cur.execute("""
                    SELECT po.order_id, po.status, po.created_at, po.voided_at, po.void_reason,
                           po.replacement_reason, po.replacement_type, po.reference_po_id,
                           po.replaced_by_po_id, po.total_items,
                           COALESCE(u.full_name, u.username, 'User') as created_by_name,
                           COALESCE(uv.full_name, uv.username, 'Administrator') as voided_by_name
                    FROM purchase_orders po
                    LEFT JOIN users u ON po.user_id = u.user_id
                    LEFT JOIN users uv ON po.voided_by_user_id = uv.user_id
                    WHERE po.order_id = %s
                """, (curr_ref,))
                parent_row = cur.fetchone()
                if not parent_row:
                    break
                p_dict = dict(parent_row)
                if isinstance(p_dict.get("created_at"), datetime):
                    p_dict["created_at"] = p_dict["created_at"].isoformat()
                if isinstance(p_dict.get("voided_at"), datetime):
                    p_dict["voided_at"] = p_dict["voided_at"].isoformat()
                chain_backwards.append(p_dict)
                curr_ref = p_dict.get("reference_po_id")

            origin_chain = list(reversed(chain_backwards))
            order["origin_chain"] = origin_chain
            order["origin_po_id"] = origin_chain[0]["order_id"] if origin_chain else None

            # Trace descendants (Forwards chain if this order was replaced by newer ones)
            chain_forwards = []
            curr_fwd = order.get("replaced_by_po_id")
            visited_fwd = {order_id}
            while curr_fwd and curr_fwd not in visited_fwd:
                visited_fwd.add(curr_fwd)
                cur.execute("""
                    SELECT po.order_id, po.status, po.created_at, po.voided_at, po.void_reason,
                           po.replacement_reason, po.replacement_type, po.replaced_by_po_id,
                           po.total_items,
                           COALESCE(u.full_name, u.username, 'User') as created_by_name
                    FROM purchase_orders po
                    LEFT JOIN users u ON po.user_id = u.user_id
                    WHERE po.order_id = %s
                """, (curr_fwd,))
                fwd_row = cur.fetchone()
                if not fwd_row:
                    break
                f_dict = dict(fwd_row)
                if isinstance(f_dict.get("created_at"), datetime):
                    f_dict["created_at"] = f_dict["created_at"].isoformat()
                if isinstance(f_dict.get("voided_at"), datetime):
                    f_dict["voided_at"] = f_dict["voided_at"].isoformat()
                chain_forwards.append(f_dict)
                curr_fwd = f_dict.get("replaced_by_po_id")

            order["forward_chain"] = chain_forwards
            order["latest_po_id"] = chain_forwards[-1]["order_id"] if chain_forwards else None

            cur.execute("""
                SELECT 
                    poi.item_id,
                    poi.product_id,
                    p.product_name,
                    poi.quantity,
                    poi.unit_price,
                    poi.damage_count,
                    COALESCE(poi.purchase_unit, 'PCS') as purchase_unit,
                    COALESCE(poi.conversion, '1 PCS / UNIT') as conversion,
                    COALESCE(poi.conversion_rate, 1) as conversion_rate,
                    p.unit_of_measurement
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
                        COALESCE(i.reorder_level, 10) AS reorder_level
                    FROM products p
                    LEFT JOIN inventory i ON p.product_id = i.product_id
                    WHERE p.product_id = %s
                """, (item.product_id,))
                product_row = cur.fetchone()
                if not product_row:
                    raise HTTPException(status_code=400, detail=f"Product ID {item.product_id} not found in inventory")
                if (product_row.get("status") or "").strip().lower() == "archived":
                    raise HTTPException(status_code=400, detail=f"Product '{product_row['product_name']}' is archived and cannot be added to purchase orders.")

            order_id = _generate_order_id(cur)
            total_items = sum(item.quantity for item in payload.items)
            today = date.today()
            reference_type = "purchase_orders"

            created_by_name = None
            actor_uid = None
            if x_actor_user_id:
                try:
                    actor_uid = int(x_actor_user_id)
                    cur.execute("SELECT full_name, username FROM users WHERE user_id = %s", (actor_uid,))
                    urow = cur.fetchone()
                    if urow:
                        created_by_name = urow.get("full_name") or urow.get("username")
                except Exception:
                    pass

            cur.execute("""
                INSERT INTO purchase_orders (order_id, supplier_id, user_id, status, expected_delivery, total_items, notes, created_by_name)
                VALUES (%s, %s, %s, 'Pending', %s, %s, %s, %s) RETURNING *
            """, (order_id, payload.supplier_id, actor_uid, payload.expected_delivery, total_items, payload.notes, created_by_name))
            cur.fetchone()

            for item in payload.items:
                p_unit = (item.purchase_unit or "PCS").strip()
                conv_str = (item.conversion or "1 PCS / UNIT").strip()
                conv_rate = item.conversion_rate if (item.conversion_rate and item.conversion_rate > 0) else 1
                cur.execute("""
                    INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price, purchase_unit, conversion, conversion_rate)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (order_id, item.product_id, item.quantity, item.unit_price, p_unit, conv_str, conv_rate))

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

            _invalidate_analytics_cache(cur)
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


@router.post("/replacement")
def create_replacement_purchase_order(
    payload: CreateReplacementPurchaseOrderRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # 1. Fetch original order
            cur.execute("""
                SELECT po.*, s.supplier_name
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                WHERE po.order_id = %s
            """, (payload.reference_order_id,))
            orig_order = cur.fetchone()
            if not orig_order:
                raise HTTPException(status_code=404, detail=f"Reference purchase order '{payload.reference_order_id}' not found")
            if orig_order["status"] == "Received":
                raise HTTPException(status_code=400, detail="Cannot replace an order that has already been received.")
            if orig_order["status"] == "Voided":
                raise HTTPException(status_code=400, detail=f"Order '{payload.reference_order_id}' is already voided.")

            actor_id = int(x_actor_user_id) if x_actor_user_id and x_actor_user_id.isdigit() else None
            actor_name = "Administrator"
            if actor_id:
                cur.execute("SELECT username, full_name, role FROM users WHERE user_id = %s", (actor_id,))
                user_row = cur.fetchone()
                if user_row:
                    actor_name = user_row.get("full_name") or user_row.get("username") or "Administrator"

            # 2. Validate items
            for item in payload.items:
                cur.execute("SELECT product_id, product_name, status FROM products WHERE product_id = %s", (item.product_id,))
                p_row = cur.fetchone()
                if not p_row:
                    raise HTTPException(status_code=400, detail=f"Product ID {item.product_id} not found")
                if (p_row.get("status") or "").strip().lower() == "archived":
                    raise HTTPException(status_code=400, detail=f"Product '{p_row['product_name']}' is archived.")

            # 3. Generate new PO ID
            new_order_id = _generate_order_id(cur)
            total_items = sum(item.quantity for item in payload.items)

            # 4. Insert new replacement PO
            cur.execute("""
                INSERT INTO purchase_orders (
                    order_id, supplier_id, user_id, status, expected_delivery, total_items, notes,
                    reference_po_id, replacement_reason, replacement_type
                )
                VALUES (%s, %s, %s, 'Pending', %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                new_order_id,
                payload.supplier_id,
                actor_id,
                payload.expected_delivery,
                total_items,
                payload.notes or f"Replacement for {payload.reference_order_id}: {payload.replacement_reason}",
                payload.reference_order_id,
                payload.replacement_reason,
                payload.replacement_type
            ))
            new_po_row = cur.fetchone()

            for item in payload.items:
                p_unit = (item.purchase_unit or "PCS").strip()
                conv_str = (item.conversion or "1 PCS / UNIT").strip()
                conv_rate = item.conversion_rate if (item.conversion_rate and item.conversion_rate > 0) else 1
                cur.execute("""
                    INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price, purchase_unit, conversion, conversion_rate)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (new_order_id, item.product_id, item.quantity, item.unit_price, p_unit, conv_str, conv_rate))

            # 5. Void the original PO
            voided_by_name = None
            if actor_id:
                cur.execute("SELECT full_name, username FROM users WHERE user_id = %s", (actor_id,))
                urow = cur.fetchone()
                if urow:
                    voided_by_name = urow.get("full_name") or urow.get("username")

            cur.execute("""
                UPDATE purchase_orders
                SET status = 'Voided',
                    replaced_by_po_id = %s,
                    voided_at = CURRENT_TIMESTAMP,
                    voided_by_user_id = %s,
                    void_reason = %s,
                    voided_by_name = %s
                WHERE order_id = %s
            """, (
                new_order_id,
                actor_id,
                payload.replacement_reason,
                voided_by_name,
                payload.reference_order_id
            ))

            # 6. Audit Logs
            if actor_id:
                add_audit_log(
                    cur,
                    actor_id,
                    "VOID_ORDER",
                    "order",
                    0,
                    f"Voided purchase order {payload.reference_order_id} (Reason: {payload.replacement_reason}) - Replaced by {new_order_id}"
                )
                add_audit_log(
                    cur,
                    actor_id,
                    "CREATE_REPLACEMENT_ORDER",
                    "order",
                    0,
                    f"Created replacement purchase order {new_order_id} for {payload.reference_order_id} ({payload.replacement_type}: {payload.replacement_reason})"
                )

            # 7. Notifications
            try:
                dispatch_notification(
                    type="order_completed",
                    title="Purchase Order Replaced",
                    message=f"PO {payload.reference_order_id} was voided and replaced by {new_order_id} due to {payload.replacement_type.lower()} ({payload.replacement_reason}).",
                    link=f"/orders?id={new_order_id}",
                    target_roles=["Administrator", "Manager", "System Administrator"]
                )
            except Exception as e:
                log.error(f"Error dispatching PO notification: {e}")

            _invalidate_analytics_cache(cur)
            conn.commit()
            return {
                "ok": True,
                "order_id": new_order_id,
                "reference_po_id": payload.reference_order_id,
                "status": "Pending",
                "voided_order_id": payload.reference_order_id
            }
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

            # Create lookups for damage counts and received quantities from payload
            damage_lookup = {item.product_id: item.damage_count for item in payload.items}
            received_lookup = {item.product_id: item.received_quantity for item in payload.items if item.received_quantity is not None}
            damage_map = {} # Track damages for auto-return

            cur.execute("""
                SELECT product_id, quantity, COALESCE(conversion_rate, 1) as conversion_rate, COALESCE(purchase_unit, 'PCS') as purchase_unit
                FROM purchase_order_items WHERE order_id = %s
            """, (order_id,))
            items = cur.fetchall()

            for item in items:
                pid = item["product_id"]
                ordered_qty = item["quantity"]
                conv_rate = int(item["conversion_rate"] or 1)
                recv_order_qty = received_lookup.get(pid, ordered_qty)
                item_damage = damage_lookup.get(pid, 0)

                # Good units in base inventory count (stock pieces)
                net_qty = max(0, (recv_order_qty * conv_rate) - item_damage)
                
                # Update item record with damage count & received quantity
                cur.execute("""
                    UPDATE purchase_order_items 
                    SET damage_count = %s,
                        received_quantity = %s,
                        received_at = CURRENT_TIMESTAMP
                    WHERE order_id = %s AND product_id = %s
                """, (item_damage, recv_order_qty, order_id, pid))
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
                
                # Add net_qty (good items in PCS) to all inventory counts
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


@router.put("/{order_id}/not-received")
def mark_order_as_not_received(
    order_id: str,
    payload: MarkOrderNotReceivedRequest,
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
                raise HTTPException(status_code=400, detail="Cannot mark a received order as not received")
            if order_row["status"] == "Not Received":
                raise HTTPException(status_code=400, detail="Order is already marked as Not Received")
            if order_row["status"] == "Voided":
                raise HTTPException(status_code=400, detail="Cannot update a voided order")

            reason = payload.notes.strip() if payload.notes else "Delivery not received"

            cur.execute("""
                UPDATE purchase_orders
                SET status = 'Not Received', 
                    notes = %s
                WHERE order_id = %s
            """, (reason, order_id))

            # Dispatch notification
            dispatch_notification(
                type="order_status_update",
                title="Purchase Order Not Received",
                message=f"Purchase order {order_id} was marked as Not Received. Reason: {reason}",
                link=f"/orders?id={order_id}",
                target_roles=["Administrator", "Manager"]
            )

            # Audit log
            if x_actor_user_id:
                add_audit_log(
                    cur, int(x_actor_user_id), "NOT_RECEIVE_ORDER", "order", 0,
                    f"Marked PO {order_id} as Not Received. Reason: {reason}"
                )

            conn.commit()
            return {"ok": True, "message": "Order marked as Not Received"}
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
