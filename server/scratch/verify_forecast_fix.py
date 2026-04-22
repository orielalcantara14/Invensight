from database import get_connection
import psycopg2.extras
from analytics_engine import build_product_forecasts

def verify_fix():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            forecasts = build_product_forecasts(cur)
            print(f"Total forecasts: {len(forecasts)}")
            print("\nTop 10 forecasts (Sorted by Demand):")
            for f in forecasts[:10]:
                print(f"Product: {f.product_name:30} Demand: {f.predicted_demand_30d:10.2f} Conf: {f.confidence:5.2f}")
    finally:
        conn.close()

if __name__ == "__main__":
    verify_fix()
