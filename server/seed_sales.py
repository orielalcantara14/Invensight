import random
from datetime import date, timedelta
from database import get_connection

def seed_sales():
    conn = get_connection()
    try:
        cur = conn.cursor()
        
        # Get active products to sell
        cur.execute("SELECT product_id, unit_price FROM products WHERE status = 'Active'")
        products = cur.fetchall()
        
        if not products:
            print("No active products to generate sales for.")
            return

        # Start 40 days ago to get enough data for prophet
        start_date = date.today() - timedelta(days=40)
        
        for i in range(40):
            current_date = start_date + timedelta(days=i)
            # Create 1 to 5 random sales per day
            num_sales = random.randint(1, 5) if random.random() > 0.1 else 0 
            
            for _ in range(num_sales):
                items = random.sample(products, k=random.randint(1, min(3, len(products))))
                
                subtotal = 0
                tax = 0
                total = 0
                sale_items = []
                
                for p in items:
                    pid = p[0]
                    price = float(p[1])
                    qty = random.randint(1, 4)
                    item_total = price * qty
                    subtotal += item_total
                    sale_items.append((pid, qty, price, item_total))
                
                tax = subtotal * 0.03
                total = subtotal + tax
                cash = total + random.choice([0, 10, 50, 100])
                change = cash - total
                
                cur.execute(
                    """
                    INSERT INTO sales (pos_terminal_id, user_id, customer_info, payment_method, payment_status, 
                    tax_amount, service_charge, total_amount, cash_received, change_amount, cash_given, invoice_date, transaction_timestamp)
                    VALUES (1, 1, 'Walk-in', 'Cash', 'Paid', %s, 0, %s, %s, %s, %s, %s, %s)
                    RETURNING invoice_id
                    """,
                    (tax, total, cash, change, cash, current_date, current_date)
                )
                invoice_id = cur.fetchone()[0]
                
                # Insert sold_items
                for (pid, qty, price, item_total) in sale_items:
                    cur.execute(
                        """
                        INSERT INTO sold_items (invoice_id, product_id, quantity, unit_price, subtotal, total_amount)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (invoice_id, pid, qty, price, item_total, item_total)
                    )

        conn.commit()
        print("Successfully generated 40 days of sales history!")
    except Exception as e:
        conn.rollback()
        print(f"Error seeding sales: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_sales()
