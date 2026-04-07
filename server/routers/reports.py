from fastapi import APIRouter, HTTPException, Header
import logging
from pydantic import BaseModel
from database import get_connection
import psycopg2.extras
from typing import Optional, List, Dict, Any
from datetime import datetime

router = APIRouter()
log = logging.getLogger("invensight.reports")

class GenerateReportPayload(BaseModel):
    report_type: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@router.get("/history")
def get_report_history():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT report_id as id,
                       report_type as "reportType",
                       start_date,
                       end_date,
                       generated_by as "generatedBy",
                       TO_CHAR(generated_at, 'YYYY-MM-DD HH12:MI AM') as "generatedDate"
                FROM generated_reports
                ORDER BY generated_at DESC
            """)
            reports = cur.fetchall()
            
            for row in reports:
                if row.get('start_date') and row.get('end_date'):
                    row['dateRange'] = f"{row['start_date']} to {row['end_date']}"
                else:
                    row['dateRange'] = "All Time"
                
                # Format report type proper name
                type_map = {
                    "sales": "Sales Report",
                    "inventory": "Inventory Report",
                    "supplier": "Supplier Performance"
                }
                row['reportType'] = type_map.get(row['reportType'], row['reportType'])
            
            return reports
    except Exception as e:
        log.error(f"Error fetching report history: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        conn.close()

@router.post("/generate")
def generate_report(payload: GenerateReportPayload, x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # 1. Fetch user's name for auditing
            cur.execute("SELECT full_name FROM users WHERE user_id = %s", (int(x_actor_user_id),))
            user_row = cur.fetchone()
            username = user_row["full_name"] if user_row else "System User"

            # 2. Extract specific data
            result_data = []

            if payload.report_type == "sales":
                if not payload.start_date or not payload.end_date:
                    raise HTTPException(status_code=400, detail="Start and End date required for Sales report")
                
                cur.execute("""
                    SELECT 
                        s.invoice_id AS "Invoice ID",
                        TO_CHAR(s.transaction_timestamp, 'YYYY-MM-DD HH24:MI:SS') AS "Date",
                        s.payment_method AS "Payment Method",
                        s.payment_status AS "Status",
                        (s.total_amount - COALESCE(s.tax_amount, 0) - COALESCE(s.service_charge, 0)) AS "Subtotal",
                        s.tax_amount AS "Tax",
                        s.service_charge AS "Service Charge",
                        s.total_amount AS "Total Revenue",
                        COALESCE(SUM(si.quantity), 0) AS "Total Items Sold"
                    FROM sales s
                    LEFT JOIN sold_items si ON s.invoice_id = si.invoice_id
                    WHERE s.transaction_timestamp >= %s AND s.transaction_timestamp <= %s::timestamp + interval '1 day' - interval '1 second'
                    GROUP BY s.invoice_id
                    ORDER BY s.transaction_timestamp DESC
                """, (payload.start_date, payload.end_date))
                result_data = cur.fetchall()

            elif payload.report_type == "inventory":
                cur.execute("""
                    SELECT 
                        p.sku AS "SKU",
                        p.product_name AS "Product Name",
                        COALESCE(c.category_name, 'Uncategorized') AS "Category",
                        s.supplier_name AS "Primary Supplier",
                        p.unit_price AS "Retail Price",
                        i.quantity AS "Total Received",
                        i.actual AS "Current Logical Stock",
                        i.expected AS "Expected Stock",
                        (i.actual - i.expected) AS "Discrepancy",
                        CASE WHEN i.actual <= i.reorder_level THEN 'Restock Needed' ELSE 'Healthy' END AS "Stock Status",
                        TO_CHAR(i.last_updated, 'YYYY-MM-DD') AS "Last Updated"
                    FROM inventory i
                    JOIN products p ON i.product_id = p.product_id
                    LEFT JOIN categories c ON p.category_id = c.category_id
                    LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                    ORDER BY p.product_name ASC
                """)
                result_data = cur.fetchall()

            elif payload.report_type == "supplier":
                if not payload.start_date or not payload.end_date:
                    raise HTTPException(status_code=400, detail="Start and End date required for Supplier report")
                
                cur.execute("""
                    SELECT 
                        s.supplier_name AS "Supplier Name",
                        s.status AS "Status",
                        s.contact_number AS "Contact Number",
                        s.email AS "Email",
                        COUNT(DISTINCT po.order_id) AS "Total POs",
                        COALESCE(SUM(pr.total_quantity), 0) AS "Total Items Returned"
                    FROM supplier s
                    LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id 
                        AND po.created_at >= %s AND po.created_at <= %s::timestamp + interval '1 day' - interval '1 second'
                    LEFT JOIN product_returns pr ON s.supplier_id = pr.supplier_id 
                        AND pr.created_at >= %s AND pr.created_at <= %s::timestamp + interval '1 day' - interval '1 second'
                    GROUP BY s.supplier_id
                    ORDER BY "Total POs" DESC
                """, (payload.start_date, payload.end_date, payload.start_date, payload.end_date))
                result_data = cur.fetchall()
            
            else:
                raise HTTPException(status_code=400, detail="Invalid report type")

            # 3. Log into generated_reports
            cur.execute("""
                INSERT INTO generated_reports (report_type, start_date, end_date, generated_by)
                VALUES (%s, %s, %s, %s)
            """, (payload.report_type, payload.start_date, payload.end_date, username))

            return result_data

    except Exception as e:
        log.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{report_id}")
def delete_report(report_id: int):
    conn = get_connection()
    try:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("DELETE FROM generated_reports WHERE report_id = %s", (report_id,))
            return {"status": "success"}
    finally:
        conn.close()
