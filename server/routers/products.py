from fastapi import APIRouter, HTTPException, UploadFile, File
import shutil
import os
import re
from database import get_connection
from models import CreatePosProductRequest, UpdatePosProductRequest, CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest
import psycopg2.extras
from datetime import date
from utils import build_sku


router = APIRouter()

def _validate_non_negative_product_values(unit_price, pos_price, stock):
    if unit_price is None or unit_price < 0:
        raise HTTPException(status_code=400, detail="Unit cost cannot be negative.")
    if pos_price is not None and pos_price < 0:
        raise HTTPException(status_code=400, detail="SRP cannot be negative.")
    if stock is None or stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative.")

def _record_price_history(cur, product_id: int, old_price, new_price):
    """
    Persist product unit price changes for audit/analysis.
    Stores initial price as old_price = NULL.
    """
    old_val = float(old_price) if old_price is not None else None
    new_val = float(new_price) if new_price is not None else None
    if old_val == new_val:
        return
    cur.execute(
        """
        INSERT INTO product_price_history (product_id, old_price, new_price)
        VALUES (%s, %s, %s)
        """,
        (product_id, old_val, new_val),
    )

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    UPLOAD_DIR = "uploads"
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    import uuid
    filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    file_path = os.path.realpath(file_path)
    if not file_path.startswith(os.path.realpath(UPLOAD_DIR)):
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
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
                    p.product_id,
                    p.product_name,
                    CAST(p.unit_price AS FLOAT) as unit_price,
                    CAST(COALESCE(p.pos_price, p.unit_price, 0.0) AS FLOAT) as pos_price,
                    p.sku,
                    COALESCE(p.image_url, '') AS image_url,
                    COALESCE(c.category_name, 'Uncategorized') AS category_name,
                    COALESCE(p.category_id, 0) AS category_id,
                    COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                    COALESCE(p.unit_of_measurement, '') AS unit_of_measurement,
                    COALESCE(i.quantity, 0) AS quantity,
                    COALESCE(i.reorder_level, 5) AS reorder_level
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN inventory i ON p.product_id = i.product_id
                WHERE p.status != 'Archived'
                ORDER BY p.product_name
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
                    p.product_id as pos_id,
                    p.product_id,
                    p.sku,
                    p.product_name,
                    p.category_id,
                    COALESCE(c.category_name, 'Uncategorized') as category,
                    COALESCE(i.quantity, 0) AS stock,
                    CAST(COALESCE(p.pos_price, p.unit_price, 0.0) AS FLOAT) as pos_price,
                    CAST(COALESCE(p.unit_price, 0.0) AS FLOAT) as unit_price,
                    p.status,
                    COALESCE(p.image_url, '') AS image_url,
                    p.supplier_id,
                    COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                    COALESCE(i.reorder_level, 0) AS reorder_level,
                    COALESCE(p.unit_of_measurement, '') AS unit_of_measurement,
                    COALESCE(p.specific_category, '') AS specific_category,
                    p.date_added,
                    false AS price_modified
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN inventory i ON p.product_id = i.product_id
                WHERE p.status != 'Archived'
                ORDER BY p.product_name
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
            _validate_non_negative_product_values(payload.unit_price, payload.pos_price, payload.stock)
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
                "SELECT supplier_id FROM supplier WHERE supplier_id = %s",
                (payload.supplier_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail="Invalid supplier_id: supplier does not exist")
            
            sku = build_sku(cur, payload.sku, payload.product_name, category_name)
            
            cur.execute(
                "SELECT product_id FROM products WHERE sku = %s",
                (sku,),
            )
            existing_product = cur.fetchone()
            if existing_product:
                product_id = existing_product["product_id"]
                cur.execute(
                    "SELECT unit_price FROM products WHERE product_id = %s",
                    (product_id,),
                )
                before_price_row = cur.fetchone()
                before_price = before_price_row["unit_price"] if before_price_row else None
                cur.execute(
                    """
                    UPDATE products
                    SET
                        category_id = %s,
                        supplier_id = %s,
                        product_name = %s,
                        image_url = %s,
                        specific_category = %s,
                        sku = %s,
                        unit_price = %s,
                        pos_price = %s,
                        unit_of_measurement = %s,
                        status = %s
                    WHERE product_id = %s
                    """,
                    (
                        category_id,
                        payload.supplier_id,
                        payload.product_name,
                        payload.image_url,
                        payload.specific_category,
                        sku,
                        payload.unit_price,
                        payload.pos_price,
                        payload.unit_of_measurement,
                        payload.status,
                        product_id,
                    ),
                )
                _record_price_history(cur, product_id, before_price, payload.unit_price)
            else:
                cur.execute("SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products")
                product_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO products (
                        product_id, category_id, supplier_id, product_name, image_url, specific_category, unit_price, pos_price, sku, date_added, unit_of_measurement, status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        product_id,
                        category_id,
                        payload.supplier_id,
                        payload.product_name,
                        payload.image_url,
                        payload.specific_category,
                        payload.unit_price,
                        payload.pos_price,
                        sku,
                        date.today(),
                        payload.unit_of_measurement,
                        payload.status,
                    ),
                )
                _record_price_history(cur, product_id, None, payload.unit_price)

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
                # Update quantity, expected, and actual in existing inventory
                cur.execute(
                    """
                    UPDATE inventory 
                    SET quantity = %s, expected = %s, actual = %s, last_updated = %s 
                    WHERE inventory_id = %s
                    """,
                    (payload.stock, payload.stock, payload.stock, date.today(), inventory_id)
                )
            else:
                cur.execute(
                    "SELECT COALESCE(MAX(inventory_id), 0) + 1 AS next_id FROM inventory"
                )
                inventory_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO inventory (
                        inventory_id, product_id, quantity, expected, actual, reorder_level, last_updated, reason_adjustment
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (inventory_id, product_id, payload.stock, payload.stock, payload.stock, 5, date.today(), "Initial stock"),
                )

            conn.commit()
            return {"pos_id": product_id}
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
            _validate_non_negative_product_values(payload.unit_price, payload.pos_price, payload.stock)
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
                "SELECT product_id, sku, unit_price FROM products WHERE product_id = %s",
                (pos_id,),
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Product not found")

            product_id = existing["product_id"]
            current_sku = (existing.get("sku") or "").strip().upper()
            old_unit_price = existing.get("unit_price")
            sku = build_sku(cur, payload.sku, payload.product_name, category_name)

            if sku != current_sku:
                cur.execute(
                    "SELECT 1 FROM products WHERE sku = %s AND product_id <> %s",
                    (sku, product_id),
                )
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail=f"SKU '{sku}' is already used by another product.")

            cur.execute(
                """
                UPDATE products
                SET
                    category_id = %s,
                    supplier_id = %s,
                    product_name = %s,
                    image_url = %s,
                    specific_category = %s,
                    sku = %s,
                    unit_price = %s,
                    pos_price = %s,
                    unit_of_measurement = %s,
                    status = %s
                WHERE product_id = %s
                """,
                (
                    category_id,
                    payload.supplier_id,
                    payload.product_name,
                    payload.image_url,
                    payload.specific_category,
                    sku,
                    payload.unit_price,
                    payload.pos_price,
                    payload.unit_of_measurement,
                    payload.status,
                    product_id,
                ),
            )
            _record_price_history(cur, product_id, old_unit_price, payload.unit_price)

            cur.execute("SELECT inventory_id, quantity FROM inventory WHERE product_id = %s", (product_id,))
            inv_row = cur.fetchone()
            if inv_row:
                if inv_row["quantity"] != payload.stock:
                    cur.execute(
                        """
                        UPDATE inventory
                        SET quantity = %s, actual = %s, expected = %s, last_updated = CURRENT_DATE
                        WHERE product_id = %s
                        """,
                        (payload.stock, payload.stock, payload.stock, product_id),
                    )
            else:
                cur.execute(
                    "SELECT COALESCE(MAX(inventory_id), 0) + 1 AS next_inv_id FROM inventory",
                )
                next_inv_id = cur.fetchone()["next_inv_id"]
                cur.execute(
                    """
                    INSERT INTO inventory (inventory_id, product_id, quantity, expected, actual, reorder_level, last_updated, reason_adjustment)
                    VALUES (%s, %s, %s, %s, %s, 0, CURRENT_DATE, 'Initial stock sync from POS update')
                    """,
                    (next_inv_id, product_id, payload.stock, payload.stock, payload.stock),
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
    return {"ok": True}


@router.delete("/pos-products/{pos_id}")
def delete_pos_product(pos_id: int):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT product_id
                FROM products
                WHERE product_id = %s
                """,
                (pos_id,),
            )
            target = cur.fetchone()
            if not target:
                raise HTTPException(status_code=404, detail="Product not found")

            product_id = target["product_id"]

            cur.execute(
                """
                SELECT 1 FROM sold_items si WHERE si.product_id = %s LIMIT 1
                """,
                (product_id,),
            )
            has_sales = cur.fetchone() is not None

            if has_sales:
                cur.execute(
                    """
                    UPDATE products SET status = 'Archived'
                    WHERE product_id = %s
                    """,
                    (product_id,),
                )
            else:
                cur.execute(
                    """
                    DELETE FROM inventory
                    WHERE product_id = %s
                    """,
                    (product_id,),
                )

                cur.execute(
                    """
                    DELETE FROM products
                    WHERE product_id = %s
                    """,
                    (product_id,),
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
