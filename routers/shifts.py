from fastapi import APIRouter, Header, HTTPException, Body
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import psycopg2.extras
from database import get_connection
from utils.audit import add_audit_log

router = APIRouter(prefix="/api/shifts", tags=["shifts"])

class StartShiftRequest(BaseModel):
    starting_cash: float
    terminal_id: Optional[int] = 1
    notes: Optional[str] = None

class EndShiftRequest(BaseModel):
    shift_id: int
    ending_cash: Optional[float] = None
    notes: Optional[str] = None

@router.get("/current")
def get_current_shift(x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT s.shift_id, s.user_id, s.terminal_id, s.starting_cash, 
                       s.cash_sales, s.total_expected_cash, s.status, s.opened_at, s.notes,
                       u.username, u.full_name, u.role
                FROM pos_shifts s
                JOIN users u ON s.user_id = u.user_id
                WHERE s.user_id = %s AND s.status = 'OPEN'
                ORDER BY s.opened_at DESC
                LIMIT 1
            """, (user_id,))
            shift = cur.fetchone()
            if not shift:
                return {"active": False, "shift": None}

            # Recalculate cash sales since opened_at
            cur.execute("""
                SELECT COALESCE(SUM(p.amount_paid), 0) as total_cash_sales
                FROM sales s
                JOIN payments p ON s.invoice_id = p.invoice_id
                WHERE s.user_id = %s 
                  AND s.transaction_timestamp >= %s
                  AND LOWER(p.payment_method) = 'cash'
                  AND s.payment_status != 'Refunded'
            """, (user_id, shift["opened_at"]))
            res = cur.fetchone()
            cash_sales = float(res["total_cash_sales"]) if res else 0.0
            starting_cash = float(shift["starting_cash"])
            total_expected_cash = starting_cash + cash_sales

            # Update cached values in pos_shifts
            cur.execute("""
                UPDATE pos_shifts 
                SET cash_sales = %s, total_expected_cash = %s 
                WHERE shift_id = %s
            """, (cash_sales, total_expected_cash, shift["shift_id"]))
            conn.commit()

            shift["cash_sales"] = cash_sales
            shift["total_expected_cash"] = total_expected_cash
            return {"active": True, "shift": shift}
    finally:
        conn.close()

def ensure_shift_columns(cur):
    try:
        cur.execute("""
            ALTER TABLE pos_shifts 
            ADD COLUMN IF NOT EXISTS start_notes TEXT,
            ADD COLUMN IF NOT EXISTS end_notes TEXT,
            ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS username VARCHAR(100);
        """)
    except Exception:
        pass

@router.post("/start")
def start_shift(body: StartShiftRequest, x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    if body.starting_cash < 0:
        raise HTTPException(status_code=400, detail="Starting cash cannot be negative")

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            ensure_shift_columns(cur)
            # Check user role - allowed for cashiers, super admins, administrators, managers, sales staff
            cur.execute("SELECT role, full_name, username FROM users WHERE user_id = %s", (user_id,))
            user_row = cur.fetchone()
            allowed_roles = ["cashier", "super admin", "system administrator", "administrator", "manager", "sales staff"]
            user_role = str(user_row.get("role", "")).lower() if user_row else ""
            if not user_row or user_role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Your role is not authorized to open a cash shift")

            cashier_name = user_row.get("full_name") or user_row.get("username")
            uname = user_row.get("username")

            # Check if an open shift already exists for this user
            cur.execute("SELECT shift_id FROM pos_shifts WHERE user_id = %s AND status = 'OPEN'", (user_id,))
            existing = cur.fetchone()
            if existing:
                return {"ok": True, "message": "Shift already open", "shift_id": existing["shift_id"]}

            starting_cash = round(float(body.starting_cash), 2)
            start_notes = body.notes.strip() if body.notes else None
            cur.execute("""
                INSERT INTO pos_shifts (user_id, terminal_id, starting_cash, cash_sales, total_expected_cash, status, notes, start_notes, opened_at, cashier_name, username)
                VALUES (%s, %s, %s, 0.00, %s, 'OPEN', %s, %s, NOW(), %s, %s)
                RETURNING shift_id, opened_at
            """, (user_id, body.terminal_id or 1, starting_cash, starting_cash, start_notes, start_notes, cashier_name, uname))
            new_shift = cur.fetchone()
            shift_id = new_shift["shift_id"]

            notes_info = f" (Notes: '{start_notes}')" if start_notes else ""
            add_audit_log(
                cur,
                user_id,
                "START_SHIFT",
                "pos_shift",
                shift_id,
                f"started shift with Starting Cash of ₱{starting_cash:,.2f}{notes_info}."
            )
            conn.commit()
            return {
                "ok": True,
                "message": "Shift started successfully",
                "shift_id": shift_id,
                "starting_cash": starting_cash,
                "opened_at": new_shift["opened_at"]
            }
    finally:
        conn.close()

@router.post("/end")
def end_shift(body: EndShiftRequest, x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)

    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            ensure_shift_columns(cur)
            cur.execute("SELECT * FROM pos_shifts WHERE shift_id = %s AND status = 'OPEN'", (body.shift_id,))
            shift = cur.fetchone()
            if not shift:
                raise HTTPException(status_code=404, detail="Active shift not found")

            # Recalculate cash sales
            cur.execute("""
                SELECT COALESCE(SUM(p.amount_paid), 0) as total_cash_sales
                FROM sales s
                JOIN payments p ON s.invoice_id = p.invoice_id
                WHERE s.user_id = %s 
                  AND s.transaction_timestamp >= %s
                  AND LOWER(p.payment_method) = 'cash'
                  AND s.payment_status != 'Refunded'
            """, (shift["user_id"], shift["opened_at"]))
            res = cur.fetchone()
            cash_sales = float(res["total_cash_sales"]) if res else 0.0
            starting_cash = float(shift["starting_cash"])
            total_expected_cash = starting_cash + cash_sales
            ending_cash = round(float(body.ending_cash), 2) if body.ending_cash is not None else total_expected_cash

            end_notes = body.notes.strip() if body.notes else None
            start_notes = shift.get("start_notes") or shift.get("notes")

            combined = []
            if start_notes:
                combined.append(f"Start: {start_notes}")
            if end_notes:
                combined.append(f"End: {end_notes}")
            combined_notes = " | ".join(combined) if combined else None

            cur.execute("""
                UPDATE pos_shifts 
                SET cash_sales = %s, total_expected_cash = %s, ending_cash = %s,
                    status = 'CLOSED', closed_at = NOW(), end_notes = %s, notes = %s
                WHERE shift_id = %s
            """, (cash_sales, total_expected_cash, ending_cash, end_notes, combined_notes, body.shift_id))

            notes_info = f" (Notes: '{end_notes}')" if end_notes else ""
            add_audit_log(
                cur,
                user_id,
                "END_SHIFT",
                "pos_shift",
                body.shift_id,
                f"ended shift and closed register with Total Expected Cash of ₱{total_expected_cash:,.2f}, Actual Count: ₱{ending_cash:,.2f}{notes_info}."
            )
            conn.commit()
            return {"ok": True, "message": "Shift closed successfully"}
    finally:
        conn.close()

@router.get("/")
def get_all_shifts(
    limit: int = 500,
    status: Optional[str] = None,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            where_clauses = []
            params = []
            if status:
                where_clauses.append("s.status = %s")
                params.append(status.upper())

            where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            cur.execute(f"""
                SELECT s.shift_id, s.user_id, s.terminal_id, s.starting_cash, 
                       s.cash_sales, s.total_expected_cash, s.ending_cash, s.status, 
                       s.opened_at, s.closed_at, s.notes, s.start_notes, s.end_notes,
                       COALESCE(s.username, u.username, 'Unknown') as username, 
                       COALESCE(s.cashier_name, u.full_name, s.username, u.username, 'Staff') as cashier_name,
                       COALESCE(u.role, 'Cashier') as role
                FROM pos_shifts s
                LEFT JOIN users u ON s.user_id = u.user_id
                {where_sql}
                ORDER BY s.opened_at DESC
                LIMIT %s
            """, (*params, limit))
            shifts = cur.fetchall()
            return [dict(row) for row in shifts]
    finally:
        conn.close()

class UpdateShiftNotesRequest(BaseModel):
    notes: Optional[str] = None
    start_notes: Optional[str] = None
    end_notes: Optional[str] = None

@router.put("/{shift_id}/notes")
def update_shift_notes(
    shift_id: int,
    body: UpdateShiftNotesRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    user_id = int(x_actor_user_id)
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            ensure_shift_columns(cur)
            cur.execute("SELECT shift_id, notes, start_notes, end_notes FROM pos_shifts WHERE shift_id = %s", (shift_id,))
            shift = cur.fetchone()
            if not shift:
                raise HTTPException(status_code=404, detail="Shift record not found")

            start_notes = body.start_notes.strip() if body.start_notes is not None and body.start_notes.strip() else None
            end_notes = body.end_notes.strip() if body.end_notes is not None and body.end_notes.strip() else None

            if start_notes is None and end_notes is None and body.notes is not None:
                combined_notes = body.notes.strip() or None
            else:
                combined = []
                if start_notes:
                    combined.append(f"Start: {start_notes}")
                if end_notes:
                    combined.append(f"End: {end_notes}")
                combined_notes = " | ".join(combined) if combined else None

            cur.execute("""
                UPDATE pos_shifts 
                SET notes = %s, start_notes = %s, end_notes = %s 
                WHERE shift_id = %s
            """, (combined_notes, start_notes, end_notes, shift_id))
            
            add_audit_log(
                cur,
                user_id,
                "UPDATE_SHIFT_NOTES",
                "pos_shift",
                shift_id,
                f"updated notes for shift #{shift_id} to '{combined_notes or 'None'}'."
            )
            conn.commit()
            return {
                "ok": True,
                "message": "Shift notes updated successfully",
                "shift_id": shift_id,
                "notes": combined_notes,
                "start_notes": start_notes,
                "end_notes": end_notes,
            }
    finally:
        conn.close()

@router.get("/{shift_id}/transactions")
def get_shift_transactions(
    shift_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            ensure_shift_columns(cur)
            # Fetch shift details
            cur.execute("""
                SELECT s.shift_id, s.user_id, s.terminal_id, s.starting_cash, 
                       s.cash_sales, s.total_expected_cash, s.ending_cash, s.status, 
                       s.opened_at, s.closed_at, s.notes, s.start_notes, s.end_notes,
                       COALESCE(s.username, u.username, 'Unknown') as username, 
                       COALESCE(s.cashier_name, u.full_name, s.username, u.username, 'Cashier') as cashier_name,
                       COALESCE(u.role, 'Cashier') as role
                FROM pos_shifts s
                LEFT JOIN users u ON s.user_id = u.user_id
                WHERE s.shift_id = %s
            """, (shift_id,))
            shift = cur.fetchone()
            if not shift:
                raise HTTPException(status_code=404, detail="Shift record not found")

            opened_at = shift["opened_at"]
            closed_at = shift["closed_at"]
            user_id = shift["user_id"]

            if user_id:
                cur.execute("""
                    SELECT 
                        s.invoice_id,
                        s.invoice_date,
                        s.transaction_timestamp,
                        s.total_amount,
                        s.tax_amount,
                        s.service_charge,
                        s.customer_info,
                        s.contact_number,
                        s.payment_status,
                        COALESCE(p.payment_method, s.payment_method, 'Cash') as payment_method,
                        COALESCE(p.amount_paid, s.cash_received, s.total_amount) as amount_paid,
                        COALESCE(s.change_amount, 0) as change_amount,
                        COALESCE(s.cashier_name, u.full_name, 'Cashier') as cashier_name,
                        COALESCE(items_data.items, '[]'::json) as items
                    FROM sales s
                    LEFT JOIN users u ON s.user_id = u.user_id
                    LEFT JOIN payments p ON s.invoice_id = p.invoice_id
                    LEFT JOIN LATERAL (
                        SELECT json_agg(
                            json_build_object(
                                'product_id', si.product_id,
                                'product_name', COALESCE(pr.product_name, 'Custom Item'),
                                'quantity', si.quantity,
                                'unit_price', si.unit_price,
                                'subtotal', si.subtotal,
                                'is_service', COALESCE(pr.is_service, false),
                                'mechanic_name', si.mechanic_name
                            )
                        ) as items
                        FROM sold_items si
                        LEFT JOIN products pr ON si.product_id = pr.product_id
                        WHERE si.invoice_id = s.invoice_id
                    ) items_data ON true
                    WHERE s.user_id = %s
                      AND s.transaction_timestamp >= %s
                      AND s.transaction_timestamp <= COALESCE(%s, NOW())
                    ORDER BY s.transaction_timestamp ASC
                """, (user_id, opened_at, closed_at))
            else:
                cur.execute("""
                    SELECT 
                        s.invoice_id,
                        s.invoice_date,
                        s.transaction_timestamp,
                        s.total_amount,
                        s.tax_amount,
                        s.service_charge,
                        s.customer_info,
                        s.contact_number,
                        s.payment_status,
                        COALESCE(p.payment_method, s.payment_method, 'Cash') as payment_method,
                        COALESCE(p.amount_paid, s.cash_received, s.total_amount) as amount_paid,
                        COALESCE(s.change_amount, 0) as change_amount,
                        COALESCE(s.cashier_name, u.full_name, 'Cashier') as cashier_name,
                        COALESCE(items_data.items, '[]'::json) as items
                    FROM sales s
                    LEFT JOIN users u ON s.user_id = u.user_id
                    LEFT JOIN payments p ON s.invoice_id = p.invoice_id
                    LEFT JOIN LATERAL (
                        SELECT json_agg(
                            json_build_object(
                                'product_id', si.product_id,
                                'product_name', COALESCE(pr.product_name, 'Custom Item'),
                                'quantity', si.quantity,
                                'unit_price', si.unit_price,
                                'subtotal', si.subtotal,
                                'is_service', COALESCE(pr.is_service, false),
                                'mechanic_name', si.mechanic_name
                            )
                        ) as items
                        FROM sold_items si
                        LEFT JOIN products pr ON si.product_id = pr.product_id
                        WHERE si.invoice_id = s.invoice_id
                    ) items_data ON true
                    WHERE s.transaction_timestamp >= %s
                      AND s.transaction_timestamp <= COALESCE(%s, NOW())
                    ORDER BY s.transaction_timestamp ASC
                """, (opened_at, closed_at))
            
            transactions = cur.fetchall()

            total_sales_amount = sum(float(t["total_amount"] or 0) for t in transactions if t["payment_status"] != "Refunded")
            cash_sales_amount = sum(float(t["total_amount"] or 0) for t in transactions if str(t["payment_method"]).lower() == "cash" and t["payment_status"] != "Refunded")
            cashless_sales_amount = sum(float(t["total_amount"] or 0) for t in transactions if str(t["payment_method"]).lower() != "cash" and t["payment_status"] != "Refunded")
            refunded_amount = sum(float(t["total_amount"] or 0) for t in transactions if t["payment_status"] == "Refunded")
            
            items_count = sum(sum(int(item.get("quantity", 1)) for item in (t.get("items") or [])) for t in transactions)

            return {
                "shift": dict(shift),
                "transactions": [dict(row) for row in transactions],
                "summary": {
                    "transaction_count": len(transactions),
                    "total_sales": total_sales_amount,
                    "cash_sales": cash_sales_amount,
                    "cashless_sales": cashless_sales_amount,
                    "refunded_sales": refunded_amount,
                    "items_sold_count": items_count
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_shift_transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

