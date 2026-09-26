import os
import re
import psycopg2
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from utils.audit import enrich_audit_narrative

load_dotenv()

def run():
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
            
            cur.execute("""
                SELECT a.log_id, u.username, u.role, a.action, a.entity_type, a.entity_id, a.timestamp, a.details
                FROM auditlog a
                LEFT JOIN users u ON a.user_id = u.user_id
                ORDER BY a.log_id ASC
            """)
            rows = cur.fetchall()
            print(f"  Found {len(rows)} audit log rows in {db_name}.")
            
            updated_count = 0
            for r in rows:
                log_id, username, role, action, entity_type, entity_id, timestamp, raw_details = r
                enriched = enrich_audit_narrative(username, role, action, entity_type, entity_id, raw_details, dt=timestamp)
                cur.execute("UPDATE auditlog SET details = %s WHERE log_id = %s", (enriched, log_id))
                updated_count += 1
                
            conn.commit()
            print(f"  Successfully re-enriched {updated_count} rows in {db_name} with Philippine Time (UTC+8).")
            cur.close()
            conn.close()
        except Exception as e:
            print(f"  Error on {db_name}: {e}")

if __name__ == "__main__":
    run()
