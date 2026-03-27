from fastapi import APIRouter, HTTPException, UploadFile, File
import shutil
import os
from database import get_connection
from models import CreatePosProductRequest, UpdatePosProductRequest, CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest
import psycopg2.extras
from datetime import date


router = APIRouter()


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    UPLOAD_DIR = "uploads"
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    
    # Secure file name (you can use uuid or timestamp)
    import time
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{int(time.time())}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/uploads/{filename}"}


@router.get("/categories")
def get_categories():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM categories ORDER BY category_name")
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/categories")
def create_category(payload: CreateCategoryRequest):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT COALESCE(MAX(category_id), 0) + 1 AS next_id FROM categories")
            category_id = cur.fetchone()["next_id"]
            cur.execute(
                "INSERT INTO categories (category_id, category_name, is_active) VALUES (%s, %s, %s) RETURNING *",
                (category_id, payload.category_name, payload.is_active),
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/categories/{category_id}")
def update_category(category_id: int, payload: UpdateCategoryRequest):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE categories SET category_name = %s, is_active = %s WHERE category_id = %s RETURNING *",
                (payload.category_name, payload.is_active, category_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Category not found")
            conn.commit()
            return dict(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/categories/{category_id}")
def delete_category(category_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check if category is used by products
            cur.execute("SELECT COUNT(*) FROM products WHERE category_id = %s", (category_id,))
            if cur.fetchone()[0] > 0:
                raise HTTPException(status_code=400, detail="Category is in use by products")
            
            cur.execute("DELETE FROM categories WHERE category_id = %s", (category_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Category not found")
            conn.commit()
            return {"message": "Category deleted"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/products")
def get_products():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    pm.product_id,
                    pm.product_name,
                    p.unit_price,
                    pm.pos_price,
                    pm.sku,
                    COALESCE(p.description, '') AS description,
                    COALESCE(p.image_url, '') AS image_url,
                    COALESCE(pm.category, 'Uncategorized') AS category_name,
                    COALESCE(pm.category_id, 0) AS category_id,
                    COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                    COALESCE(p.unit_of_measurement, '') AS unit_of_measurement
                FROM pos_management pm
                LEFT JOIN products p ON pm.product_id = p.product_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
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
                    p.unit_price,
                    pm.status,
                    COALESCE(p.description, '') AS description,
                    COALESCE(p.image_url, '') AS image_url,
                    p.supplier_id,
                    COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                    COALESCE(i.reorder_level, 0) AS reorder_level,
                    COALESCE(p.unit_of_measurement, '') AS unit_of_measurement,
                    p.date_added,
                    CASE
                        WHEN p.unit_price IS NULL THEN false
                        WHEN pm.pos_price <> p.unit_price THEN true
                        ELSE false
                    END AS price_modified
                FROM pos_management pm
                LEFT JOIN products p ON pm.product_id = p.product_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN inventory i ON pm.inventory_id = i.inventory_id
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
                        supplier_id = %s,
                        product_name = %s,
                        description = %s,
                        image_url = %s,
                        sku = %s,
                        unit_price = %s,
                        unit_of_measurement = %s
                    WHERE product_id = %s
                    """,
                    (
                        category_id,
                        payload.supplier_id,
                        payload.product_name,
                        payload.description,
                        payload.image_url,
                        payload.sku,
                        payload.unit_price,
                        payload.unit_of_measurement,
                        product_id,
                    ),
                )
            else:
                cur.execute("SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products")
                product_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO products (
                        product_id, category_id, supplier_id, product_name, description, image_url, unit_price, sku, date_added, unit_of_measurement
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        product_id,
                        category_id,
                        payload.supplier_id,
                        payload.product_name,
                        payload.description,
                        payload.image_url,
                        payload.unit_price,
                        payload.sku,
                        date.today(),
                        payload.unit_of_measurement,
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
                # Update supplier_id and quantity_on_hand in existing inventory
                cur.execute(
                    "UPDATE inventory SET supplier_id = %s, quantity_on_hand = %s WHERE inventory_id = %s",
                    (payload.supplier_id, payload.stock, inventory_id)
                )
            else:
                cur.execute(
                    "SELECT COALESCE(MAX(inventory_id), 0) + 1 AS next_id FROM inventory"
                )
                inventory_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO inventory (
                        inventory_id, product_id, quantity_on_hand, location_shelf, reorder_level, last_updated, supplier_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (inventory_id, product_id, payload.stock, "N/A", 5, date.today(), payload.supplier_id),
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

            pos_price = payload.pos_price if payload.pos_price is not None else payload.unit_price
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
                    pos_price,
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
                    supplier_id = %s,
                    product_name = %s,
                    description = %s,
                    image_url = %s,
                    sku = %s,
                    unit_price = %s,
                    unit_of_measurement = %s
                WHERE product_id = %s
                """,
                (
                    category_id,
                    payload.supplier_id,
                    payload.product_name,
                    payload.description,
                    payload.image_url,
                    payload.sku,
                    payload.unit_price,
                    payload.unit_of_measurement,
                    product_id,
                ),
            )

            # Update inventory as well
            cur.execute(
                """
                UPDATE inventory
                SET supplier_id = %s,
                    quantity_on_hand = %s
                WHERE product_id = %s
                """,
                (payload.supplier_id, payload.stock, product_id)
            )

            # Only update pos_price if it was provided in the payload
            # In the frontend, the POS Management module will send pos_price
            # while the Products module might only send unit_price.
            # However, for simplicity, we can always update both if present.
            p_price = payload.pos_price if payload.pos_price is not None else payload.unit_price

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
                    p_price,
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
