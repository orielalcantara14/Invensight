from fastapi import APIRouter, HTTPException
from database import get_connection
from models import CreatePosProductRequest, UpdatePosProductRequest
import psycopg2.extras
from datetime import date

router = APIRouter()


@router.get("/products")
def get_products():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    pm.product_id,
                    pm.product_name,
                    pm.pos_price AS unit_price,
                    pm.sku,
                    COALESCE(p.description, '') AS description,
                    COALESCE(p.image_url, '') AS image_url,
                    COALESCE(pm.category, 'Uncategorized') AS category_name,
                    COALESCE(pm.category_id, 0) AS category_id
                FROM pos_management pm
                LEFT JOIN products p ON pm.product_id = p.product_id
                WHERE pm.status = 'Active'
                ORDER BY pm.product_name
            """)
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/pos-products")
def get_pos_products():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    pm.pos_id,
                    pm.product_id,
                    pm.sku,
                    pm.product_name,
                    pm.category_id,
                    pm.category,
                    pm.stock,
                    pm.pos_price,
                    pm.status,
                    COALESCE(p.description, '') AS description,
                    COALESCE(p.image_url, '') AS image_url,
                    CASE
                        WHEN p.unit_price IS NULL THEN false
                        WHEN pm.pos_price <> p.unit_price THEN true
                        ELSE false
                    END AS price_modified
                FROM pos_management pm
                LEFT JOIN products p ON pm.product_id = p.product_id
                ORDER BY pm.product_name
                """
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/pos-products")
def create_pos_product(payload: CreatePosProductRequest):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            category_name = "Uncategorized"
            category_id = payload.category_id
            if category_id is not None:
                cur.execute(
                    "SELECT category_name FROM categories WHERE category_id = %s",
                    (category_id,),
                )
                category_row = cur.fetchone()
                if category_row:
                    category_name = category_row["category_name"]
                else:
                    category_id = None
            cur.execute(
                "SELECT pos_id FROM pos_management WHERE sku = %s",
                (payload.sku,),
            )
            if cur.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail=f"SKU '{payload.sku}' is already listed in POS management.",
                )
            cur.execute(
                "SELECT product_id FROM products WHERE sku = %s",
                (payload.sku,),
            )
            existing_product = cur.fetchone()
            if existing_product:
                product_id = existing_product["product_id"]
                cur.execute(
                    """
                    UPDATE products
                    SET
                        category_id = %s,
                        product_name = %s,
                        description = %s,
                        image_url = %s,
                        sku = %s
                    WHERE product_id = %s
                    """,
                    (
                        category_id,
                        payload.product_name,
                        payload.description,
                        payload.image_url,
                        payload.sku,
                        product_id,
                    ),
                )
            else:
                cur.execute("SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products")
                product_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO products (
                        product_id, category_id, supplier_id, product_name, description, image_url, unit_price, sku, date_added
                    )
                    VALUES (%s, %s, NULL, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        product_id,
                        category_id,
                        payload.product_name,
                        payload.description,
                        payload.image_url,
                        payload.pos_price,
                        payload.sku,
                        date.today(),
                    ),
                )

            cur.execute(
                """
                SELECT inventory_id
                FROM inventory
                WHERE product_id = %s
                ORDER BY inventory_id
                LIMIT 1
                """,
                (product_id,),
            )
            inventory_row = cur.fetchone()
            if inventory_row:
                inventory_id = inventory_row["inventory_id"]
            else:
                cur.execute(
                    "SELECT COALESCE(MAX(inventory_id), 0) + 1 AS next_id FROM inventory"
                )
                inventory_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO inventory (
                        inventory_id, product_id, location_shelf, reorder_level, last_updated
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (inventory_id, product_id, "N/A", 5, date.today()),
                )

            cur.execute(
                "SELECT pos_id FROM pos_management WHERE product_id = %s",
                (product_id,),
            )
            existing_pos_for_product = cur.fetchone()
            if existing_pos_for_product:
                raise HTTPException(
                    status_code=409,
                    detail=f"Product '{payload.product_name}' is already listed in POS management.",
                )

            cur.execute("SELECT COALESCE(MAX(pos_id), 0) + 1 AS next_id FROM pos_management")
            pos_id = cur.fetchone()["next_id"]
            cur.execute(
                """
                INSERT INTO pos_management (
                    pos_id, product_id, inventory_id, category_id, sku, product_name, category, stock, pos_price, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    pos_id,
                    product_id,
                    inventory_id,
                    category_id,
                    payload.sku,
                    payload.product_name,
                    category_name,
                    payload.stock,
                    payload.pos_price,
                    payload.status,
                ),
            )

            conn.commit()
            return {"pos_id": pos_id}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/pos-products/{pos_id}")
def update_pos_product(pos_id: int, payload: UpdatePosProductRequest):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            category_name = "Uncategorized"
            category_id = payload.category_id
            if category_id is not None:
                cur.execute(
                    "SELECT category_name FROM categories WHERE category_id = %s",
                    (category_id,),
                )
                category_row = cur.fetchone()
                if not category_row:
                    raise HTTPException(status_code=400, detail="Invalid category_id")
                category_name = category_row["category_name"]

            cur.execute(
                "SELECT product_id FROM pos_management WHERE pos_id = %s",
                (pos_id,),
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="POS product not found")

            product_id = existing["product_id"]

            cur.execute(
                """
                UPDATE products
                SET
                    category_id = %s,
                    product_name = %s,
                    description = %s,
                    image_url = %s,
                    sku = %s
                WHERE product_id = %s
                """,
                (
                    category_id,
                    payload.product_name,
                    payload.description,
                    payload.image_url,
                    payload.sku,
                    product_id,
                ),
            )

            cur.execute(
                """
                UPDATE pos_management
                SET
                    category_id = %s,
                    sku = %s,
                    product_name = %s,
                    category = %s,
                    stock = %s,
                    pos_price = %s,
                    status = %s
                WHERE pos_id = %s
                """,
                (
                    category_id,
                    payload.sku,
                    payload.product_name,
                    category_name,
                    payload.stock,
                    payload.pos_price,
                    payload.status,
                    pos_id,
                ),
            )
            conn.commit()
            return {"ok": True}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.patch("/pos-products/{pos_id}/status")
def update_pos_product_status(pos_id: int, status: str):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if status not in ["Active", "Archived"]:
                raise HTTPException(status_code=400, detail="Invalid status")
            cur.execute(
                "UPDATE pos_management SET status = %s WHERE pos_id = %s RETURNING pos_id",
                (status, pos_id),
            )
            updated = cur.fetchone()
            if not updated:
                raise HTTPException(status_code=404, detail="POS product not found")
            conn.commit()
            return {"ok": True}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/pos-products/{pos_id}")
def delete_pos_product(pos_id: int):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT pos_id, product_id, inventory_id
                FROM pos_management
                WHERE pos_id = %s
                """,
                (pos_id,),
            )
            target = cur.fetchone()
            if not target:
                raise HTTPException(status_code=404, detail="POS product not found")
            cur.execute(
                "DELETE FROM pos_management WHERE pos_id = %s RETURNING pos_id",
                (pos_id,),
            )

            cur.execute(
                """
                DELETE FROM inventory
                WHERE inventory_id = %s
                  AND product_id = %s
                """,
                (target["inventory_id"], target["product_id"]),
            )

            cur.execute(
                """
                DELETE FROM products p
                WHERE p.product_id = %s
                  AND NOT EXISTS (
                    SELECT 1 FROM pos_management pm WHERE pm.product_id = p.product_id
                  )
                  AND NOT EXISTS (
                    SELECT 1 FROM sold_items si WHERE si.product_id = p.product_id
                  )
                """,
                (target["product_id"],),
            )
            conn.commit()
            return {"ok": True}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
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
                "WHERE is_active = true OR is_active IS NULL ORDER BY category_name"
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
