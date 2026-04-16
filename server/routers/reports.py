from fastapi import APIRouter, HTTPException, Header
import logging
import json
from pydantic import BaseModel
from database import get_connection
import psycopg2.extras
from typing import Optional, List, Dict, Any
from datetime import datetime, date

router = APIRouter()
log = logging.getLogger("invensight.reports")

class GenerateReportPayload(BaseModel):
    report_type: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    status: Optional[str] = None

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
                       TO_CHAR(generated_at, 'YYYY-MM-DD HH12:MI AM') as "generatedDate",
                       report_data as "reportData"
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
                    "supplier": "Supplier Performance",
                    "product_category": "Product & Category Report",
                    "orders_returns": "Orders & Returns Report"
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

            report_data = {}

            if payload.report_type == "sales":
                # Detailed Sales Logic
                cur.execute("""
                    SELECT 
                        COALESCE(SUM(total_amount), 0) as total_revenue_gross,
                        COALESCE(SUM(CASE WHEN payment_status NOT IN ('Refunded', 'Cancelled') THEN total_amount ELSE 0 END), 0) as total_revenue_net,
                        COALESCE(SUM(CASE WHEN payment_status = 'Refunded' THEN total_amount ELSE 0 END), 0) as refunded_total
                    FROM sales
                    WHERE transaction_timestamp >= %s AND transaction_timestamp <= %s::timestamp + interval '1 day' - interval '1 second'
                      AND (%s IS NULL OR payment_status = %s)
                """, (payload.start_date, payload.end_date, payload.status, payload.status))
                summary = cur.fetchone()

                # Monthly breakdown for the selected year (using start_date year)
                cur.execute("""
                    SELECT 
                        TO_CHAR(m, 'Mon') as month,
                        COALESCE(SUM(s.total_amount), 0) as sales
                    FROM generate_series(
                        date_trunc('year', %s::date),
                        date_trunc('year', %s::date) + interval '11 months',
                        interval '1 month'
                    ) AS m
                    LEFT JOIN sales s ON date_trunc('month', s.transaction_timestamp) = m
                       AND (%s IS NULL OR s.payment_status = %s)
                    GROUP BY m
                    ORDER BY m
                """, (payload.start_date, payload.start_date, payload.status, payload.status))
                annual_breakdown = cur.fetchall()

                # Top products
                cur.execute("""
                    SELECT p.product_name, SUM(si.quantity) as units_sold, SUM(si.unit_price * si.quantity) as revenue
                    FROM sold_items si
                    JOIN products p ON si.product_id = p.product_id
                    JOIN sales s ON si.invoice_id = s.invoice_id
                    WHERE s.transaction_timestamp >= %s AND s.transaction_timestamp <= %s::timestamp + interval '1 day' - interval '1 second'
                      AND (%s IS NULL OR s.payment_status = %s)
                      AND (%s IS NULL OR p.category_id = %s)
                    GROUP BY p.product_id, p.product_name
                    ORDER BY 2 DESC
                    LIMIT 10
                """, (payload.start_date, payload.end_date, payload.status, payload.status, payload.category_id, payload.category_id))
                top_products = cur.fetchall()

                # Lowest products
                cur.execute("""
                    SELECT p.product_name, SUM(si.quantity) as units_sold
                    FROM products p
                    LEFT JOIN sold_items si ON p.product_id = si.product_id
                    LEFT JOIN sales s ON si.invoice_id = s.invoice_id 
                         AND s.transaction_timestamp >= %s AND s.transaction_timestamp <= %s::timestamp + interval '1 day' - interval '1 second'
                         AND (%s IS NULL OR s.payment_status = %s)
                    WHERE (%s IS NULL OR p.category_id = %s)
                    GROUP BY p.product_id, p.product_name
                    ORDER BY 2 ASC NULLS FIRST
                    LIMIT 10
                """, (payload.start_date, payload.end_date, payload.status, payload.status, payload.category_id, payload.category_id))
                lowest_products = cur.fetchall()

                report_data = {
                    "summary": summary,
                    "trends": { "annual": annual_breakdown },
                    "top_products": top_products,
                    "lowest_products": lowest_products
                }

            elif payload.report_type == "inventory":
                # Stock status breakdown
                cur.execute("""
                    SELECT 
                        CASE 
                            WHEN i.actual <= 0 THEN 'Out of Stock'
                            WHEN i.actual <= i.reorder_level THEN 'Low Stock'
                            ELSE 'Normal'
                        END as status,
                        COUNT(*) as count
                    FROM inventory i
                    JOIN products p ON i.product_id = p.product_id
                    WHERE (%s IS NULL OR p.category_id = %s)
                    GROUP BY 1
                    ORDER BY 2 ASC
                """, (payload.category_id, payload.category_id))
                stock_breakdown = cur.fetchall()

                # Frequent OOS/Low (based on stock events)
                cur.execute("""
                    SELECT p.product_name, COUNT(*) as incident_count
                    FROM inventory_stock_events e
                    JOIN products p ON e.product_id = p.product_id
                    WHERE (e.actual_after <= 0 OR e.actual_after <= e.expected_after * 0.2)
                      AND (%s IS NULL OR p.category_id = %s)
                    GROUP BY p.product_id, p.product_name
                    ORDER BY 2 DESC
                    LIMIT 10
                """, (payload.category_id, payload.category_id))
                critical_frequency = cur.fetchall()

                # Full Inventory List with Diffs
                cur.execute("""
                    SELECT 
                        p.product_name, p.sku, i.expected, i.actual, 
                        (i.actual - i.expected) as difference, i.reorder_level,
                        i.expiry_date::text as expiry_date
                    FROM inventory i
                    JOIN products p ON i.product_id = p.product_id
                    WHERE (%s IS NULL OR p.category_id = %s)
                    ORDER BY i.actual ASC
                """, (payload.category_id, payload.category_id))
                detailed_inventory = cur.fetchall()

                report_data = {
                    "breakdown": stock_breakdown,
                    "critical_frequency": critical_frequency,
                    "detailed_inventory": detailed_inventory
                }

            elif payload.report_type == "product_category":
                cur.execute("""
                    SELECT 
                        COALESCE(c.category_name, 'Uncategorized') as category,
                        p.product_name, p.sku, p.unit_price as unit_cost, 
                        p.pos_price as srp, i.actual as stock,
                        (i.actual * p.unit_price) as total_cost
                    FROM products p
                    JOIN inventory i ON p.product_id = i.product_id
                    LEFT JOIN categories c ON p.category_id = c.category_id
                    WHERE (%s IS NULL OR p.category_id = %s)
                    ORDER BY 1, 2
                """, (payload.category_id, payload.category_id))
                product_list = cur.fetchall()

                cur.execute("""
                    SELECT 
                        COALESCE(c.category_name, 'Uncategorized') as category,
                        SUM(i.actual * p.unit_price) as total_category_cost
                    FROM products p
                    JOIN inventory i ON p.product_id = i.product_id
                    LEFT JOIN categories c ON p.category_id = c.category_id
                    WHERE (%s IS NULL OR p.category_id = %s)
                    GROUP BY 1
                    ORDER BY 2 DESC
                """, (payload.category_id, payload.category_id))
                investment_summary = cur.fetchall()

                report_data = {
                    "products": product_list,
                    "investment_summary": investment_summary
                }

            elif payload.report_type == "supplier":
                cur.execute("""
                    SELECT 
                        s.supplier_name, s.status, s.contact_number, s.email,
                        COUNT(po.order_id) as po_count,
                        SUM(COALESCE((SELECT SUM(quantity * unit_price) FROM purchase_order_items WHERE order_id = po.order_id), 0)) as total_spent,
                        AVG(CASE WHEN po.received_at IS NOT NULL THEN EXTRACT(DAY FROM (po.received_at - po.created_at)) ELSE NULL END) as avg_lead_time
                    FROM supplier s
                    LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id
                    WHERE (%s IS NULL OR s.status = %s)
                      AND (%s IS NULL OR s.supplier_id = %s)
                    GROUP BY s.supplier_id
                    ORDER BY 5 DESC
                """, (payload.status, payload.status, payload.supplier_id, payload.supplier_id))
                supplier_stats = cur.fetchall()

                report_data = {
                    "suppliers": supplier_stats
                }

            elif payload.report_type == "orders_returns":
                cur.execute("""
                    SELECT order_id, created_at, status, expected_delivery
                    FROM purchase_orders
                    WHERE (%s IS NULL OR status = %s)
                      AND (%s IS NULL OR supplier_id = %s)
                    ORDER BY created_at DESC
                    LIMIT 20
                """, (payload.status, payload.status, payload.supplier_id, payload.supplier_id))
                po_list = cur.fetchall()

                cur.execute("""
                    SELECT rma_number, sale_id, customer_name, return_type, reason
                    FROM customer_returns
                    WHERE (%s IS NULL OR return_type = %s)
                    ORDER BY return_date DESC
                    LIMIT 20
                """, (payload.status, payload.status))
                customer_returns = cur.fetchall()

                cur.execute("""
                    SELECT 
                        pr.return_id, 
                        s.supplier_name, 
                        pr.status, 
                        pr.created_at, 
                        pr.reason, 
                        COALESCE(SUM(pri.quantity), 0) AS total_quantity
                    FROM product_returns pr
                    JOIN supplier s ON pr.supplier_id = s.supplier_id
                    LEFT JOIN product_return_items pri ON pr.return_id = pri.return_id
                    WHERE (%s IS NULL OR pr.status = %s)
                      AND (%s IS NULL OR pr.supplier_id = %s)
                    GROUP BY pr.return_id, s.supplier_name, pr.status, pr.created_at, pr.reason
                    ORDER BY pr.created_at DESC
                    LIMIT 20
                """, (payload.status, payload.status, payload.supplier_id, payload.supplier_id))
                supplier_returns = cur.fetchall()

                report_data = {
                    "purchase_orders": po_list,
                    "customer_returns": customer_returns,
                    "supplier_returns": supplier_returns
                }

            # 3. Log into generated_reports
            cur.execute("""
                INSERT INTO generated_reports (report_type, start_date, end_date, generated_by, report_data)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING report_id
            """, (payload.report_type, payload.start_date, payload.end_date, username, json.dumps(report_data, default=str)))
            report_id = cur.fetchone()["report_id"]

            return {"report_id": report_id, "report_data": report_data}

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
