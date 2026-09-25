from fastapi import APIRouter, HTTPException, UploadFile, File, Header
import shutil
import os
import re
from database import get_connection
from models import CreatePosProductRequest, UpdatePosProductRequest, CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest
import psycopg2.extras
from datetime import date
from utils.sku import build_sku
from utils.audit import add_audit_log


router = APIRouter()

def _validate_non_negative_product_values(unit_price, pos_price, stock):
    if unit_price is None or unit_price < 0:
        raise HTTPException(status_code=400, detail="Unit cost cannot be negative.")
    if pos_price is not None and pos_price < 0:
        raise HTTPException(status_code=400, detail="Retail Price cannot be negative.")
    if pos_price is not None and pos_price < unit_price:
        raise HTTPException(status_code=400, detail="Retail Price cannot be lower than the Unit Cost.")
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
def create_category(
    payload: CreateCategoryRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
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
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "CREATE_CATEGORY",
                    "category",
                    row["category_id"],
                    f"Created category: {payload.category_name}"
                )
            
            conn.commit()
            return dict(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.put("/categories/{category_id}")
def update_category(
    category_id: int, 
    payload: UpdateCategoryRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
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
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "UPDATE_CATEGORY",
                    "category",
                    category_id,
                    f"Updated category: {payload.category_name}"
                )
                
            conn.commit()
            return dict(row)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
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
            
            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "DELETE_CATEGORY",
                    "category",
                    category_id,
                    f"Deleted category ID: {category_id}"
                )
                
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
                    COALESCE(c.category_name, 'Uncategorized') AS category_name,
                    COALESCE(p.category_id, 0) AS category_id,
                    p.supplier_id,
                    COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                    COALESCE(p.unit_of_measurement, '') AS unit_of_measurement,
                    COALESCE(i.quantity, 0) AS quantity,
                    COALESCE(i.reorder_level, 10) AS reorder_level,
                    COALESCE(p.is_service, FALSE) as is_service
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
                    p.supplier_id,
                    COALESCE(s.supplier_name, 'No Supplier') AS supplier_name,
                    COALESCE(i.reorder_level, 0) AS reorder_level,
                    COALESCE(p.unit_of_measurement, '') AS unit_of_measurement,
                    COALESCE(p.specific_category, '') AS specific_category,
                    p.date_added,
                    false AS price_modified,
                    COALESCE(p.is_service, FALSE) as is_service
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
def create_pos_product(
    payload: CreatePosProductRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
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
            
            if payload.sku and payload.sku.strip():
                sku = payload.sku.strip().upper()
            else:
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
                        product_id, category_id, supplier_id, product_name, specific_category, unit_price, pos_price, sku, date_added, unit_of_measurement, status
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        product_id,
                        category_id,
                        payload.supplier_id,
                        payload.product_name,
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
                        inventory_id, product_id, quantity, expected, actual, reorder_level, 
                        last_updated, reason_adjustment, serial_start, serial_end
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        inventory_id, 
                        product_id, 
                        payload.stock, 
                        payload.stock, 
                        payload.stock, 
                        5, 
                        date.today(), 
                        "Initial stock",
                        payload.serial_start,
                        None # serial_end handled by backend or left to calc
                    ),
                )

            # --- Audit log ---
            if x_actor_user_id:
                action = "UPDATE_PRODUCT" if existing_product else "CREATE_PRODUCT"
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    action,
                    "product",
                    product_id,
                    f"{'Updated' if existing_product else 'Created'} product: {payload.product_name} (SKU: {sku})"
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
def update_pos_product(
    pos_id: int, 
    payload: UpdatePosProductRequest,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
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
                "SELECT product_id, sku, unit_price, pos_price, product_name FROM products WHERE product_id = %s",
                (pos_id,),
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Product not found")

            product_id = existing["product_id"]
            current_sku = (existing.get("sku") or "").strip().upper()
            old_unit_price = existing.get("unit_price")
            if payload.sku and payload.sku.strip():
                sku = payload.sku.strip().upper()
            else:
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
            
            # --- Audit log ---
            if x_actor_user_id:
                changes = []
                if payload.product_name != existing["product_name"]:
                    changes.append(f"Name: {existing['product_name']} -> {payload.product_name}")
                if sku != current_sku:
                    changes.append(f"SKU: {current_sku} -> {sku}")
                if payload.unit_price != old_unit_price:
                    changes.append(f"Unit Cost: {old_unit_price} -> {payload.unit_price}")
                if payload.pos_price != existing.get("pos_price"):
                    changes.append(f"Retail Price: {existing.get('pos_price')} -> {payload.pos_price}")
                
                change_str = ", ".join(changes) if changes else "No core product fields changed"

                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "UPDATE_PRODUCT",
                    "product",
                    product_id,
                    f"Updated product: {payload.product_name}. Changes: {change_str}"
                )
                
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
def delete_pos_product(
    pos_id: int,
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
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
                UPDATE products SET status = 'Archived'
                WHERE product_id = %s AND status = 'Active'
                RETURNING product_id
                """,
                (product_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Active product not found")

            # --- Audit log ---
            if x_actor_user_id:
                add_audit_log(
                    cur,
                    int(x_actor_user_id),
                    "ARCHIVE_PRODUCT",
                    "product",
                    product_id,
                    f"Archived product ID: {product_id}"
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


@router.post("/products/import")
async def import_products(
    file: UploadFile = File(...),
    x_actor_user_id: str | None = Header(default=None, alias="X-Actor-User-Id")
):
    if not x_actor_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    actor_id = int(x_actor_user_id)
    
    import csv
    import io
    
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Check permissions
            cur.execute("SELECT role, username FROM users WHERE user_id = %s", (actor_id,))
            actor = cur.fetchone()
            role = (actor["role"] or "").lower() if actor else ""
            username = (actor["username"] or "").lower() if actor else ""
            if role not in ("super admin", "system administrator", "administrator", "manager") and username != "rootadminnginamo":
                raise HTTPException(status_code=403, detail="Unauthorized to import products")

            contents = await file.read()
            if len(contents) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")
            decoded = contents.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(decoded))
            
            if not reader.fieldnames:
                raise HTTPException(status_code=400, detail="Empty or invalid CSV file")
                
            headers = {k.strip().lower().replace(" ", "_"): k for k in reader.fieldnames}
            
            def get_val(row, aliases):
                for alias in aliases:
                    if alias in headers:
                        val = row[headers[alias]]
                        return val.strip() if val else None
                return None

            imported_count = 0
            for row in reader:
                p_name = get_val(row, ["product_name", "productname", "name", "product"])
                if not p_name:
                    continue  # skip rows without name
                
                try:
                    u_cost = float(get_val(row, ["unit_cost", "unitprice", "cost", "unit_price"]) or 0)
                    r_price = float(get_val(row, ["retail_price", "posprice", "price", "retail_price", "pos_price"]) or u_cost)
                    stock_qty = int(get_val(row, ["stock", "quantity", "qty", "initial_stock"]) or 0)
                except ValueError:
                    continue  # skip rows with parsing errors
                
                sku_raw = get_val(row, ["sku"])
                cat_val = get_val(row, ["category", "category_name", "category_id"])
                sup_val = get_val(row, ["supplier", "supplier_name", "supplier_id"])
                uom = get_val(row, ["unit_of_measurement", "uom", "unit"]) or "pcs"
                is_srv = str(get_val(row, ["is_service", "service"]) or "").lower() in ("true", "1", "yes")

                # Resolve category_id
                category_id = None
                category_name = "Uncategorized"
                if cat_val:
                    cat_val_str = str(cat_val).strip()
                    if cat_val_str.isdigit():
                        category_id = int(cat_val_str)
                        cur.execute("SELECT category_name FROM categories WHERE category_id = %s", (category_id,))
                        cat_row = cur.fetchone()
                        category_name = cat_row["category_name"] if cat_row else "Uncategorized"
                    else:
                        cur.execute("SELECT category_id FROM categories WHERE LOWER(category_name) = LOWER(%s)", (cat_val_str,))
                        cat_row = cur.fetchone()
                        if cat_row:
                            category_id = cat_row["category_id"]
                            category_name = cat_val_str
                        else:
                            # Create new category
                            cur.execute("SELECT COALESCE(MAX(category_id), 0) + 1 AS next_id FROM categories")
                            category_id = cur.fetchone()["next_id"]
                            cur.execute("INSERT INTO categories (category_id, category_name, is_active) VALUES (%s, %s, true)", (category_id, cat_val_str))
                            category_name = cat_val_str

                # Resolve supplier_id
                supplier_id = None
                if sup_val:
                    sup_val_str = str(sup_val).strip()
                    if sup_val_str.isdigit():
                        supplier_id = int(sup_val_str)
                    else:
                        cur.execute("SELECT supplier_id FROM supplier WHERE LOWER(supplier_name) = LOWER(%s)", (sup_val_str,))
                        sup_row = cur.fetchone()
                        if sup_row:
                            supplier_id = sup_row["supplier_id"]
                        else:
                            # Create new supplier
                            cur.execute("SELECT COALESCE(MAX(supplier_id), 0) + 1 AS next_id FROM supplier")
                            supplier_id = cur.fetchone()["next_id"]
                            cur.execute("INSERT INTO supplier (supplier_id, supplier_name, total_orders, status) VALUES (%s, %s, 0, 'Active')", (supplier_id, sup_val_str))
                
                # Default supplier if not resolved
                if not supplier_id:
                    cur.execute("SELECT supplier_id FROM supplier LIMIT 1")
                    sup_row = cur.fetchone()
                    if sup_row:
                        supplier_id = sup_row["supplier_id"]
                    else:
                        supplier_id = 1
                        cur.execute("INSERT INTO supplier (supplier_id, supplier_name, total_orders, status) VALUES (1, 'Default Supplier', 0, 'Active')")
                
                # Build SKU
                final_sku = build_sku(cur, sku_raw, p_name, category_name)
                
                # Check if product exists by SKU
                cur.execute("SELECT product_id FROM products WHERE sku = %s", (final_sku,))
                prod_row = cur.fetchone()
                if prod_row:
                    product_id = prod_row["product_id"]
                    cur.execute(
                        """
                        UPDATE products
                        SET category_id = %s, supplier_id = %s, product_name = %s, unit_price = %s, pos_price = %s, unit_of_measurement = %s, is_service = %s
                        WHERE product_id = %s
                        """,
                        (category_id, supplier_id, p_name, u_cost, r_price, uom, is_srv, product_id)
                    )
                else:
                    cur.execute("SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products")
                    product_id = cur.fetchone()["next_id"]
                    cur.execute(
                        """
                        INSERT INTO products (product_id, category_id, supplier_id, product_name, unit_price, pos_price, sku, date_added, unit_of_measurement, status, is_service)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_DATE, %s, 'Active', %s)
                        """,
                        (product_id, category_id, supplier_id, p_name, u_cost, r_price, final_sku, uom, is_srv)
                    )
                
                # Sync inventory
                cur.execute("SELECT inventory_id FROM inventory WHERE product_id = %s", (product_id,))
                inv_row = cur.fetchone()
                if inv_row:
                    cur.execute(
                        """
                        UPDATE inventory SET quantity = %s, actual = %s, expected = %s, last_updated = CURRENT_DATE
                        WHERE product_id = %s
                        """,
                        (stock_qty, stock_qty, stock_qty, product_id)
                    )
                else:
                    cur.execute("SELECT COALESCE(MAX(inventory_id), 0) + 1 AS next_id FROM inventory")
                    inv_id = cur.fetchone()["next_id"]
                    cur.execute(
                        """
                        INSERT INTO inventory (inventory_id, product_id, quantity, expected, actual, reorder_level, last_updated, reason_adjustment)
                        VALUES (%s, %s, %s, %s, %s, 5, CURRENT_DATE, 'CSV Import')
                        """,
                        (inv_id, product_id, stock_qty, stock_qty, stock_qty)
                    )
                
                imported_count += 1
                
            # Audit log
            add_audit_log(cur, actor_id, "IMPORT_PRODUCTS", "product", None, f"Bulk imported {imported_count} products from CSV.")
            conn.commit()
            return {"ok": True, "message": f"Successfully imported {imported_count} products."}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"CSV Import error: {str(e)}")
    finally:
        conn.close()

