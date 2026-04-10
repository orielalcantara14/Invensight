import psycopg2.extras
from database import get_connection

def populate_historical_refunds():
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        print("Fetching existing Refund entries...")
        # Get all returns with type 'Refund'
        cur.execute("""
            SELECT return_id, sale_id 
            FROM customer_returns 
            WHERE return_type = 'Refund'
        """)
        returns = cur.fetchall()
        
        updated_count = 0
        for ret in returns:
            return_id = ret["return_id"]
            sale_id = ret["sale_id"]
            
            # Fetch returned items for this specific return
            cur.execute("SELECT product_id, quantity FROM customer_return_items WHERE return_id = %s", (return_id,))
            returned_items = cur.fetchall()
            
            total_refund = 0.0
            for item in returned_items:
                # Lookup the unit price from the specific sale's records
                cur.execute("SELECT unit_price FROM sold_items WHERE invoice_id = %s AND product_id = %s", (sale_id, item["product_id"]))
                si = cur.fetchone()
                if si:
                    total_refund += float(si["unit_price"]) * item["quantity"]
                else:
                    # Fallback to product table if not in sold_items (rare, for very old data maybe)
                    cur.execute("SELECT unit_price FROM products WHERE product_id = %s", (item["product_id"],))
                    p = cur.fetchone()
                    if p:
                        total_refund += float(p["unit_price"]) * item["quantity"]
            
            if total_refund > 0:
                cur.execute("UPDATE customer_returns SET refund_amount = %s WHERE return_id = %s", (total_refund, return_id))
                updated_count += 1
                
        conn.commit()
        print(f"Successfully updated {updated_count} historical refund records.")
    except Exception as e:
        print(f"Update failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    populate_historical_refunds()
