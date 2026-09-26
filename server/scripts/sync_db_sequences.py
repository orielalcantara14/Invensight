import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def sync_sequences():
    db_urls = [
        ("Cloud Render DB", os.getenv("DATABASE_URL")),
        ("Local PostgreSQL", os.getenv("LOCAL_DATABASE_URL", "postgresql://postgres:Rocketman09@localhost:5432/InvenSight"))
    ]
    
    for db_name, db_url in db_urls:
        if not db_url:
            continue
        try:
            print(f"Connecting to {db_name}...")
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            
            # Find all tables with primary key sequence columns
            cur.execute("""
                SELECT 
                    c.table_name, 
                    c.column_name, 
                    pg_get_serial_sequence(c.table_name, c.column_name) as seq_name
                FROM information_schema.columns c
                JOIN information_schema.tables t ON c.table_name = t.table_name
                WHERE t.table_schema = 'public' 
                  AND t.table_type = 'BASE TABLE'
                  AND c.column_default LIKE 'nextval%'
            """)
            sequences = cur.fetchall()
            print(f"  Found {len(sequences)} autoincrement sequence columns in {db_name}.")
            
            for table_name, col_name, seq_name in sequences:
                if not seq_name:
                    # Try default sequence naming convention
                    seq_name = f"{table_name}_{col_name}_seq"
                    
                cur.execute(f"SELECT COALESCE(MAX({col_name}), 0) FROM {table_name}")
                max_val = cur.fetchone()[0]
                new_seq_val = max(max_val, 1)
                
                try:
                    cur.execute(f"SELECT setval(%s, %s, true)", (seq_name, new_seq_val))
                    print(f"    Synced {table_name}.{col_name} ({seq_name}) -> {new_seq_val}")
                except Exception as seq_err:
                    print(f"    Warning on {table_name}.{col_name}: {seq_err}")
                    conn.rollback()
                    continue
                    
            # Specifically ensure sales invoice_id sequence
            cur.execute("SELECT COALESCE(MAX(invoice_id), 0) FROM sales")
            max_inv = cur.fetchone()[0]
            cur.execute("SELECT setval(pg_get_serial_sequence('sales', 'invoice_id'), %s, true)", (max_inv,))
            print(f"  Explicitly synced sales.invoice_id sequence to {max_inv}.")
            
            conn.commit()
            cur.close()
            conn.close()
            print(f"Successfully synchronized all sequences in {db_name}.\n")
        except Exception as e:
            print(f"Error on {db_name}: {e}\n")

if __name__ == "__main__":
    sync_sequences()
