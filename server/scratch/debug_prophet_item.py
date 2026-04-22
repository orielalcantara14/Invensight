from database import get_connection
import psycopg2.extras
from analytics_engine import load_daily_product_sales
from prophet_timeseries import run_prophet_daily_forecast
import math

def debug_prophet():
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # HONDA BLUE SCT 800ML
    cur.execute("SELECT product_id FROM products WHERE product_name = 'HONDA BLUE SCT 800ML'")
    pid = cur.fetchone()['product_id']
    
    start, actuals = load_daily_product_sales(cur, pid, 730)
    print(f"Actuals (last 10): {actuals[-10:]}")
    print(f"Sum Actuals: {sum(actuals)}")
    
    res = run_prophet_daily_forecast(start, 730, actuals)
    if res:
        denoised = res[19] # Last element
        print(f"Denoised Actuals (last 10): {denoised[-10:]}")
        next_30d = res[8]
        accuracy = res[9]
        print(f"Prophet Prediction (next 30d): {next_30d:.2f}")
        print(f"Accuracy: {accuracy:.2f}%")
        print(f"Daily Avg Predicted: {next_30d/30.0:.2f}")
    
    conn.close()

if __name__ == "__main__":
    debug_prophet()
