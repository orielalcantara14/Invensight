
import os
import sys

# Add server to path
sys.path.append(os.path.join(os.getcwd(), 'server'))

try:
    from database import get_connection
except ImportError:
    # Try different path
    sys.path.append(os.getcwd())
    from server.database import get_connection

from datetime import date

conn = get_connection()
try:
    with conn.cursor() as cur:
        # Check sales on April 22
        cur.execute("SELECT SUM(total_amount) FROM sales WHERE invoice_date = '2026-04-22'")
        sales = cur.fetchone()[0] or 0
        print(f"Sales on 2026-04-22: {sales}")

        # Check returns on April 22
        cur.execute("SELECT SUM(refund_amount) FROM customer_returns WHERE return_date = '2026-04-22'")
        returns = cur.fetchone()[0] or 0
        print(f"Returns on 2026-04-22: {returns}")
finally:
    conn.close()
