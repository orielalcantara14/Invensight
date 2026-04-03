
from fastapi import APIRouter, HTTPException, Query
from database import get_connection
from models import DashboardStatsResponse, SalesTrendItem, SalesByCategoryItem, TopProductItem, SalesPerformancePoint
import psycopg2.extras

router = APIRouter()


def _sales_performance_all_empty(points: list[SalesPerformancePoint]) -> bool:
    return not points or all(p.revenue == 0.0 and p.transactions == 0 for p in points)


def _fetch_sales_performance_series(cur, view: str) -> list[SalesPerformancePoint]:
    """
    Full buckets for the chart (zeros where there were no sales) so bars/lines are not stretched
    across two lone points.
    """
    if view == "daily":
        # Month-to-date: first day of current month (e.g. 1 Apr 2026) through today, one point per day
        cur.execute(
            """
            WITH days AS (
                SELECT generate_series(
                    date_trunc('month', CURRENT_DATE)::date,
                    CURRENT_DATE::date,
                    INTERVAL '1 day'
                )::date AS d
            ),
            agg AS (
                SELECT invoice_date::date AS d,
                       COALESCE(SUM(total_amount), 0)::float AS revenue,
                       COUNT(*)::int AS cnt
                FROM sales
                WHERE invoice_date::date >= date_trunc('month', CURRENT_DATE)::date
                  AND invoice_date::date <= CURRENT_DATE
                GROUP BY 1
            )
            SELECT TO_CHAR(days.d, 'Mon DD') AS label,
                   COALESCE(agg.revenue, 0)::float AS revenue,
                   COALESCE(agg.cnt, 0)::int AS transactions
            FROM days
            LEFT JOIN agg ON agg.d = days.d
            ORDER BY days.d
            """
        )
    elif view == "annual":
        cur.execute(
            """
            WITH years AS (
                SELECT generate_series(
                    (EXTRACT(YEAR FROM CURRENT_DATE)::int - 5),
                    EXTRACT(YEAR FROM CURRENT_DATE)::int,
                    1
                ) AS y
            ),
            agg AS (
                SELECT EXTRACT(YEAR FROM invoice_date)::int AS y,
                       COALESCE(SUM(total_amount), 0)::float AS revenue,
                       COUNT(*)::int AS cnt
                FROM sales
                GROUP BY 1
            )
            SELECT years.y::text AS label,
                   COALESCE(agg.revenue, 0)::float AS revenue,
                   COALESCE(agg.cnt, 0)::int AS transactions
            FROM years
            LEFT JOIN agg ON agg.y = years.y
            ORDER BY years.y
            """
        )
    else:
        cur.execute(
            """
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', CURRENT_DATE)::date - INTERVAL '11 months',
                    date_trunc('month', CURRENT_DATE)::date,
                    INTERVAL '1 month'
                )::date AS m
            ),
            agg AS (
                SELECT date_trunc('month', invoice_date)::date AS m,
                       COALESCE(SUM(total_amount), 0)::float AS revenue,
                       COUNT(*)::int AS cnt
                FROM sales
                GROUP BY 1
            )
            SELECT TO_CHAR(months.m, 'Mon YYYY') AS label,
                   COALESCE(agg.revenue, 0)::float AS revenue,
                   COALESCE(agg.cnt, 0)::int AS transactions
            FROM months
            LEFT JOIN agg ON agg.m = months.m
            ORDER BY months.m
            """
        )

    out: list[SalesPerformancePoint] = []
    for row in cur.fetchall():
        out.append(
            SalesPerformancePoint(
                label=str(row["label"]).strip(),
                revenue=float(row["revenue"] or 0),
                transactions=int(row["transactions"] or 0),
            )
        )
    if _sales_performance_all_empty(out):
        return []
    return out


def _prior_window_forecast(actuals: list[float], window: int) -> list[float]:
    """Simple benchmark line: each point = mean of up to `window` prior actuals (same month uses last known trend)."""
    out: list[float] = []
    for i in range(len(actuals)):
        if i == 0:
            out.append(actuals[0])
            continue
        start = max(0, i - window)
        prior = actuals[start:i]
        out.append(sum(prior) / len(prior) if prior else actuals[i])
    return out


def _build_sales_trend_from_rows(labels: list[str], actuals: list[float], window: int) -> list[SalesTrendItem]:
    if not actuals or all(a == 0 for a in actuals):
        return []
    forecasts = _prior_window_forecast(actuals, window)
    return [
        SalesTrendItem(month=labels[i], actual_sales=actuals[i], forecast_sales=forecasts[i])
        for i in range(len(labels))
    ]


def _fetch_sales_trend_series(cur, view: str) -> list[SalesTrendItem]:
    if view == "daily":
        cur.execute(
            """
            WITH days AS (
                SELECT generate_series(
                    date_trunc('month', CURRENT_DATE)::date,
                    CURRENT_DATE::date,
                    INTERVAL '1 day'
                )::date AS d
            ),
            agg AS (
                SELECT invoice_date::date AS d,
                       COALESCE(SUM(total_amount), 0)::float AS revenue
                FROM sales
                WHERE invoice_date::date >= date_trunc('month', CURRENT_DATE)::date
                  AND invoice_date::date <= CURRENT_DATE
                GROUP BY 1
            )
            SELECT TO_CHAR(days.d, 'Mon DD') AS label,
                   COALESCE(agg.revenue, 0)::float AS revenue
            FROM days
            LEFT JOIN agg ON agg.d = days.d
            ORDER BY days.d
            """
        )
        rows = cur.fetchall()
        labels = [str(r["label"]).strip() for r in rows]
        actuals = [float(r["revenue"]) for r in rows]
        return _build_sales_trend_from_rows(labels, actuals, window=7)

    if view == "annual":
        cur.execute(
            """
            WITH years AS (
                SELECT generate_series(
                    (EXTRACT(YEAR FROM CURRENT_DATE)::int - 5),
                    EXTRACT(YEAR FROM CURRENT_DATE)::int,
                    1
                ) AS y
            ),
            agg AS (
                SELECT EXTRACT(YEAR FROM invoice_date)::int AS y,
                       COALESCE(SUM(total_amount), 0)::float AS revenue
                FROM sales
                GROUP BY 1
            )
            SELECT years.y::text AS label,
                   COALESCE(agg.revenue, 0)::float AS revenue
            FROM years
            LEFT JOIN agg ON agg.y = years.y
            ORDER BY years.y
            """
        )
        rows = cur.fetchall()
        labels = [str(r["label"]).strip() for r in rows]
        actuals = [float(r["revenue"]) for r in rows]
        return _build_sales_trend_from_rows(labels, actuals, window=2)

    # monthly (default): last 6 calendar months including current
    cur.execute(
        """
        WITH months AS (
            SELECT generate_series(
                date_trunc('month', CURRENT_DATE)::date - INTERVAL '5 months',
                date_trunc('month', CURRENT_DATE)::date,
                INTERVAL '1 month'
            )::date AS m
        ),
        agg AS (
            SELECT date_trunc('month', invoice_date)::date AS m,
                   COALESCE(SUM(total_amount), 0)::float AS revenue
            FROM sales
            GROUP BY 1
        )
        SELECT TO_CHAR(months.m, 'Mon') AS label,
               COALESCE(agg.revenue, 0)::float AS revenue
        FROM months
        LEFT JOIN agg ON agg.m = months.m
        ORDER BY months.m
        """
    )
    rows = cur.fetchall()
    labels = [str(r["label"]).strip() for r in rows]
    actuals = [float(r["revenue"]) for r in rows]
    return _build_sales_trend_from_rows(labels, actuals, window=3)


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

            sales_performance = _fetch_sales_performance_series(cur, view)

            sales_trend = _fetch_sales_trend_series(cur, view)

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
