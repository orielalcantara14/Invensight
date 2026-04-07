from fastapi import APIRouter, HTTPException, Header
from database import get_connection
from models import SupplierResponse, CreateSupplierRequest, UpdateSupplierRequest
import psycopg2.extras
from utils.audit import add_audit_log

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
            cur.execute("SELECT * FROM supplier WHERE status != 'Archived' ORDER BY supplier_name")
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/")
def create_supplier(
    payload: CreateSupplierRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
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
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "CREATE_SUPPLIER",
                    "supplier",
                    row["supplier_id"],
                    f"Created supplier: {payload.supplier_name}"
                )
            
            conn.commit()
            return dict(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/{supplier_id}")
def update_supplier(
    supplier_id: int, 
    payload: UpdateSupplierRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
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
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "UPDATE_SUPPLIER",
                    "supplier",
                    supplier_id,
                    f"Updated supplier: {payload.supplier_name}"
                )
            
            conn.commit()
            return dict(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/{supplier_id}/archive")
def archive_supplier(
    supplier_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    """Soft-archive a supplier (set status = 'Archived')."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE supplier SET status = 'Archived' WHERE supplier_id = %s AND status != 'Archived' RETURNING supplier_id",
                (supplier_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Supplier not found or already archived")
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "ARCHIVE_SUPPLIER",
                    "supplier",
                    supplier_id,
                    f"Archived supplier ID: {supplier_id}"
                )
            
            conn.commit()
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
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
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "DELETE_SUPPLIER",
                    "supplier",
                    supplier_id,
                    f"Permanently deleted supplier ID: {supplier_id}"
                )
                
            conn.commit()
            return {"message": "Supplier deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
