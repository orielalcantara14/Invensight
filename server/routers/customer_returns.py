from fastapi import APIRouter, HTTPException, Header
from database import get_connection
from models import CreateCustomerReturnRequest, CustomerReturnResponse, CustomerReturnItemResponse
import psycopg2.extras
from datetime import date, datetime
import logging
from utils.audit import add_audit_log

logger = logging.getLogger("invensight.customer_returns")
router = APIRouter()

def _serialize_date_fields(row: dict) -> dict:
    if "return_date" in row and isinstance(row["return_date"], (date, datetime)):
        row["return_date"] = row["return_date"].isoformat()
    return row

@router.get("/", response_model=list[CustomerReturnResponse])
def get_customer_returns():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    cr.return_id, cr.rma_number, cr.sale_id, cr.customer_name, 
                    cr.contact_number, cr.return_date, cr.return_type, cr.status, cr.reason
                FROM customer_returns cr
                ORDER BY cr.created_at DESC
            """)
            returns = cur.fetchall()
            
            results = []
            for ret in returns:
                cur.execute("""
                    SELECT 
                        cri.item_id, cri.product_id, p.product_name, 
                        cri.quantity, cri.is_defective, cri.is_damaged
                    FROM customer_return_items cri
                    JOIN products p ON cri.product_id = p.product_id
                    WHERE cri.return_id = %s
                """, (ret["return_id"],))
                ret["items"] = cur.fetchall()
                results.append(_serialize_date_fields(dict(ret)))
            
            return results
    except Exception as e:
        logger.error("Error fetching customer returns: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/")
def create_customer_return(
    payload: CreateCustomerReturnRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # 1. Check sale
            cur.execute("SELECT COALESCE(customer_name, customer_info) as customer_name, contact_number, payment_status FROM sales WHERE invoice_id = %s", (payload.sale_id,))
            sale = cur.fetchone()
            if not sale:
                raise HTTPException(status_code=404, detail="Invoice not found")

            # 2. Generate RMA
            year = date.today().year
            cur.execute("SELECT COUNT(*) FROM customer_returns WHERE EXTRACT(YEAR FROM created_at) = %s", (year,))
            count = cur.fetchone()["count"] + 1
            rma_number = f"RET-{year}-{str(count).zfill(3)}"

            # 3. Create Return Header
            cur.execute("""
                INSERT INTO customer_returns (rma_number, sale_id, customer_name, contact_number, return_type, reason, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'Pending')
                RETURNING return_id
            """, (rma_number, payload.sale_id, sale["customer_name"] or "Walk-in", sale["contact_number"], payload.return_type, payload.reason))
            return_id = cur.fetchone()["return_id"]

            # 4. Process Items and Inventory
            for item in payload.items:
                cur.execute("""
                    INSERT INTO customer_return_items (return_id, product_id, quantity, is_defective, is_damaged)
                    VALUES (%s, %s, %s, %s, %s)
                """, (return_id, item.product_id, item.quantity, item.is_defective, item.is_damaged))

                # Inventory Logic
                cur.execute("SELECT inventory_id, quantity, expected, actual FROM inventory WHERE product_id = %s FOR UPDATE", (item.product_id,))
                inv = cur.fetchone()
                if not inv: continue # Should not happen if item was sold

                qty_before = inv["quantity"]
                actual_before = inv["actual"]
                expected = inv["expected"]

                if payload.return_type == "Refund":
                    if not item.is_defective and not item.is_damaged:
                        # Good item: Add to sellable and actual
                        qty_after = qty_before + item.quantity
                        actual_after = actual_before + item.quantity
                        event_type = "CUSTOMER_RETURN_REFUND_GOOD"
                    else:
                        # Defective: Add to actual only (wait, why actual? because we physically have it now)
                        # But quantity is sellable, so it stays same.
                        qty_after = qty_before
                        actual_after = actual_before + item.quantity
                        event_type = "CUSTOMER_RETURN_REFUND_DEFECTIVE"
                else: # Exchange
                    # We gave 1 (quantity -1), we received 1 defective (actual stays same)
                    qty_after = qty_before - item.quantity
                    actual_after = actual_before # Physical count 1 out, 1 in
                    event_type = "CUSTOMER_RETURN_EXCHANGE"

                difference_before = (2 * actual_before) - qty_before - expected
                difference_after = (2 * actual_after) - qty_after - expected

                cur.execute("""
                    UPDATE inventory SET 
                        quantity = %s, actual = %s, 
                        last_updated = %s, reason_adjustment = %s
                    WHERE inventory_id = %s
                """, (qty_after, actual_after, date.today(), f"Customer Return {rma_number}", inv["inventory_id"]))

                # Log event
                cur.execute("""
                    INSERT INTO inventory_stock_events (
                        inventory_id, product_id, event_type, 
                        quantity_before, quantity_after, expected_before, expected_after,
                        actual_before, actual_after, quantity_delta, expected_delta, actual_delta,
                        difference_before, difference_after, reference_type, reference_id, reason
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    inv["inventory_id"], item.product_id, event_type,
                    qty_before, qty_after, expected, expected,
                    actual_before, actual_after, qty_after - qty_before, 0, actual_after - actual_before,
                    int(difference_before), int(difference_after), "customer_returns", str(return_id), f"RMA: {rma_number}"
                ))

            # Update Sale status if refund
            if payload.return_type == "Refund":
                cur.execute("UPDATE sales SET payment_status = 'Refunded' WHERE invoice_id = %s", (payload.sale_id,))

            conn.commit()
            return {"ok": True, "rma_number": rma_number}
    except Exception as e:
        conn.rollback()
        logger.error("Error creating customer return: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/{return_id}/to-supplier")
def mark_as_returned_to_supplier(
    return_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT rma_number, status FROM customer_returns WHERE return_id = %s FOR UPDATE", (return_id,))
            ret = cur.fetchone()
            if not ret:
                raise HTTPException(status_code=404, detail="Return not found")
            
            if ret["status"] == "Returned to Supplier":
                return {"message": "Already returned to supplier"}

            cur.execute("SELECT product_id, quantity, is_defective, is_damaged FROM customer_return_items WHERE return_id = %s", (return_id,))
            items = cur.fetchall()

            for item in items:
                if item["is_defective"] or item["is_damaged"]:
                    # Item is being sent out to supplier, so actual count decreases.
                    cur.execute("SELECT inventory_id, quantity, expected, actual FROM inventory WHERE product_id = %s FOR UPDATE", (item["product_id"],))
                    inv = cur.fetchone()
                    if not inv: continue

                    qty_before = inv["quantity"]
                    actual_before = inv["actual"]
                    expected = inv["expected"]

                    qty_after = qty_before
                    actual_after = actual_before - item["quantity"]

                    difference_before = (2 * actual_before) - qty_before - expected
                    difference_after = (2 * actual_after) - qty_after - expected

                    cur.execute("UPDATE inventory SET actual = %s, last_updated = %s WHERE inventory_id = %s", (actual_after, date.today(), inv["inventory_id"]))

                    cur.execute("""
                        INSERT INTO inventory_stock_events (
                            inventory_id, product_id, event_type, 
                            quantity_before, quantity_after, expected_before, expected_after,
                            actual_before, actual_after, quantity_delta, expected_delta, actual_delta,
                            difference_before, difference_after, reference_type, reference_id, reason
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        inv["inventory_id"], item["product_id"], "CUSTOMER_RETURN_TO_SUPPLIER",
                        qty_before, qty_after, expected, expected,
                        actual_before, actual_after, 0, 0, actual_after - actual_before,
                        int(difference_before), int(difference_after), "customer_returns", str(return_id), "Returned to supplier"
                    ))

            cur.execute("UPDATE customer_returns SET status = 'Returned to Supplier' WHERE return_id = %s", (return_id,))
            conn.commit()
            return {"ok": True}
    except Exception as e:
        conn.rollback()
        logger.error("Error marking as returned to supplier: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
