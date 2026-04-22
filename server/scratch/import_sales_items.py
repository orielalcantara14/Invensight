import csv
import sys
import os
from datetime import datetime
from collections import Counter

# Add parent directory to path to find models/database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_connection

def import_sales_data(csv_path):
    conn = get_connection()
    cur = conn.cursor()
    
    # 1. Sync sequence to avoid PK conflicts
    cur.execute("SELECT setval('sales_invoice_id_seq', (SELECT COALESCE(MAX(invoice_id), 0) FROM sales))")
    
    # 2. Load product mapping
    cur.execute("SELECT product_id, product_name FROM products")
    products = {row[1].strip().upper(): row[0] for row in cur.fetchall()}
    print(f"Loaded {len(products)} products for mapping.")
    
    # 2. Load existing sales for frequency-based deduplication
    print("Loading existing sales and counting occurrences per day...")
    cur.execute("""
        SELECT s.invoice_date, si.product_id, si.quantity 
        FROM sales s 
        JOIN sold_items si ON s.invoice_id = si.invoice_id
    """)
    # Key: (date_str, product_id, quantity), Value: count
    existing_counts = Counter()
    for row in cur.fetchall():
        existing_counts[(row[0].isoformat(), row[1], float(row[2]))] += 1
    
    print(f"Found {sum(existing_counts.values())} existing records in database.")
    
    # 3. Read CSV and count occurrences
    print("Reading CSV...")
    csv_rows = []
    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_date = row['DATE'].split(' ')[0]
            try:
                dt = datetime.strptime(raw_date, '%Y-%m-%d').date()
            except:
                try:
                    dt = datetime.strptime(row['DATE'], '%Y-%m-%d').date()
                except:
                    continue
            
            prod_name = row['Product Name'].strip().upper()
            if prod_name not in products:
                continue
                
            pid = products[prod_name]
            qty = float(row['Quantity'] or 0)
            unit_price = float(row['Unit Price'] or 0)
            total = float(row['Total'] or 0)
            
            csv_rows.append({
                'date': dt,
                'pid': pid,
                'qty': qty,
                'unit_price': unit_price,
                'total': total,
                'key': (dt.isoformat(), pid, qty)
            })
            
    print(f"Read {len(csv_rows)} valid rows from CSV.")
    
    # 4. Import missing occurrences
    imported_count = 0
    skipped_count = 0
    current_counts = Counter() # To track how many we've "matched" or imported during this run
    
    BATCH_TAG = "BATCH_IMPORT_20260422"
    
    print("Importing missing items...")
    for row in csv_rows:
        key = row['key']
        
        # How many of this item (same day, same qty) do we ALREADY have?
        already_have = existing_counts[key]
        
        # How many have we already "skipped" or "imported" in this loop?
        seen_in_loop = current_counts[key]
        
        if seen_in_loop < already_have:
            # We already have this occurrence in the DB, skip it
            current_counts[key] += 1
            skipped_count += 1
            continue
        
        # If we reach here, this is a "new" occurrence (e.g. 2nd sale of item on same day)
        try:
            cur.execute("""
                INSERT INTO sales (
                    invoice_date, total_amount, tax_amount, service_charge,
                    customer_info, payment_method, cash_received, cash_given, change_amount,
                    payment_status, user_id, transaction_timestamp
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING invoice_id
            """, (
                row['date'], row['total'], 0.0, 0.0,
                f"Walk In ({BATCH_TAG})", 'Cash', row['total'], row['total'], 0.0,
                'Paid', 8, datetime.combine(row['date'], datetime.min.time())
            ))
            
            invoice_id = cur.fetchone()[0]
            
            cur.execute("""
                INSERT INTO sold_items (invoice_id, product_id, quantity, unit_price, subtotal, total_amount)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (invoice_id, row['pid'], row['qty'], row['unit_price'], row['total'], row['total']))
            
            imported_count += 1
            current_counts[key] += 1
            
            if imported_count % 500 == 0:
                print(f"Imported {imported_count}...")
        except Exception as e:
            print(f"Error importing row {row['key']}: {e}")
            import traceback
            traceback.print_exc()
            
    conn.commit()
    conn.close()
    print(f"SUCCESS: Imported {imported_count} missing items. Skipped {skipped_count} existing items.")

if __name__ == "__main__":
    import_sales_data('../Sales_Data.csv')
