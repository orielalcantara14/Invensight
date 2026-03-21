from fastapi import APIRouter, HTTPException
from database import get_connection
import psycopg2.extras

router = APIRouter()


@router.get("/products")
def get_products():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    p.product_id,
                    p.product_name,
                    p.unit_price,
                    p.sku,
                    p.description,
                    COALESCE(c.category_name, 'Uncategorized') AS category_name,
                    COALESCE(p.category_id, 0) AS category_id
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                ORDER BY p.product_name
            """)
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/categories")
def get_categories():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT category_id, category_name FROM categories "
                "WHERE is_active = true ORDER BY category_name"
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/pos-terminals")
def get_terminals():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT terminal_id, terminal_name, location FROM pos_terminals "
                "WHERE status = 'Active' ORDER BY terminal_id"
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
