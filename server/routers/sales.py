from fastapi import APIRouter, HTTPException
from database import get_connection
from models import CreateSaleRequest
import psycopg2.extras
from datetime import datetime, date

router = APIRouter()

TAX_RATE = 0.12


@router.post("/sales")
def create_sale(sale: CreateSaleRequest):
    if not sale.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # --- Calculate totals ---
            subtotal = sum(
                round(item.unit_price * item.quantity, 2) for item in sale.items
            )
            tax_amount = round(subtotal * TAX_RATE, 2)
            total_amount = round(subtotal + tax_amount + sale.service_charge, 2)
            change_amount = round(sale.cash_received - total_amount, 2)

            if change_amount < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cash received (₱{sale.cash_received:.2f}) is less than total (₱{total_amount:.2f})",
                )

            now = datetime.now()
            today = date.today()

            # --- Insert into sales ---
            cur.execute(
                """
                INSERT INTO sales (
                    pos_terminal_id, user_id, invoice_date, total_amount,
                    tax_amount, customer_info, payment_method, payment_status,
                    service_charge, transaction_timestamp
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING invoice_id
                """,
                (
                    sale.pos_terminal_id,
                    sale.user_id,
                    today,
                    total_amount,
                    tax_amount,
                    sale.customer_info,
                    "Cash",
                    "Paid",
                    sale.service_charge,
                    now,
                ),
            )
            invoice_id = cur.fetchone()["invoice_id"]
            invoice_number = f"INV-{str(invoice_id).zfill(5)}"

            # --- Insert sold_items + stockmovements per item ---
            for item in sale.items:
                item_subtotal = round(item.unit_price * item.quantity, 2)

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

                cur.execute(
                    """
                    INSERT INTO stockmovements
                        (product_id, movement_type, quantity, movement_date, reference_id, notes)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        item.product_id,
                        "OUT",
                        item.quantity,
                        today,
                        invoice_number,
                        "POS Sale",
                    ),
                )

            # --- Insert payment ---
            cur.execute(
                """
                INSERT INTO payments (invoice_id, payment_method, amount_paid, transaction_timestamp)
                VALUES (%s, %s, %s, %s)
                """,
                (invoice_id, "Cash", sale.cash_received, now),
            )

            # --- Audit log ---
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
                    f"POS sale completed. Invoice: {invoice_number}. Total: ₱{total_amount:.2f}",
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
                "cash_received": sale.cash_received,
                "change": change_amount,
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
