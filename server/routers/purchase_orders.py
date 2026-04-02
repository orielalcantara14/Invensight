from fastapi import APIRouter, HTTPException
from database import get_connection
from models import CreatePurchaseOrderRequest, PurchaseOrderResponse, PurchaseOrderItemResponse
import psycopg2.extras
from datetime import date, datetime
import random
import string

router = APIRouter()


def _generate_order_id():
    chars = string.ascii_uppercase + string.digits
    return "PO-" + "".join(random.choices(chars, k=8))


@router.get("/", response_model=list)
def get_purchase_orders():
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
                    po.notes
                FROM purchase_orders po
                LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                ORDER BY po.created_at DESC
            """)
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
                    po.notes
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
                    poi.unit_price
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
def create_purchase_order(payload: CreatePurchaseOrderRequest):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT supplier_id, supplier_name FROM supplier WHERE supplier_id = %s", (payload.supplier_id,))
            supplier_row = cur.fetchone()
            if not supplier_row:
                raise HTTPException(status_code=404, detail="Supplier not found")

            for item in payload.items:
                cur.execute("SELECT product_id, product_name FROM products WHERE product_id = %s", (item.product_id,))
                product_row = cur.fetchone()
                if not product_row:
                    raise HTTPException(status_code=400, detail=f"Product ID {item.product_id} not found in inventory")

            order_id = _generate_order_id()
            total_items = sum(item.quantity for item in payload.items)

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
                    UPDATE inventory
                    SET expected = expected + %s,
                        last_updated = %s
                    WHERE product_id = %s
                """, (item.quantity, date.today(), item.product_id))

            cur.execute("""
                UPDATE supplier
                SET total_orders = total_orders + 1
                WHERE supplier_id = %s
            """, (payload.supplier_id,))

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
def mark_order_as_received(order_id: str):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT order_id, supplier_id, status FROM purchase_orders WHERE order_id = %s
            """, (order_id,))
            order_row = cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=404, detail="Purchase order not found")
            if order_row["status"] == "Received":
                raise HTTPException(status_code=400, detail="Order is already received")

            cur.execute("""
                SELECT product_id, quantity FROM purchase_order_items WHERE order_id = %s
            """, (order_id,))
            items = cur.fetchall()

            for item in items:
                cur.execute("""
                    SELECT quantity, expected, actual FROM inventory WHERE product_id = %s
                """, (item["product_id"],))
                inv_row = cur.fetchone()
                if not inv_row:
                    raise HTTPException(status_code=400, detail=f"Product ID {item['product_id']} not found in inventory")

                qty = item["quantity"]
                cur.execute("""
                    UPDATE inventory
                    SET quantity = quantity + %s,
                        expected = GREATEST(expected - %s, actual),
                        last_updated = %s
                    WHERE product_id = %s
                """, (qty, qty, date.today(), item["product_id"]))

            cur.execute("""
                UPDATE purchase_orders
                SET status = 'Received', received_at = CURRENT_TIMESTAMP
                WHERE order_id = %s
            """, (order_id,))

            cur.execute("""
                UPDATE supplier
                SET completed_orders = completed_orders + 1
                WHERE supplier_id = %s
            """, (order_row["supplier_id"],))

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
def delete_purchase_order(order_id: str):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT order_id, supplier_id, status FROM purchase_orders WHERE order_id = %s
            """, (order_id,))
            order_row = cur.fetchone()
            if not order_row:
                raise HTTPException(status_code=404, detail="Purchase order not found")
            if order_row["status"] == "Received":
                raise HTTPException(status_code=400, detail="Cannot delete a received order")

            cur.execute("""
                SELECT product_id, quantity FROM purchase_order_items WHERE order_id = %s
            """, (order_id,))
            items = cur.fetchall()

            for item in items:
                cur.execute("""
                    UPDATE inventory
                    SET expected = GREATEST(expected - %s, actual),
                        last_updated = %s
                    WHERE product_id = %s
                """, (item["quantity"], date.today(), item["product_id"]))

            cur.execute("DELETE FROM purchase_orders WHERE order_id = %s", (order_id,))

            cur.execute("""
                UPDATE supplier
                SET total_orders = GREATEST(total_orders - 1, 0)
                WHERE supplier_id = %s
            """, (order_row["supplier_id"],))

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
