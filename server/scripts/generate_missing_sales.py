import os
import random
import decimal
from datetime import datetime, date, timedelta, time
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

RENDER_DB_URL = os.getenv("DATABASE_URL")
LOCAL_DB_PARAMS = {
    "host": "localhost",
    "port": 5432,
    "dbname": "InvenSight",
    "user": "postgres",
    "password": "Rocketman09"
}

CUSTOMER_NAMES = [
    "Walk In customer", "Walk In customer", "Walk In customer", "Walk In customer",
    "Mark Anthony Santos", "Carlo Reyes", "Joshua Garcia", "Christian Ramos",
    "Jayson Cruz", "Jerome Bautista", "Ryan Mendoza", "John Paul Ramos",
    "Michael Tan", "Angelo Flores", "Rommel Gonzales", "Eduardo Castro",
    "Bryan Dela Cruz", "Gerald Pascual", "Kenneth Navarro", "Jeffrey Mercado",
    "Aldrin Villanueva", "Dennis Aquino", "Marvin Tolentino", "Richard Soriano",
    "Edgar Salcedo", "Neil Domingo", "Dexter Fernandez", "Arvin Gutierrez"
]

CASHIERS = [2, 7, 10, 12]
MECHANICS = ["Danly", "Rovhic", "Cedie", "Robek", None, None, None]

def get_db_connections():
    conns = []
    if RENDER_DB_URL:
        try:
            r_conn = psycopg2.connect(RENDER_DB_URL)
            conns.append(("Render Cloud DB", r_conn))
            print("Connected to Render Cloud DB.")
        except Exception as e:
            print(f"Could not connect to Render DB: {e}")

    try:
        l_conn = psycopg2.connect(**LOCAL_DB_PARAMS)
        conns.append(("Local PostgreSQL DB", l_conn))
        print("Connected to Local PostgreSQL DB.")
    except Exception as e:
        print(f"Could not connect to Local DB: {e}")

    return conns

def run_simulation():
    conns = get_db_connections()
    if not conns:
        print("No database connections available!")
        return

    # Use first connection to load product catalog and weights
    primary_name, primary_conn = conns[0]
    with primary_conn.cursor() as cur:
        cur.execute("""
            SELECT 
                p.product_id,
                p.product_name,
                p.unit_price,
                p.unit_cost,
                COALESCE(count_si.cnt, 1) as sales_freq,
                COALESCE(p.is_service, false) as is_service
            FROM products p
            LEFT JOIN (
                SELECT product_id, COUNT(*) as cnt 
                FROM sold_items 
                GROUP BY product_id
            ) count_si ON p.product_id = count_si.product_id
            WHERE p.status = 'Active' OR p.status IS NULL
        """)
        raw_products = cur.fetchall()

    if not raw_products:
        print("No products found in catalog!")
        return

    products_list = []
    weights = []
    for p in raw_products:
        p_id, p_name, u_price, u_cost, freq, is_srv = p
        price = float(u_price) if u_price is not None else 50.0
        if price <= 0:
            price = 50.0
        products_list.append({
            "product_id": p_id,
            "product_name": p_name,
            "unit_price": price,
            "is_service": is_srv
        })
        weights.append(max(1, int(freq)))

    # Date range: 2026-06-20 to 2026-08-22
    start_dt = date(2026, 6, 20)
    end_dt = date(2026, 8, 22)
    current_dt = start_dt

    daily_dates = []
    while current_dt <= end_dt:
        daily_dates.append(current_dt)
        current_dt += timedelta(days=1)

    print(f"Generating realistic sales for {len(daily_dates)} days ({start_dt} to {end_dt})...")

    # Generate data structure in memory first so identical data is committed to all targets
    transactions_batch = []
    random.seed(42) # Deterministic for consistent realism

    for cur_date in daily_dates:
        is_weekend = cur_date.weekday() in (5, 6) # Saturday, Sunday
        is_payday = cur_date.day in (15, 16, 30, 31)

        # Baseline tx count
        if is_weekend:
            tx_count = random.randint(15, 22)
        else:
            tx_count = random.randint(11, 16)

        if is_payday:
            tx_count += random.randint(2, 4)

        # Generate timestamps spread throughout the day (8:30 AM to 6:45 PM)
        # Higher density around 11:00-13:30 and 16:30-18:00
        seconds_pool = []
        for _ in range(tx_count):
            if random.random() < 0.45: # Lunch rush
                sec = random.randint(11 * 3600, int(13.5 * 3600))
            elif random.random() < 0.35: # Late afternoon rush
                sec = random.randint(int(16.5 * 3600), int(18.75 * 3600))
            else: # Morning / early afternoon
                sec = random.randint(int(8.5 * 3600), int(16.5 * 3600))
            seconds_pool.append(sec)

        seconds_pool.sort()

        for sec in seconds_pool:
            tx_time = (datetime.combine(cur_date, time(0, 0)) + timedelta(seconds=sec))
            
            # Number of distinct items in this basket
            basket_size = random.choices([1, 2, 3, 4], weights=[60, 25, 10, 5])[0]
            chosen_prods = random.choices(products_list, weights=weights, k=basket_size)

            items_data = []
            subtotal_sum = 0.0

            for prod in chosen_prods:
                qty = random.choices([1, 2, 3], weights=[85, 10, 5])[0]
                u_price = prod["unit_price"]
                item_subtotal = round(u_price * qty, 2)
                subtotal_sum += item_subtotal
                mechanic = random.choice(MECHANICS)
                items_data.append({
                    "product_id": prod["product_id"],
                    "quantity": qty,
                    "unit_price": u_price,
                    "subtotal": item_subtotal,
                    "mechanic_name": mechanic
                })

            total_amount = round(subtotal_sum, 2)
            tax_amount = round(total_amount * 0.03, 2)

            customer = random.choice(CUSTOMER_NAMES)
            cashier_id = random.choice(CASHIER_NAMES if 'CASHIER_NAMES' in locals() else CASHIERS)
            contact = f"09{random.randint(100000000, 999999999)}" if customer != "Walk In customer" else None

            pay_method = random.choices(["Cash", "GCash", "Credit Card"], weights=[75, 20, 5])[0]

            if pay_method == "Cash":
                # Realistic cash given (e.g. rounded to 100, 500, 1000)
                if total_amount <= 100:
                    cash_received = float(random.choice([100, 200, 500]) if total_amount > 50 else random.choice([50, 100, total_amount]))
                elif total_amount <= 500:
                    cash_received = float(random.choice([500, 1000]) if random.random() < 0.7 else total_amount)
                elif total_amount <= 1000:
                    cash_received = float(1000 if total_amount <= 1000 and random.random() < 0.6 else random.choice([1000, 1500, 2000]))
                else:
                    cash_received = float(int((total_amount + 499) // 500) * 500)
                if cash_received < total_amount:
                    cash_received = total_amount
                change_amount = round(cash_received - total_amount, 2)
            else:
                cash_received = total_amount
                change_amount = 0.0

            transactions_batch.append({
                "pos_terminal_id": 1,
                "user_id": cashier_id,
                "invoice_date": cur_date,
                "total_amount": total_amount,
                "tax_amount": tax_amount,
                "service_charge": 0.0,
                "transaction_timestamp": tx_time,
                "customer_info": customer,
                "customer_name": customer,
                "contact_number": contact,
                "payment_method": pay_method,
                "payment_status": "Paid",
                "cash_received": cash_received,
                "cash_given": cash_received,
                "change_amount": change_amount,
                "items": items_data
            })

    total_sales_to_insert = len(transactions_batch)
    total_items_to_insert = sum(len(t["items"]) for t in transactions_batch)
    total_revenue_generated = sum(t["total_amount"] for t in transactions_batch)

    print(f"Generated {total_sales_to_insert} sales ({total_items_to_insert} items), Total Revenue: PHP {total_revenue_generated:,.2f}")

    # Insert into each connected database
    for db_label, conn in conns:
        print(f"\n--- Inserting into {db_label} ---")
        try:
            with conn.cursor() as cur:
                # Find current max invoice_id, sold_item_id, payment_id
                cur.execute("SELECT COALESCE(MAX(invoice_id), 0) FROM sales")
                next_invoice_id = cur.fetchone()[0] + 1

                cur.execute("SELECT COALESCE(MAX(sold_item_id), 0) FROM sold_items")
                next_sold_item_id = cur.fetchone()[0] + 1

                cur.execute("SELECT COALESCE(MAX(payment_id), 0) FROM payments")
                next_payment_id = cur.fetchone()[0] + 1

                print(f"Starting IDs: invoice={next_invoice_id}, sold_item={next_sold_item_id}, payment={next_payment_id}")

                sales_rows = []
                sold_items_rows = []
                payments_rows = []

                inv_id = next_invoice_id
                si_id = next_sold_item_id
                pm_id = next_payment_id

                for tx in transactions_batch:
                    current_inv_id = inv_id
                    inv_id += 1

                    sales_rows.append((
                        current_inv_id,
                        tx["pos_terminal_id"],
                        tx["user_id"],
                        tx["invoice_date"],
                        tx["total_amount"],
                        tx["tax_amount"],
                        tx["customer_info"],
                        tx["payment_method"],
                        tx["payment_status"],
                        tx["service_charge"],
                        tx["transaction_timestamp"],
                        tx["cash_received"],
                        tx["change_amount"],
                        tx["cash_given"],
                        tx["contact_number"],
                        tx["customer_name"]
                    ))

                    for item in tx["items"]:
                        current_si_id = si_id
                        si_id += 1
                        sold_items_rows.append((
                            current_si_id,
                            current_inv_id,
                            item["product_id"],
                            item["quantity"],
                            item["unit_price"],
                            item["subtotal"],
                            item["subtotal"],
                            item["mechanic_name"]
                        ))

                    payments_rows.append((
                        pm_id,
                        current_inv_id,
                        tx["payment_method"],
                        tx["total_amount"],
                        tx["transaction_timestamp"]
                    ))
                    pm_id += 1

                # Bulk insert sales
                psycopg2.extras.execute_batch(
                    cur,
                    """
                    INSERT INTO sales (
                        invoice_id, pos_terminal_id, user_id, invoice_date, total_amount,
                        tax_amount, customer_info, payment_method, payment_status,
                        service_charge, transaction_timestamp, cash_received, change_amount,
                        cash_given, contact_number, customer_name
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    sales_rows,
                    page_size=500
                )

                # Bulk insert sold_items
                psycopg2.extras.execute_batch(
                    cur,
                    """
                    INSERT INTO sold_items (
                        sold_item_id, invoice_id, product_id, quantity, unit_price, subtotal, total_amount, mechanic_name
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    sold_items_rows,
                    page_size=500
                )

                # Bulk insert payments
                psycopg2.extras.execute_batch(
                    cur,
                    """
                    INSERT INTO payments (
                        payment_id, invoice_id, payment_method, amount_paid, transaction_timestamp
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    payments_rows,
                    page_size=500
                )

                # Invalidate analytics cache so charts/metrics refresh
                cur.execute("UPDATE analytics_model_cache SET status = 'stale'")
                conn.commit()
                print(f"Successfully committed {len(sales_rows)} sales and {len(sold_items_rows)} items to {db_label}.")
        except Exception as e:
            conn.rollback()
            print(f"Error inserting into {db_label}: {e}")
        finally:
            conn.close()

    print("\nAll database updates complete!")

if __name__ == "__main__":
    run_simulation()
