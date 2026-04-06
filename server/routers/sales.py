from fastapi import APIRouter, HTTPException
from database import get_connection
from models import CreateSaleRequest
import psycopg2.extras
from datetime import datetime, date
import json
import base64
import urllib.request
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

TAX_RATE = 0.03

PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY", "sk_test_kw8iRka1GRSvzamLKByrcoie")

def get_auth_header():
    auth_str = f"{PAYMONGO_SECRET_KEY}:"
    encoded_auth = base64.b64encode(auth_str.encode()).decode()
    return f"Basic {encoded_auth}"

def get_tax_rate():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'tax_rate'")
            result = cur.fetchone()
            if result:
                return float(result[0])
    except Exception as e:
        print(f"Error fetching tax rate from database: {e}")
    finally:
        conn.close()
    return TAX_RATE


@router.get("/settings/tax-rate")
def get_tax_rate_setting():
    try:
        tax_rate = get_tax_rate()
        return {"tax_rate": tax_rate, "tax_percentage": tax_rate * 100}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _normalize_ph_mobile(raw: str | None) -> str | None:
    if raw is None:
        return None
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return None
    if len(digits) == 11 and digits.startswith("09"):
        return digits
    if len(digits) == 12 and digits.startswith("639"):
        return "0" + digits[2:]
    raise HTTPException(
        status_code=400,
        detail="Contact number must be a valid Philippine mobile number.",
    )

def verify_paymongo_source(source_id: str) -> dict:
    """Verify PayMongo source payment status."""
    url = f"https://api.paymongo.com/v1/sources/{source_id}"
    
    req = urllib.request.Request(url)
    req.add_header("Authorization", get_auth_header())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            source_attributes = res_data.get("data", {}).get("attributes", {})
            status = source_attributes.get("status")
            
            # Allow both "chargeable" (real payment) and "pending" (test mode)
            if status not in ("chargeable", "pending"):
                raise HTTPException(
                    status_code=400,
                    detail=f"PayMongo payment not completed. Status: {status}"
                )
            
            return res_data
    except HTTPException:
        raise
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        raise HTTPException(status_code=e.code, detail=f"PayMongo verification failed: {error_msg}")

def verify_paymongo_payment_intent(payment_intent_id: str) -> dict:
    """Verify PayMongo PaymentIntent payment status."""
    url = f"https://api.paymongo.com/v1/payment_intents/{payment_intent_id}"
    
    req = urllib.request.Request(url)
    req.add_header("Authorization", get_auth_header())
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            intent_attributes = res_data.get("data", {}).get("attributes", {})
            status = intent_attributes.get("status")
            
            # PaymentIntent status: "succeeded" means payment is complete
            # "awaiting_payment_method" is acceptable for testing/sandbox
            if status not in ("succeeded", "pending", "awaiting_payment_method"):
                raise HTTPException(
                    status_code=400,
                    detail=f"PayMongo payment not completed. Status: {status}"
                )
            
            return res_data
    except HTTPException:
        raise
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        raise HTTPException(status_code=e.code, detail=f"PayMongo verification failed: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PayMongo verification error: {str(e)}")


@router.get("/sales")
def get_sales():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    s.invoice_id,
                    s.invoice_date,
                    CAST(s.total_amount AS FLOAT) as total_amount,
                    s.customer_info,
                    s.contact_number,
                    s.payment_method,
                    s.payment_status,
                    CAST(s.cash_received AS FLOAT) as cash_received,
                    CAST(s.change_amount AS FLOAT) as change_amount,
                    s.transaction_timestamp,
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'product_id', si.product_id,
                                'product_name', p.product_name,
                                'quantity', si.quantity,
                                'unit_price', CAST(si.unit_price AS FLOAT),
                                'subtotal', CAST(si.subtotal AS FLOAT)
                            )
                        )
                        FROM sold_items si
                        LEFT JOIN products p ON si.product_id = p.product_id
                        WHERE si.invoice_id = s.invoice_id
                        ), '[]'
                    ) as items
                FROM sales s
                ORDER BY s.invoice_id DESC
            """)
            sales = cur.fetchall()
            result = []
            for sale in sales:
                items = sale["items"] if sale["items"] else []
                result.append({
                    "invoice_id": sale["invoice_id"],
                    "invoice_date": str(sale["invoice_date"]),
                    "total_amount": sale["total_amount"],
                    "customer_info": sale["customer_info"],
                    "contact_number": sale.get("contact_number"),
                    "payment_method": sale["payment_method"],
                    "payment_status": sale["payment_status"],
                    "cash_received": sale["cash_received"],
                    "change_amount": sale["change_amount"],
                    "transaction_timestamp": str(sale["transaction_timestamp"]) if sale["transaction_timestamp"] else None,
                    "items": items
                })
            return {"sales": result}
    finally:
        conn.close()


@router.get("/sales/{invoice_id}")
def get_sale(invoice_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    s.invoice_id,
                    s.invoice_date,
                    CAST(s.total_amount AS FLOAT) as total_amount,
                    CAST(s.tax_amount AS FLOAT) as tax_amount,
                    CAST(s.service_charge AS FLOAT) as service_charge,
                    s.customer_info,
                    s.contact_number,
                    s.payment_method,
                    s.payment_status,
                    CAST(s.cash_received AS FLOAT) as cash_received,
                    CAST(s.change_amount AS FLOAT) as change_amount,
                    CAST(s.cash_given AS FLOAT) as cash_given,
                    s.transaction_timestamp,
                    COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'product_id', si.product_id,
                                'product_name', p.product_name,
                                'quantity', si.quantity,
                                'unit_price', CAST(si.unit_price AS FLOAT),
                                'subtotal', CAST(si.subtotal AS FLOAT)
                            )
                        )
                        FROM sold_items si
                        LEFT JOIN products p ON si.product_id = p.product_id
                        WHERE si.invoice_id = s.invoice_id
                        ), '[]'
                    ) as items
                FROM sales s
                WHERE s.invoice_id = %s
            """, (invoice_id,))
            sale = cur.fetchone()
            if not sale:
                raise HTTPException(status_code=404, detail="Sale not found")
            items = sale["items"] if sale["items"] else []
            return {
                "invoice_id": sale["invoice_id"],
                "invoice_date": str(sale["invoice_date"]),
                "total_amount": sale["total_amount"],
                "tax_amount": sale["tax_amount"],
                "service_charge": sale["service_charge"],
                "customer_info": sale["customer_info"],
                "contact_number": sale.get("contact_number"),
                "payment_method": sale["payment_method"],
                "payment_status": sale["payment_status"],
                "cash_received": sale["cash_received"],
                "change_amount": sale["change_amount"],
                "cash_given": sale["cash_given"],
                "transaction_timestamp": str(sale["transaction_timestamp"]) if sale["transaction_timestamp"] else None,
                "items": items
            }
    finally:
        conn.close()


@router.post("/sales")
def create_sale(sale: CreateSaleRequest):
    if not sale.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    conn = get_connection()
    try:
        normalized_contact = _normalize_ph_mobile(sale.contact_number)
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # --- Calculate totals ---
            subtotal = sum(
                round(item.unit_price * item.quantity, 2) for item in sale.items
            )
            tax_amount = round(subtotal * get_tax_rate(), 2)
            total_amount = round(subtotal + tax_amount + sale.service_charge, 2)
            
            # For GCash/PayMongo, cash_received might be equal to total_amount or provided from UI
            if sale.payment_method == "Split":
                cash_received = sale.cash_amount
                # In split mode, ewallet_amount is usually exact, so change comes from cash_amount
                # Remaining after e-wallet: remaining = total_amount - sale.ewallet_amount
                # change = cash_received - remaining
                change_amount = round(sale.cash_amount - (total_amount - sale.ewallet_amount), 2)
                if change_amount < 0:
                     raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient payment for Split. Cash: ₱{sale.cash_amount:.2f}, E-Wallet: ₱{sale.ewallet_amount:.2f}, Total: ₱{total_amount:.2f}",
                    )
            elif sale.payment_method != "Cash":
                cash_received = total_amount
                change_amount = 0.0
            else:
                cash_received = sale.cash_received
                change_amount = round(cash_received - total_amount, 2)

            if change_amount < 0 and sale.payment_method == "Cash":
                raise HTTPException(
                    status_code=400,
                    detail=f"Cash received (₱{sale.cash_received:.2f}) is less than total (₱{total_amount:.2f})",
                )

            # --- Verify PayMongo payment if source ID provided ---
            if sale.paymongo_source_id:
                # Check if it's a PaymentIntent ID (starts with "pi_") or Source ID (starts with "src_")
                if sale.paymongo_source_id.startswith("pi_"):
                    verify_paymongo_payment_intent(sale.paymongo_source_id)
                else:
                    verify_paymongo_source(sale.paymongo_source_id)

            now = datetime.now()
            today = date.today()

            # --- Insert into sales ---
            # customer_info is used for legacy support, but we also have specific fields now
            customer_display = sale.customer_name or sale.customer_info
            
            cur.execute(
                """
                INSERT INTO sales (
                    pos_terminal_id, user_id, invoice_date, total_amount,
                    tax_amount, customer_info, payment_method, payment_status,
                    service_charge, transaction_timestamp, cash_received, change_amount, cash_given, contact_number,
                    failure_reason
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING invoice_id
                """,
                (
                    sale.pos_terminal_id,
                    sale.user_id,
                    today,
                    total_amount,
                    tax_amount,
                    customer_display,
                    sale.payment_method,
                    sale.payment_status or "Paid",
                    sale.service_charge,
                    now,
                    cash_received,
                    change_amount,
                    cash_received,
                    normalized_contact,
                    sale.failure_reason
                ),
            )
            invoice_id = cur.fetchone()["invoice_id"]
            invoice_number = f"INV-{str(invoice_id).zfill(5)}"

            # --- Insert sold_items per item ---
            for item in sale.items:
                item_subtotal = round(item.unit_price * item.quantity, 2)

                cur.execute(
                    "SELECT quantity, actual FROM inventory WHERE product_id = %s",
                    (item.product_id,)
                )
                inv_row = cur.fetchone()
                if not inv_row:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product ID {item.product_id} has no inventory record."
                    )
                physical_stock = inv_row["quantity"]
                sellable_stock = inv_row["actual"]

                cur.execute(
                    "SELECT product_name, status FROM products WHERE product_id = %s",
                    (item.product_id,)
                )
                prod_row = cur.fetchone()
                if not prod_row:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product ID {item.product_id} does not exist."
                    )
                if (prod_row.get("status") or "").strip().lower() == "archived":
                    raise HTTPException(
                        status_code=400,
                        detail=f"Product '{prod_row['product_name']}' is archived and cannot be sold."
                    )

                if sellable_stock < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Insufficient sellable stock for product ID {item.product_id}. "
                            f"Available (Actual): {sellable_stock}, Requested: {item.quantity}"
                        ),
                    )
                if physical_stock < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Insufficient physical stock for product ID {item.product_id}. "
                            f"Available (Quantity): {physical_stock}, Requested: {item.quantity}"
                        ),
                    )

                cur.execute(
                    """
                    INSERT INTO sold_items
                        (invoice_id, product_id, quantity, unit_price, subtotal, total_amount)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        invoice_id,
                        item.product_id,
                        item.quantity,
                        item.unit_price,
                        item_subtotal,
                        item_subtotal,
                    ),
                )

                # --- Update stock in inventory (only if paid) ---
                if (sale.payment_status or "Paid").lower() == "paid":
                    cur.execute(
                        """
                        UPDATE inventory
                        SET quantity = quantity - %s,
                            expected = GREATEST(expected - %s, actual - %s),
                            actual = actual - %s,
                            last_updated = %s
                        WHERE product_id = %s
                        """,
                        (item.quantity, item.quantity, item.quantity, item.quantity, today, item.product_id)
                    )

            # --- Insert payment ---
            if sale.payment_method == "Split":
                # Record Cash payment
                cur.execute(
                    """
                    INSERT INTO payments (invoice_id, payment_method, amount_paid, transaction_timestamp)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (invoice_id, "Cash", sale.cash_amount - change_amount, now),
                )
                # Record E-Wallet payment
                cur.execute(
                    """
                    INSERT INTO payments (invoice_id, payment_method, amount_paid, transaction_timestamp, paymongo_source_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (invoice_id, "E-Wallet", sale.ewallet_amount, now, sale.paymongo_source_id),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO payments (invoice_id, payment_method, amount_paid, transaction_timestamp, paymongo_source_id)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (invoice_id, sale.payment_method, cash_received, now, sale.paymongo_source_id),
                )

            # --- Audit log (skip if user is root admin) ---
            cur.execute("SELECT username FROM users WHERE user_id = %s", (sale.user_id,))
            user_row = cur.fetchone()
            is_root = user_row and user_row["username"] and user_row["username"].strip().lower() == "rootadminnginamo"
            if not is_root:
                cur.execute(
                    """
                    INSERT INTO auditlog (user_id, action, entity_type, entity_id, timestamp, details)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        sale.user_id,
                        "CREATE_SALE",
                        "sales",
                        invoice_id,
                        now,
                        f"POS sale completed. Invoice: {invoice_number}. Method: {sale.payment_method}. Total: ₱{total_amount:.2f}",
                    ),
                )

            conn.commit()

            return {
                "invoice_id": invoice_id,
                "invoice_number": invoice_number,
                "subtotal": round(subtotal, 2),
                "tax_amount": tax_amount,
                "service_charge": sale.service_charge,
                "total_amount": total_amount,
                "cash_received": cash_received,
                "change": change_amount,
                "payment_method": sale.payment_method,
                "transaction_timestamp": now.isoformat(),
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
