import os
import subprocess
import sys
from datetime import datetime

pg_dump_path = r"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
if not os.path.exists(pg_dump_path):
    print("pg_dump not found at", pg_dump_path)
    sys.exit(1)

out_dir = r"c:\Users\MY PC\Desktop\InvenSight\database"
os.makedirs(out_dir, exist_ok=True)

date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
sql_file = os.path.join(out_dir, f"invensight_backup_{date_str}.sql")
dump_file = os.path.join(out_dir, f"invensight_backup_{date_str}.dump")
latest_sql = os.path.join(out_dir, "invensight_backup_latest.sql")
latest_dump = os.path.join(out_dir, "invensight_backup_latest.dump")

env = os.environ.copy()
env["PGPASSWORD"] = "Rocketman09"

print("Dumping plain SQL...")
cmd_sql = [
    pg_dump_path,
    "-h", "localhost",
    "-p", "5432",
    "-U", "postgres",
    "-d", "InvenSight",
    "-F", "p",
    "-f", sql_file
]
res1 = subprocess.run(cmd_sql, env=env, capture_output=True, text=True)
if res1.returncode != 0:
    print("SQL dump failed:", res1.stderr)
    sys.exit(res1.returncode)

print("Dumping custom archive (.dump)...")
cmd_dump = [
    pg_dump_path,
    "-h", "localhost",
    "-p", "5432",
    "-U", "postgres",
    "-d", "InvenSight",
    "-F", "c",
    "-f", dump_file
]
res2 = subprocess.run(cmd_dump, env=env, capture_output=True, text=True)
if res2.returncode != 0:
    print("Archive dump failed:", res2.stderr)
    sys.exit(res2.returncode)

# Copy to latest
import shutil
shutil.copyfile(sql_file, latest_sql)
shutil.copyfile(dump_file, latest_dump)

print(f"SUCCESS:\n1. {sql_file} ({os.path.getsize(sql_file)} bytes)\n2. {dump_file} ({os.path.getsize(dump_file)} bytes)\n3. {latest_sql}\n4. {latest_dump}")
