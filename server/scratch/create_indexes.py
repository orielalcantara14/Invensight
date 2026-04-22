from database import get_connection

def create_indexes():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            print("Creating idx_sales_invoice_date...")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON sales(invoice_date)")
            print("Creating idx_sold_items_invoice_id...")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_sold_items_invoice_id ON sold_items(invoice_id)")
            conn.commit()
            print("Indexes created successfully.")
    finally:
        conn.close()

if __name__ == "__main__":
    create_indexes()
