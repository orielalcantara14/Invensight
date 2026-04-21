import os
import psycopg2
import psycopg2.extras
import random
from datetime import date, datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv('c:/Users/rovhi/Desktop/InvenSight/server/.env')

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "InvenSight"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "Rocketman09")
    )

def regenerate_sales():
    conn = get_connection()
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cutoff_date = '2026-03-23'
            current_date = date.today()
            print(f"Target Period: {cutoff_date} to {current_date}")

            # 1. Restore inventory from "bad" sales
            print("Restoring inventory from bad sales...")
            cur.execute("""
                SELECT si.product_id, SUM(si.quantity) as total_qty
                FROM sold_items si
                JOIN sales s ON si.invoice_id = s.invoice_id
                WHERE s.invoice_date >= %s
                GROUP BY si.product_id
            """, (cutoff_date,))
            bad_sales_totals = cur.fetchall()
            for item in bad_sales_totals:
                cur.execute("""
                    UPDATE inventory 
                    SET quantity = quantity + %s, 
                        expected = expected + %s, 
                        actual = actual + %s 
                    WHERE product_id = %s
                """, (item['total_qty'], item['total_qty'], item['total_qty'], item['product_id']))
            print(f"Restored stock for {len(bad_sales_totals)} products.")

            # 2. Delete bad records
            print("Deleting bad records...")
            cur.execute("DELETE FROM sold_items WHERE invoice_id IN (SELECT invoice_id FROM sales WHERE invoice_date >= %s)", (cutoff_date,))
            cur.execute("DELETE FROM payments WHERE invoice_id IN (SELECT invoice_id FROM sales WHERE invoice_date >= %s)", (cutoff_date,))
            cur.execute("DELETE FROM inventory_stock_events WHERE reference_id IN (SELECT CAST(invoice_id AS VARCHAR) FROM sales WHERE invoice_date >= %s) AND reference_type='sales'", (cutoff_date,))
            cur.execute("DELETE FROM sales WHERE invoice_date >= %s", (cutoff_date,))
            print("Cleanup complete.")

            # 3. Fetch top products to use for generation
            # We use active, non-archived products
            cur.execute("""
                SELECT p.product_id, p.product_name, p.unit_price, i.inventory_id
                FROM products p
                JOIN inventory i ON p.product_id = i.product_id
                WHERE p.status = 'Active'
                LIMIT 50
            """)
            available_products = cur.fetchall()
            if not available_products:
                raise Exception("No active products found to generate sales.")

            # 4. Find a valid user ID to associate with sales
            cur.execute("SELECT user_id FROM users LIMIT 1")
            user_row = cur.fetchone()
            if not user_row:
                raise Exception("No users found to associate with sales.")
            valid_user_id = user_row['user_id']

            # 5. Generate realistic sales
            start_dt = datetime.strptime(cutoff_date, '%Y-%m-%d').date()
            delta = current_date - start_dt
            
            target_daily_revenue = 3700.0
            
            print(f"Generating sales for {delta.days + 1} days using user_id {valid_user_id}...")
            for i in range(delta.days + 1):
                day = start_dt + timedelta(days=i)
                if day > current_date: break
                
                num_sales = random.randint(15, 20)
                daily_total = 0
                
                for s in range(num_sales):
                    # Generate a single sale
                    # Each sale has 1-3 items
                    num_items = random.randint(1, 3)
                    sale_items = random.sample(available_products, num_items)
                    
                    sale_subtotal = 0
                    items_data = []
                    for p in sale_items:
                        qty = random.randint(1, 2)
                        price = float(p['unit_price'] or 100.0)
                        item_subtotal = qty * price
                        sale_subtotal += item_subtotal
                        items_data.append({
                            'product_id': p['product_id'],
                            'qty': qty,
                            'price': price,
                            'subtotal': item_subtotal,
                            'inv_id': p['inventory_id']
                        })
                    
                    # Add some randomness to subtotal to hit target revenue roughly
                    # If we are over target for the day, maybe stop? 
                    # Actually let's just let it be slightly random.
                    
                    tax_amount = round(sale_subtotal * 0.03, 2)
                    total_amount = round(sale_subtotal + tax_amount, 2)
                    
                    # Insert Sale
                    cur.execute("""
                        INSERT INTO sales (
                            pos_terminal_id, user_id, invoice_date, total_amount,
                            tax_amount, customer_info, payment_method, payment_status,
                            service_charge, transaction_timestamp, cash_received, change_amount, cash_given
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING invoice_id
                    """, (
                        1, valid_user_id, day, total_amount, tax_amount, 
                        "Walk-in Customer", "Cash", "Paid",
                        0.0, datetime.combine(day, datetime.min.time()) + timedelta(hours=random.randint(9, 18), minutes=random.randint(0, 59)),
                        total_amount, 0.0, total_amount
                    ))
                    invoice_id = cur.fetchone()['invoice_id']
                    
                    # Insert Items and Update Stock
                    for item in items_data:
                        cur.execute("""
                            INSERT INTO sold_items (invoice_id, product_id, quantity, unit_price, subtotal, total_amount)
                            VALUES (%s, %s, %s, %s, %s, %s)
                        """, (invoice_id, item['product_id'], item['qty'], item['price'], item['subtotal'], item['subtotal']))
                        
                        # Fetch current stock before update
                        cur.execute("SELECT quantity, expected, actual FROM inventory WHERE product_id = %s FOR UPDATE", (item['product_id'],))
                        inv_row = cur.fetchone()
                        q_before = inv_row['quantity']
                        e_before = inv_row['expected']
                        a_before = inv_row['actual']

                        q_after = q_before - item['qty']
                        e_after = e_before - item['qty']
                        a_after = a_before - item['qty']

                        cur.execute("""
                            UPDATE inventory
                            SET quantity = %s,
                                expected = %s,
                                actual = %s,
                                last_updated = %s
                            WHERE product_id = %s
                        """, (q_after, e_after, a_after, day, item['product_id']))
                        
                        d_before = a_before - e_before
                        d_after = a_after - e_after

                        # Log Event with before/after values
                        cur.execute("""
                            INSERT INTO inventory_stock_events (
                                inventory_id, product_id, event_type,
                                quantity_before, quantity_after,
                                expected_before, expected_after,
                                actual_before, actual_after,
                                difference_before, difference_after,
                                quantity_delta, expected_delta, actual_delta,
                                reference_type, reference_id, reason
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            item['inv_id'], item['product_id'], "SALE",
                            q_before, q_after,
                            e_before, e_after,
                            a_before, a_after,
                            d_before, d_after,
                            -item['qty'], -item['qty'], -item['qty'],
                            "sales", invoice_id, f"Regenerated Sale (Invoice INV-{invoice_id})"
                        ))
                    
                    # Insert Payment
                    cur.execute("""
                        INSERT INTO payments (invoice_id, payment_method, amount_paid, transaction_timestamp)
                        VALUES (%s, %s, %s, %s)
                    """, (invoice_id, "Cash", total_amount, datetime.combine(day, datetime.min.time())))
                    
                    daily_total += total_amount
                
                print(f"Generated {num_sales} sales for {day}. Total Revenue: {daily_total:.2f}")

            conn.commit()
            print("Successfully regenerated all sales data.")

    except Exception as e:
        conn.rollback()
        print(f"Failed to regenerate sales: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    regenerate_sales()
