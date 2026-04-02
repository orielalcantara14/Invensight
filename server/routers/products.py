from fastapi import APIRouter, HTTPException, UploadFile, File
import shutil
import os
import re
from database import get_connection
from models import CreatePosProductRequest, UpdatePosProductRequest, CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest
import psycopg2.extras
from datetime import date


router = APIRouter()

def _build_sku(cur, raw_sku: str, product_name: str = "", category_name: str = "") -> str:
    # 1. Start with Category Code (e.g., Engine Oil -> EO)
    cat_code = ""
    if category_name and category_name != "Uncategorized":
        # Use first letters of each word in category_name
        cat_code = "".join([word[0].upper() for word in category_name.split() if word])
    
    # If no category code but raw_sku (prefix) exists, use that instead
    prefix_base = cat_code if cat_code else (raw_sku or "").strip().upper()
    if not prefix_base:
        prefix_base = "PRD"
        
    # 2. Brand Code (e.g., HONDA -> HO)
    brand_code = ""
    if product_name:
        parts = product_name.split()
        if parts:
            brand_code = parts[0][:2].upper()
            
    # 3. Details Code (e.g., BLUE 1L -> BL1L)
    details_code = ""
    if product_name:
        parts = product_name.split()
        if len(parts) > 1:
            # Last part is likely the unit (e.g., 1L, 800ML)
            unit_part = parts[-1]
            digit = "".join(filter(str.isdigit, unit_part))
            unit_letter = "".join(filter(str.isalpha, unit_part))
            unit_code = ""
            if digit: unit_code += digit[0]
            if unit_letter: unit_code += unit_letter[0].upper()
            
            # Parts between brand and unit
            middle_parts = parts[1:-1]
            middle_code = ""
            if len(middle_parts) == 1:
                word = middle_parts[0].upper()
                if word == "GOLD":
                    middle_code = "GL"
                elif len(word) >= 2:
                    middle_code = word[:2]
                else:
                    middle_code = word
            elif len(middle_parts) >= 2:
                middle_code = "".join([p[0].upper() for p in middle_parts[:2]])
            elif not middle_parts and not unit_code:
                if not unit_code and len(unit_part) >= 2:
                    unit_code = unit_part[:2].upper()
            
            details_code = f"{middle_code}{unit_code}"

    # Assemble the base SKU
    if brand_code and details_code:
        prefix = f"{prefix_base}-{brand_code}-{details_code}"
    elif brand_code:
        prefix = f"{prefix_base}-{brand_code}"
    else:
        prefix = prefix_base

    # Check for collisions
    cur.execute("SELECT 1 FROM products WHERE sku = %s", (prefix,))
    if not cur.fetchone():
        return prefix

    # If it exists, add sequence
    cur.execute(
        """
        SELECT sku FROM products WHERE sku LIKE %s || '%%'
        """,
        (prefix,),
    )
    existing_skus = [row["sku"] for row in cur.fetchall()]
    
    max_n = 0
    pattern = re.compile(re.escape(prefix) + r"-(\d+)$")
    for s in existing_skus:
        m = pattern.match(s)
        if m:
            max_n = max(max_n, int(m.group(1)))
            
    return f"{prefix}-{str(max_n + 1).zfill(3)}"


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
                    COALESCE(i.quantity, 0) AS quantity
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN inventory i ON p.product_id = i.product_id
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
                    'Active' as status,
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
            
            sku = _build_sku(cur, payload.sku, payload.product_name, category_name)
            
            cur.execute(
                "SELECT product_id FROM products WHERE sku = %s",
                (sku,),
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
                        image_url = %s,
                        specific_category = %s,
                        sku = %s,
                        unit_price = %s,
                        pos_price = %s,
                        unit_of_measurement = %s
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
                        product_id,
                    ),
                )
            else:
                cur.execute("SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products")
                product_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO products (
                        product_id, category_id, supplier_id, product_name, image_url, specific_category, unit_price, pos_price, sku, date_added, unit_of_measurement
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                "SELECT product_id, sku FROM products WHERE product_id = %s",
                (pos_id,),
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Product not found")

            product_id = existing["product_id"]
            current_sku = (existing.get("sku") or "").strip().upper()
            sku = _build_sku(cur, payload.sku, payload.product_name, category_name)

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
                    unit_of_measurement = %s
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
                    product_id,
                ),
            )

            # Update inventory as well
            cur.execute(
                """
                UPDATE inventory
                SET quantity = %s,
                    expected = %s,
                    actual = %s,
                    last_updated = %s
                WHERE product_id = %s
                """,
                (payload.stock, payload.stock, payload.stock, date.today(), product_id)
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

            cur.execute(
                """
                DELETE FROM inventory
                WHERE product_id = %s
                """,
                (target["product_id"],),
            )

            cur.execute(
                """
                DELETE FROM products p
                WHERE p.product_id = %s
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
