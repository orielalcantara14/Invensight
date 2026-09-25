from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from fastapi.responses import StreamingResponse
import csv
import io
import codecs
from database import get_connection
from models import CreateMechanicRequest, UpdateMechanicRequest
import psycopg2.extras
from utils.audit import add_audit_log
from routers.notifications import dispatch_notification
from typing import Optional
from pydantic import BaseModel, Field

router = APIRouter()

class UpdateMechanicSettingsRequest(BaseModel):
    commission_rate: float = Field(..., ge=0.0, le=1.0)

def get_commission_rate(cur) -> float:
    cur.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'mechanic_commission_rate'")
    row = cur.fetchone()
    if row:
        try:
            return float(row["setting_value"])
        except ValueError:
            pass
    return 0.80

def check_admin_or_manager_role(cur, actor_user_id: Optional[str]):
    if not actor_user_id:
        raise HTTPException(status_code=401, detail="Actor user ID header missing")
    try:
        actor_id = int(actor_user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid actor user ID")
    
    cur.execute("SELECT role, username FROM users WHERE user_id = %s", (actor_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Actor user not found")
        
    if isinstance(row, dict):
        role = (row.get("role") or "").lower()
        username = (row.get("username") or "").lower()
    else:
        role = (row[0] or "").lower()
        username = (row[1] or "").lower()
        
    if role not in ("administrator", "manager", "super admin", "system administrator") and username != "rootadminnginamo":
        raise HTTPException(status_code=403, detail="Access denied: Administrator or Manager role required")

def get_mechanic_total_earnings(cur, mechanic_id: int, name: str) -> float:
    rate = get_commission_rate(cur)
    cur.execute("SELECT earnings_adjustment FROM mechanics WHERE mechanic_id = %s", (mechanic_id,))
    m_row = cur.fetchone()
    if not m_row:
        return 0.0
    adjustment = float(m_row["earnings_adjustment"]) if isinstance(m_row, dict) else float(m_row[0])
    
    cur.execute(
        """
        SELECT COALESCE(SUM(si.quantity * si.unit_price), 0.0) AS calculated_revenue
        FROM sold_items si
        JOIN products p ON si.product_id = p.product_id
        WHERE p.is_service = TRUE AND LOWER(TRIM(si.mechanic_name)) = LOWER(TRIM(%s))
          AND si.mechanic_payout_status = 'Unpaid'
        """,
        (name,),
    )
    rev_row = cur.fetchone()
    revenue = float(rev_row["calculated_revenue"]) if isinstance(rev_row, dict) else float(rev_row[0])
    
    mechanic_share = round(revenue * rate, 2)
    return round(mechanic_share + adjustment, 2)

@router.get("/")
def get_mechanics():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            rate = get_commission_rate(cur)
            cur.execute("SELECT mechanic_id, name, earnings_adjustment, status FROM mechanics WHERE status != 'Deleted' ORDER BY name")
            mechanics = [dict(row) for row in cur.fetchall()]
            
            for m in mechanics:
                # Query dynamic service revenue
                cur.execute(
                    """
                    SELECT COALESCE(SUM(si.quantity * si.unit_price), 0.0) AS calculated_revenue
                    FROM sold_items si
                    JOIN products p ON si.product_id = p.product_id
                    WHERE p.is_service = TRUE AND LOWER(TRIM(si.mechanic_name)) = LOWER(TRIM(%s))
                      AND si.mechanic_payout_status = 'Unpaid'
                    """,
                    (m["name"],),
                )
                revenue = float(cur.fetchone()["calculated_revenue"])
                
                mechanic_share = round(revenue * rate, 2)
                store_share = round(revenue * (1.0 - rate), 2)
                adjustment = float(m["earnings_adjustment"])
                
                m["calculated_revenue"] = revenue
                m["mechanic_share"] = mechanic_share
                m["store_share"] = store_share
                m["total_earnings"] = round(mechanic_share + adjustment, 2)
            
            return {
                "mechanics": mechanics,
                "mechanic_commission_rate": rate
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/settings")
def update_mechanic_settings(
    payload: UpdateMechanicSettingsRequest,
    x_actor_user_id: Optional[str] = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            check_admin_or_manager_role(cur, x_actor_user_id)
            cur.execute(
                """
                INSERT INTO system_settings (setting_key, setting_value, description)
                VALUES ('mechanic_commission_rate', %s, 'Default mechanic payout commission rate')
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
                """,
                (str(payload.commission_rate),),
            )
            
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "UPDATE_MECHANIC_SETTINGS",
                    "system_settings",
                    None,
                    f"Updated mechanic commission rate to {int(payload.commission_rate * 100)}%"
                )
                
            dispatch_notification(
                type="mechanic_settings_updated",
                title="Service Split Updated",
                message=f"Mechanic commission split rate updated to {int(payload.commission_rate * 100)}%.",
                link="/mechanics",
                target_roles=["Administrator", "Manager"]
            )
            conn.commit()
            return {"ok": True, "mechanic_commission_rate": payload.commission_rate}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/")
def create_mechanic(
    payload: CreateMechanicRequest,
    x_actor_user_id: Optional[str] = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            check_admin_or_manager_role(cur, x_actor_user_id)
            # Check duplicates
            cur.execute(
                "SELECT mechanic_id FROM mechanics WHERE LOWER(TRIM(name)) = LOWER(TRIM(%s))",
                (payload.name,),
            )
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="A mechanic with this name already exists")
            
            cur.execute(
                """
                INSERT INTO mechanics (name, status)
                VALUES (%s, %s)
                RETURNING *
                """,
                (payload.name, payload.status),
            )
            row = cur.fetchone()
            
            # Audit log
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "CREATE_MECHANIC",
                    "mechanics",
                    row["mechanic_id"],
                    f"Created mechanic: {payload.name}"
                )
            
            conn.commit()
            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/{mechanic_id}")
def update_mechanic(
    mechanic_id: int,
    payload: UpdateMechanicRequest,
    x_actor_user_id: Optional[str] = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            check_admin_or_manager_role(cur, x_actor_user_id)
            # Check mechanic exists
            cur.execute(
                "SELECT * FROM mechanics WHERE mechanic_id = %s",
                (mechanic_id,),
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Mechanic not found")
                
            # Check duplicate name
            cur.execute(
                "SELECT mechanic_id FROM mechanics WHERE LOWER(TRIM(name)) = LOWER(TRIM(%s)) AND mechanic_id != %s",
                (payload.name, mechanic_id),
            )
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="A mechanic with this name already exists")
            
            # If total_earnings is passed, recalculate the adjustment
            new_adjustment = float(existing["earnings_adjustment"])
            if payload.total_earnings is not None:
                rate = get_commission_rate(cur)
                # Query dynamic service revenue
                cur.execute(
                    """
                    SELECT COALESCE(SUM(si.quantity * si.unit_price), 0.0) AS calculated_revenue
                    FROM sold_items si
                    JOIN products p ON si.product_id = p.product_id
                    WHERE p.is_service = TRUE AND LOWER(TRIM(si.mechanic_name)) = LOWER(TRIM(%s))
                      AND si.mechanic_payout_status = 'Unpaid'
                    """,
                    (existing["name"],),
                )
                revenue = float(cur.fetchone()["calculated_revenue"])
                mechanic_share = round(revenue * rate, 2)
                # adjustment = new_earnings - dynamic_share
                new_adjustment = round(payload.total_earnings - mechanic_share, 2)
                
            # Check deactivation block
            if payload.status == "Inactive":
                rate = get_commission_rate(cur)
                cur.execute(
                    """
                    SELECT COALESCE(SUM(si.quantity * si.unit_price), 0.0) AS calculated_revenue
                    FROM sold_items si
                    JOIN products p ON si.product_id = p.product_id
                    WHERE p.is_service = TRUE AND LOWER(TRIM(si.mechanic_name)) = LOWER(TRIM(%s))
                      AND si.mechanic_payout_status = 'Unpaid'
                    """,
                    (existing["name"],),
                )
                revenue = float(cur.fetchone()["calculated_revenue"])
                mechanic_share = round(revenue * rate, 2)
                total_earnings = round(mechanic_share + new_adjustment, 2)
                if total_earnings > 0.0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot deactivate mechanic {existing['name']} because they have an outstanding unpaid balance of ₱{total_earnings:.2f}."
                    )

            # Cascade rename in sold_items if mechanic name is updated
            if payload.name != existing["name"]:
                cur.execute(
                    """
                    UPDATE sold_items
                    SET mechanic_name = %s
                    WHERE LOWER(TRIM(mechanic_name)) = LOWER(TRIM(%s))
                    """,
                    (payload.name, existing["name"]),
                )

            cur.execute(
                """
                UPDATE mechanics
                SET name = %s, status = %s, earnings_adjustment = %s
                WHERE mechanic_id = %s
                RETURNING *
                """,
                (payload.name, payload.status, new_adjustment, mechanic_id),
            )
            row = cur.fetchone()
            
            # Audit log
            if x_actor_user_id:
                changes = []
                if payload.name != existing["name"]:
                    changes.append(f"Name: {existing['name']} -> {payload.name}")
                if payload.status != existing["status"]:
                    changes.append(f"Status: {existing['status']} -> {payload.status}")
                if payload.total_earnings is not None:
                    changes.append(f"Total Earnings set to: {payload.total_earnings} (Adjustment: {new_adjustment})")
                change_str = ", ".join(changes) if changes else "No core fields changed"
                
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "UPDATE_MECHANIC",
                    "mechanics",
                    mechanic_id,
                    f"Updated mechanic: {payload.name}. Changes: {change_str}"
                )
                
            conn.commit()
            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{mechanic_id}")
def delete_mechanic(
    mechanic_id: int,
    x_actor_user_id: Optional[str] = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            check_admin_or_manager_role(cur, x_actor_user_id)
            cur.execute("SELECT name, status FROM mechanics WHERE mechanic_id = %s", (mechanic_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Mechanic not found")

            # Block deactivation/deletion if there are unpaid earnings
            total_earnings = get_mechanic_total_earnings(cur, mechanic_id, row["name"])
            if total_earnings > 0.0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot deactivate or delete mechanic {row['name']} because they have an outstanding unpaid balance of ₱{total_earnings:.2f}."
                )

            if row["status"] == "Inactive":
                cur.execute("DELETE FROM mechanics WHERE mechanic_id = %s", (mechanic_id,))
                if x_actor_user_id:
                    add_audit_log(
                        cur,
                        int(x_actor_user_id),
                        "PERMANENT_DELETE_MECHANIC",
                        "mechanics",
                        mechanic_id,
                        f"Permanently deleted mechanic: {row['name']}"
                    )
                conn.commit()
                return {"ok": True, "message": f"Mechanic {row['name']} permanently deleted"}
            else:
                cur.execute(
                    "UPDATE mechanics SET status = 'Inactive' WHERE mechanic_id = %s RETURNING *",
                    (mechanic_id,),
                )
                if x_actor_user_id:
                    add_audit_log(
                        cur,
                        int(x_actor_user_id),
                        "DEACTIVATE_MECHANIC",
                        "mechanics",
                        mechanic_id,
                        f"Deactivated mechanic: {row['name']}"
                    )
                conn.commit()
                return {"ok": True, "message": "Mechanic deactivated"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class ReleasePayoutRequest(BaseModel):
    notes: Optional[str] = None

@router.post("/{mechanic_id}/payout")
def release_mechanic_payout(
    mechanic_id: int,
    payload: ReleasePayoutRequest,
    x_actor_user_id: Optional[str] = Header(default=None, alias="X-Actor-User-Id")
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            check_admin_or_manager_role(cur, x_actor_user_id)
            # 1. Fetch mechanic and lock the row
            cur.execute("SELECT * FROM mechanics WHERE mechanic_id = %s FOR UPDATE", (mechanic_id,))
            mechanic = cur.fetchone()
            if not mechanic:
                raise HTTPException(status_code=404, detail="Mechanic not found")
                
            rate = get_commission_rate(cur)
            
            # 2. Get unpaid service revenue
            cur.execute(
                """
                SELECT COALESCE(SUM(si.quantity * si.unit_price), 0.0) AS calculated_revenue
                FROM sold_items si
                JOIN products p ON si.product_id = p.product_id
                WHERE p.is_service = TRUE 
                  AND LOWER(TRIM(si.mechanic_name)) = LOWER(TRIM(%s))
                  AND si.mechanic_payout_status = 'Unpaid'
                """,
                (mechanic["name"],),
            )
            revenue = float(cur.fetchone()["calculated_revenue"])
            
            mechanic_share = round(revenue * rate, 2)
            adjustment = float(mechanic["earnings_adjustment"])
            total_payout = round(mechanic_share + adjustment, 2)
            
            if total_payout <= 0.0 and revenue == 0.0:
                raise HTTPException(status_code=400, detail="Mechanic has no unpaid earnings or positive payout balance to release.")
                
            # 3. Insert into mechanic_payouts
            processed_by = int(x_actor_user_id) if x_actor_user_id else None
            cur.execute(
                """
                INSERT INTO mechanic_payouts (mechanic_id, amount, processed_by, notes)
                VALUES (%s, %s, %s, %s)
                RETURNING payout_id
                """,
                (mechanic_id, total_payout, processed_by, payload.notes),
            )
            payout_id = cur.fetchone()["payout_id"]
            
            # 4. Set unpaid sold_items to Paid
            cur.execute(
                """
                UPDATE sold_items si
                SET mechanic_payout_status = 'Paid'
                FROM products p
                WHERE si.product_id = p.product_id
                  AND p.is_service = TRUE
                  AND LOWER(TRIM(si.mechanic_name)) = LOWER(TRIM(%s))
                  AND si.mechanic_payout_status = 'Unpaid'
                """,
                (mechanic["name"],),
            )
            
            # 5. Reset adjustment to 0.00
            cur.execute(
                "UPDATE mechanics SET earnings_adjustment = 0.00 WHERE mechanic_id = %s",
                (mechanic_id,),
            )
            
            # 6. Audit log
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    processed_by,
                    "RELEASE_MECHANIC_PAYOUT",
                    "mechanic_payouts",
                    payout_id,
                    f"Released payout of ₱{total_payout:.2f} for mechanic {mechanic['name']}. Notes: {payload.notes or ''}"
                )
                
            dispatch_notification(
                type="mechanic_payout_released",
                title="Mechanic Payout Released",
                message=f"₱{total_payout:,.2f} payout has been released for mechanic {mechanic['name']}.",
                link="/mechanics",
                target_roles=["Administrator", "Manager"]
            )
            conn.commit()
            return {"ok": True, "payout_amount": total_payout, "payout_id": payout_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/{mechanic_id}/payouts")
def get_mechanic_payouts(mechanic_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Check mechanic exists
            cur.execute("SELECT name FROM mechanics WHERE mechanic_id = %s", (mechanic_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Mechanic not found")
                
            # Get payouts joined with users (to display processed_by_name)
            cur.execute(
                """
                SELECT mp.payout_id, mp.mechanic_id, mp.amount, mp.payout_date, mp.processed_by, mp.notes,
                       u.full_name as processed_by_name
                FROM mechanic_payouts mp
                LEFT JOIN users u ON mp.processed_by = u.user_id
                WHERE mp.mechanic_id = %s
                ORDER BY mp.payout_date DESC
                """,
                (mechanic_id,),
            )
            payouts = [dict(row) for row in cur.fetchall()]
            # Convert decimal and datetime for JSON serialization
            for p in payouts:
                p["amount"] = float(p["amount"])
                if p["payout_date"]:
                    p["payout_date"] = p["payout_date"].isoformat()
                    
            return payouts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/{mechanic_id}/services")
def get_mechanic_services(mechanic_id: int):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Check mechanic exists
            cur.execute("SELECT mechanic_id, name, status, earnings_adjustment FROM mechanics WHERE mechanic_id = %s", (mechanic_id,))
            mechanic = cur.fetchone()
            if not mechanic:
                raise HTTPException(status_code=404, detail="Mechanic not found")
                
            rate = get_commission_rate(cur)
            mechanic_name = mechanic["name"]
            
            # Query all service jobs performed by this mechanic
            cur.execute(
                """
                SELECT 
                    si.sold_item_id,
                    si.invoice_id,
                    p.product_id,
                    p.product_name AS service_name,
                    si.quantity,
                    si.unit_price,
                    si.total_amount,
                    si.mechanic_name,
                    COALESCE(si.mechanic_payout_status, 'Unpaid') AS mechanic_payout_status,
                    s.invoice_date,
                    s.transaction_timestamp,
                    COALESCE(s.customer_name, 'Walk In customer') AS customer_name,
                    s.payment_method
                FROM sold_items si
                JOIN products p ON si.product_id = p.product_id
                LEFT JOIN sales s ON si.invoice_id = s.invoice_id
                WHERE p.is_service = TRUE
                  AND LOWER(TRIM(si.mechanic_name)) = LOWER(TRIM(%s))
                ORDER BY COALESCE(s.transaction_timestamp, s.invoice_date::timestamp) DESC, si.sold_item_id DESC
                """,
                (mechanic_name,),
            )
            rows = cur.fetchall()
            
            services = []
            total_gross = 0.0
            total_earned = 0.0
            unpaid_count = 0
            unpaid_earned = 0.0
            paid_count = 0
            paid_earned = 0.0
            
            for r in rows:
                qty = int(r["quantity"] or 1)
                unit_price = float(r["unit_price"] or 0.0)
                tot_amount = float(r["total_amount"] or (qty * unit_price))
                mech_share = round(tot_amount * rate, 2)
                store_share = round(tot_amount * (1.0 - rate), 2)
                payout_status = r["mechanic_payout_status"] or "Unpaid"
                
                total_gross += tot_amount
                total_earned += mech_share
                
                if payout_status == "Paid":
                    paid_count += 1
                    paid_earned += mech_share
                else:
                    unpaid_count += 1
                    unpaid_earned += mech_share
                    
                service_date_str = r["invoice_date"].isoformat() if r.get("invoice_date") else ""
                service_ts_str = r["transaction_timestamp"].isoformat() if r.get("transaction_timestamp") else ""
                
                services.append({
                    "sold_item_id": r["sold_item_id"],
                    "invoice_id": r["invoice_id"],
                    "service_name": r["service_name"],
                    "quantity": qty,
                    "unit_price": unit_price,
                    "total_amount": tot_amount,
                    "mechanic_share": mech_share,
                    "store_share": store_share,
                    "mechanic_payout_status": payout_status,
                    "service_date": service_date_str,
                    "service_timestamp": service_ts_str,
                    "customer_name": r["customer_name"],
                    "payment_method": r.get("payment_method") or "Cash"
                })
                
            return {
                "mechanic_id": mechanic["mechanic_id"],
                "mechanic_name": mechanic["name"],
                "status": mechanic["status"],
                "commission_rate": rate,
                "summary": {
                    "total_services_count": len(services),
                    "total_gross_revenue": round(total_gross, 2),
                    "total_mechanic_earned": round(total_earned, 2),
                    "unpaid_services_count": unpaid_count,
                    "unpaid_mechanic_share": round(unpaid_earned, 2),
                    "paid_services_count": paid_count,
                    "paid_mechanic_share": round(paid_earned, 2),
                },
                "services": services
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/import-template")
def get_mechanics_import_template():
    """Returns a CSV template for importing mechanics."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Status", "Earnings Adjustment"])
    writer.writerow(["Cedie", "Active", "0.00"])
    writer.writerow(["Rovhic", "Active", "100.00"])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mechanics_import_template.csv"}
    )

@router.post("/import")
async def import_mechanics(
    file: UploadFile = File(...),
    x_actor_user_id: Optional[str] = Header(default=None, alias="X-Actor-User-Id")
):
    actor_id = int(x_actor_user_id) if x_actor_user_id else None
    
    filename = file.filename.lower()
    if not (filename.endswith(".csv") or filename.endswith(".xlsx")):
        raise HTTPException(status_code=400, detail="Only CSV and Excel (.xlsx) files are allowed.")
        
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")
    raw_rows = []
    
    try:
        if filename.endswith(".xlsx"):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(contents), read_only=True, data_only=True)
            sheet = wb.active
            excel_rows = list(sheet.iter_rows(values_only=True))
            if not excel_rows or len(excel_rows) < 1:
                raise HTTPException(status_code=400, detail="Excel file is empty.")
            
            non_empty_rows = [r for r in excel_rows if any(cell is not None for cell in r)]
            if not non_empty_rows:
                raise HTTPException(status_code=400, detail="Excel file is empty.")
                
            headers = [str(h).strip().lower().replace(" ", "_") if h is not None else "" for h in non_empty_rows[0]]
            for line_no, row in enumerate(non_empty_rows[1:], start=2):
                row_dict = {}
                for idx, val in enumerate(row):
                    if idx < len(headers):
                        h = headers[idx]
                        if h:
                            row_dict[h] = str(val).strip() if val is not None else ""
                raw_rows.append((line_no, row_dict))
        else:
            decoded = contents.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(decoded))
            if not reader.fieldnames:
                raise HTTPException(status_code=400, detail="CSV file is empty or missing headers.")
            headers = [h.strip().lower().replace(" ", "_") for h in reader.fieldnames]
            # re-read using normalized headers
            reader = csv.DictReader(io.StringIO(decoded), fieldnames=headers)
            # skip the first row since it contains headers
            next(reader, None)
            for line_no, row in enumerate(reader, start=2):
                row_dict = {k: (v.strip() if v is not None else "") for k, v in row.items() if k is not None}
                raw_rows.append((line_no, row_dict))
                
        name_cols = ["name", "mechanic_name", "mechanic"]
        status_cols = ["status", "mechanic_status"]
        adj_cols = ["earnings_adjustment", "adjustment", "adj", "manual_adjustment", "earnings_adj"]
        
        def get_val(row_dict, cols):
            for col in cols:
                if col in row_dict:
                    return row_dict[col].strip()
            return None

        imported_count = 0
        conn = get_connection()
        try:
            conn.autocommit = False
            with conn.cursor() as cur:
                check_admin_or_manager_role(cur, x_actor_user_id)
                # Since role check passed, actor_id is definitely a valid integer
                actor_id = int(x_actor_user_id)
                    
                for line_no, row in raw_rows:
                    name = get_val(row, name_cols)
                    if not name:
                        continue
                        
                    raw_status = get_val(row, status_cols) or "Active"
                    status = "Active" if raw_status.strip().lower() in ("active", "1", "yes", "true") else "Inactive"
                    
                    raw_adj = get_val(row, adj_cols) or "0.00"
                    try:
                        adjustment = float(raw_adj)
                    except ValueError:
                        adjustment = 0.00
                        
                    cur.execute(
                        """
                        INSERT INTO mechanics (name, status, earnings_adjustment)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (name) DO UPDATE 
                        SET status = EXCLUDED.status, 
                            earnings_adjustment = EXCLUDED.earnings_adjustment
                        RETURNING mechanic_id
                        """,
                        (name, status, adjustment)
                    )
                    imported_count += 1
                    
                add_audit_log(cur, actor_id, "IMPORT_MECHANICS", "mechanics", None, f"Bulk imported {imported_count} mechanics from CSV/Excel.")
                dispatch_notification(
                    type="mechanics_imported",
                    title="Mechanics Bulk Imported",
                    message=f"Successfully imported {imported_count} mechanics via CSV/Excel.",
                    link="/mechanics",
                    target_roles=["Administrator", "Manager"]
                )
                conn.commit()
                return {"ok": True, "message": f"Successfully imported {imported_count} mechanics."}
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            conn.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")
