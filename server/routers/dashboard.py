
from fastapi import APIRouter, HTTPException, Query
from database import get_connection
from models import DashboardStatsResponse, SalesTrendItem, SalesByCategoryItem, TopProductItem, SalesPerformancePoint
import psycopg2.extras
from datetime import datetime, date
import random

router = APIRouter()

@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(view: str = Query(default="monthly")):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT SUM(total_amount) as revenue, COUNT(*) as total FROM sales")
            sales_stats = cur.fetchone()
            total_revenue = float(sales_stats['revenue'] or 0.0)
            total_transactions = int(sales_stats['total'] or 0)

            cur.execute("SELECT COUNT(*) as count FROM sales WHERE payment_status = 'Paid'")
            completed_sales = cur.fetchone()['count']

            cur.execute("SELECT COUNT(*) as count FROM sales WHERE payment_status = 'Failed'")
            failed_payments = cur.fetchone()['count']

            if view == "daily":
                cur.execute("""
                    SELECT TO_CHAR(invoice_date, 'Mon DD') as label,
                           SUM(total_amount) as revenue,
                           COUNT(*) as transactions
                    FROM sales
                    WHERE invoice_date >= CURRENT_DATE - INTERVAL '30 days'
                    GROUP BY invoice_date
                    ORDER BY invoice_date
                """)
            elif view == "annual":
                cur.execute("""
                    SELECT TO_CHAR(invoice_date, 'YYYY') as label,
                           SUM(total_amount) as revenue,
                           COUNT(*) as transactions
                    FROM sales
                    GROUP BY TO_CHAR(invoice_date, 'YYYY')
                    ORDER BY label
                """)
            else:
                cur.execute("""
                    SELECT TO_CHAR(invoice_date, 'Mon YYYY') as label,
                           SUM(total_amount) as revenue,
                           COUNT(*) as transactions
                    FROM sales
                    GROUP BY TO_CHAR(invoice_date, 'Mon YYYY'), DATE_TRUNC('month', invoice_date)
                    ORDER BY DATE_TRUNC('month', invoice_date)
                """)

            sales_performance = []
            for row in cur.fetchall():
                sales_performance.append(SalesPerformancePoint(
                    label=row['label'],
                    revenue=float(row['revenue'] or 0),
                    transactions=int(row['transactions'] or 0)
                ))

            months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
            sales_trend = []
            base_values = [42000, 52000, 48000, 62000, 55000, 68000]
            forecast_offsets = [-2000, -3000, -1000, -4000, 1000, -2000]
            for i, month in enumerate(months):
                actual = base_values[i]
                forecast = actual + forecast_offsets[i]
                sales_trend.append(SalesTrendItem(
                    month=month,
                    actual_sales=float(actual),
                    forecast_sales=float(forecast)
                ))

            cur.execute("""
                SELECT c.category_name, SUM(si.total_amount) as value
                FROM sold_items si
                JOIN products p ON si.product_id = p.product_id
                JOIN categories c ON p.category_id = c.category_id
                GROUP BY c.category_name
                ORDER BY value DESC
            """)
            category_data = cur.fetchall()
            total_cat_value = sum(float(row['value']) for row in category_data)
            sales_by_category = []
            if not category_data:
                dummy_cats = [
                    ("Engine Parts", 35),
                    ("heels", 25),
                    ("Accessories", 20),
                    ("Electronics", 15),
                    ("Others", 5)
                ]
                for cat, perc in dummy_cats:
                    sales_by_category.append(SalesByCategoryItem(
                        category=cat,
                        value=perc * 1000,
                        percentage=float(perc)
                    ))
            else:
                for row in category_data:
                    val = float(row['value'])
                    sales_by_category.append(SalesByCategoryItem(
                        category=row['category_name'],
                        value=val,
                        percentage=round((val / total_cat_value) * 100, 1) if total_cat_value > 0 else 0
                    ))

            cur.execute("""
                SELECT 
                    p.product_name as name, 
                    SUM(si.quantity) as units_sold, 
                    i.quantity as current_stock,
                    i.reorder_level
                FROM sold_items si
                JOIN products p ON si.product_id = p.product_id
                JOIN inventory i ON p.product_id = i.product_id
                GROUP BY p.product_name, i.quantity, i.reorder_level
                ORDER BY units_sold DESC
                LIMIT 5
            """)
            top_products_raw = cur.fetchall()
            top_products = []
            for row in top_products_raw:
                stock = int(row['current_stock'] or 0)
                reorder = int(row['reorder_level'] or 10)
                if stock <= 0:
                    status = "Critical"
                elif stock <= reorder:
                    status = "Low"
                else:
                    status = "Normal"
                top_products.append(TopProductItem(
                    name=row['name'],
                    units_sold=int(row['units_sold'] or 0),
                    current_stock=stock,
                    status=status
                ))

            return DashboardStatsResponse(
                total_revenue=total_revenue,
                total_transactions=total_transactions,
                completed_sales=completed_sales,
                failed_payments=failed_payments,
                sales_performance=sales_performance,
                sales_trend=sales_trend,
                sales_by_category=sales_by_category,
                top_products=top_products
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
