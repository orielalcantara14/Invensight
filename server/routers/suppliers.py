from fastapi import APIRouter, HTTPException
from database import get_connection
from models import SupplierResponse, CreateSupplierRequest, UpdateSupplierRequest
import psycopg2.extras

router = APIRouter()

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

@router.get("/")
def get_suppliers():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM supplier ORDER BY supplier_name")
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/")
def create_supplier(payload: CreateSupplierRequest):
    conn = get_connection()
    try:
        normalized_contact = _normalize_ph_mobile(payload.contact_number)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT supplier_id FROM supplier WHERE LOWER(supplier_name) = LOWER(%s)",
                (payload.supplier_name,),
            )
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="A supplier with this name already exists")
            
            cur.execute("SELECT COALESCE(MAX(supplier_id), 0) + 1 AS next_id FROM supplier")
            supplier_id = cur.fetchone()["next_id"]
            
            cur.execute(
                """
                INSERT INTO supplier (
                    supplier_id, supplier_name, address, email, contact_number, product_supplied, total_orders, status
                ) VALUES (%s, %s, %s, %s, %s, %s, 0, %s) RETURNING *
                """,
                (
                    supplier_id,
                    payload.supplier_name,
                    payload.address,
                    payload.email,
                    normalized_contact,
                    payload.product_supplied,
                    payload.status
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/{supplier_id}")
def update_supplier(supplier_id: int, payload: UpdateSupplierRequest):
    conn = get_connection()
    try:
        normalized_contact = _normalize_ph_mobile(payload.contact_number)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT supplier_id FROM supplier WHERE LOWER(supplier_name) = LOWER(%s) AND supplier_id != %s",
                (payload.supplier_name, supplier_id),
            )
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="A supplier with this name already exists")
            
            cur.execute(
                """
                UPDATE supplier SET 
                    supplier_name = %s, 
                    address = %s, 
                    email = %s, 
                    contact_number = %s, 
                    product_supplied = %s,
                    status = %s
                WHERE supplier_id = %s RETURNING *
                """,
                (
                    payload.supplier_name,
                    payload.address,
                    payload.email,
                    normalized_contact,
                    payload.product_supplied,
                    payload.status,
                    supplier_id
                ),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Supplier not found")
            conn.commit()
            return dict(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check if supplier is used in orders
            cur.execute("SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = %s", (supplier_id,))
            if cur.fetchone()[0] > 0:
                raise HTTPException(status_code=400, detail="Supplier has orders and cannot be deleted")
            
            cur.execute("DELETE FROM supplier WHERE supplier_id = %s", (supplier_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Supplier not found")
            conn.commit()
            return {"message": "Supplier deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
