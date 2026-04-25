from database import get_connection

def diag():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'sales'")
    cols = [row[0] for row in cur.fetchall()]
    print(cols)
    conn.close()

if __name__ == "__main__":
    diag()
