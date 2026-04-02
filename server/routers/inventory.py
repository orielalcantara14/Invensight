from fastapi import APIRouter, HTTPException
from database import get_connection
from models import InventoryResponse, CreateInventoryRequest, UpdateInventoryRequest
import psycopg2.extras
from datetime import date
import logging
import re

logger = logging.getLogger("invensight.inventory")
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

def _get_inventory_item(cur: psycopg2.extras.RealDictCursor, inventory_id: int):
    cur.execute(
        """
        SELECT
            i.inventory_id,
            p.product_id,
            COALESCE(p.product_name, 'Unknown') AS product_name,
            COALESCE(p.sku, 'N/A') AS sku,
            p.category_id,
            COALESCE(c.category_name, 'Uncategorized') AS category_name,
            p.specific_category,
            p.unit_of_measurement,
            s.supplier_name,
            COALESCE(i.quantity, 0) AS quantity,
            COALESCE(i.expected, 0) AS expected,
            COALESCE(i.actual, 0) AS actual,
            COALESCE(i.reorder_level, 10) AS reorder_level,
            COALESCE(p.unit_price::float, 0.0) AS unit_price,
            CASE
                WHEN COALESCE(i.quantity, 0) <= 0 THEN 'Critical'
                WHEN COALESCE(i.quantity, 0) <= COALESCE(i.reorder_level, 10) THEN 'Low'
                ELSE 'Normal'
            END AS status,
            COALESCE(i.last_updated::text, '') AS last_updated,
            COALESCE(i.reason_adjustment, '') AS reason_adjustment
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
        WHERE i.inventory_id = %s
        """,
        (inventory_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return dict(row)

@router.get("/")
def get_inventory():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    i.inventory_id,
                    p.product_id,
                    COALESCE(p.product_name, 'Unknown') AS product_name,
                    COALESCE(p.sku, 'N/A') AS sku,
                    p.category_id,
                    COALESCE(c.category_name, 'Uncategorized') AS category_name,
                    p.specific_category,
                    p.unit_of_measurement,
                    s.supplier_name,
                    COALESCE(i.quantity, 0) AS quantity,
                    COALESCE(i.expected, 0) AS expected,
                    COALESCE(i.actual, 0) AS actual,
                    COALESCE(i.reorder_level, 10) AS reorder_level,
                    COALESCE(p.unit_price::float, 0.0) AS unit_price,
                    CASE
                        WHEN COALESCE(i.quantity, 0) <= 0 THEN 'Critical'
                        WHEN COALESCE(i.quantity, 0) <= COALESCE(i.reorder_level, 10) THEN 'Low'
                        ELSE 'Normal'
                    END AS status,
                    COALESCE(i.last_updated::text, '') AS last_updated,
                    COALESCE(i.reason_adjustment, '') AS reason_adjustment
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
                ORDER BY p.product_name
                """
            )
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        logger.error(f"Error fetching inventory: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/")
def add_inventory_item(payload: CreateInventoryRequest):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # 1. Handle Supplier
            supplier_id = None
            if payload.supplier_name:
                cur.execute("SELECT supplier_id FROM supplier WHERE supplier_name = %s", (payload.supplier_name,))
                s_row = cur.fetchone()
                if s_row:
                    supplier_id = s_row["supplier_id"]
                else:
                    cur.execute("SELECT COALESCE(MAX(supplier_id), 0) + 1 AS next_id FROM supplier")
                    supplier_id = cur.fetchone()["next_id"]
                    cur.execute(
                        "INSERT INTO supplier (supplier_id, supplier_name, status) VALUES (%s, %s, %s)",
                        (supplier_id, payload.supplier_name, "Active")
                    )

            # 2. Handle Product
            category_name = "Uncategorized"
            if payload.category_id:
                cur.execute("SELECT category_name FROM categories WHERE category_id = %s", (payload.category_id,))
                c_row = cur.fetchone()
                if c_row:
                    category_name = c_row["category_name"]

            sku = _build_sku(cur, payload.sku, payload.product_name, category_name)
            
            cur.execute("SELECT product_id FROM products WHERE sku = %s", (sku,))
            p_row = cur.fetchone()
            if p_row:
                product_id = p_row["product_id"]
                cur.execute(
                    """
                    UPDATE products SET 
                        product_name = %s, supplier_id = %s, category_id = %s, 
                        specific_category = %s, unit_of_measurement = %s
                    WHERE product_id = %s
                    """,
                    (payload.product_name, supplier_id, payload.category_id, 
                     payload.specific_category, payload.unit_of_measurement, product_id)
                )
            else:
                cur.execute("SELECT COALESCE(MAX(product_id), 0) + 1 AS next_id FROM products")
                product_id = cur.fetchone()["next_id"]
                cur.execute(
                    """
                    INSERT INTO products (
                        product_id, product_name, sku, supplier_id, category_id, 
                        specific_category, unit_of_measurement, date_added
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (product_id, payload.product_name, sku, supplier_id, payload.category_id,
                     payload.specific_category, payload.unit_of_measurement, date.today())
                )

            # 3. Handle Inventory
            cur.execute("SELECT inventory_id FROM inventory WHERE product_id = %s", (product_id,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Product already exists in inventory")
            
            cur.execute("SELECT COALESCE(MAX(inventory_id), 0) + 1 AS next_id FROM inventory")
            inventory_id = cur.fetchone()["next_id"]
            
            cur.execute(
                """
                INSERT INTO inventory (
                    inventory_id, product_id, quantity, expected, actual, reorder_level, last_updated, reason_adjustment
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    inventory_id,
                    product_id,
                    payload.quantity,
                    payload.expected, # Use expected from payload
                    payload.quantity, # actual = quantity on creation
                    payload.reorder_level,
                    date.today(),
                    "Initial stock"
                ),
            )
            
            # Inventory reference removed from pos_management as table is dropped
            
            conn.commit()
            return _get_inventory_item(cur, inventory_id)
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.put("/{inventory_id}/")
def update_inventory_item(inventory_id: int, payload: UpdateInventoryRequest):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Get current product_id
            cur.execute("SELECT product_id FROM inventory WHERE inventory_id = %s", (inventory_id,))
            inv_row = cur.fetchone()
            if not inv_row:
                raise HTTPException(status_code=404, detail="Inventory item not found")
            product_id = inv_row["product_id"]

            # 1. Handle Supplier
            supplier_id = None
            if payload.supplier_name:
                cur.execute("SELECT supplier_id FROM supplier WHERE supplier_name = %s", (payload.supplier_name,))
                s_row = cur.fetchone()
                if s_row:
                    supplier_id = s_row["supplier_id"]
                else:
                    cur.execute("SELECT COALESCE(MAX(supplier_id), 0) + 1 AS next_id FROM supplier")
                    supplier_id = cur.fetchone()["next_id"]
                    cur.execute(
                        "INSERT INTO supplier (supplier_id, supplier_name, status) VALUES (%s, %s, %s)",
                        (supplier_id, payload.supplier_name, "Active")
                    )

            # 2. Handle Product
            category_name = "Uncategorized"
            if payload.category_id:
                cur.execute("SELECT category_name FROM categories WHERE category_id = %s", (payload.category_id,))
                c_row = cur.fetchone()
                if c_row:
                    category_name = c_row["category_name"]

            sku = _build_sku(cur, payload.sku, payload.product_name, category_name)

            cur.execute(
                """
                UPDATE products SET 
                    product_name = %s, sku = %s, supplier_id = %s, category_id = %s, 
                    specific_category = %s, unit_of_measurement = %s
                WHERE product_id = %s
                """,
                (payload.product_name, sku, supplier_id, payload.category_id, 
                 payload.specific_category, payload.unit_of_measurement, product_id)
            )

            # 3. Handle Inventory
            # The logic here is:
            # - `quantity` is the live, sellable stock.
            # - `expected` is incoming stock (e.g., from a PO).
            # - `actual` is the physical count during an audit.
            # When an adjustment is made (e.g., actual count differs from quantity),
            # the `quantity` is updated to match the `actual` count, and the reason is logged.
            
            # If the user provided an 'actual' count that differs from the current 'quantity',
            # we assume they are doing a stock audit and want to update the live quantity.
            # Otherwise, we just update the fields as provided.
            
            cur.execute("SELECT quantity FROM inventory WHERE inventory_id = %s", (inventory_id,))
            current_quantity = cur.fetchone()["quantity"]
            
            new_quantity = payload.quantity
            if payload.actual != current_quantity and payload.reason_adjustment:
                # A physical count was performed and a reason was given.
                # Update the live quantity to match the actual count.
                new_quantity = payload.actual

            cur.execute(
                """
                UPDATE inventory SET 
                    quantity = %s, 
                    expected = %s,
                    actual = %s,
                    reorder_level = %s, 
                    last_updated = %s,
                    reason_adjustment = %s
                WHERE inventory_id = %s
                """,
                (
                    new_quantity,
                    payload.expected, # Update expected with the provided value
                    payload.actual,   # Update actual with the provided value
                    payload.reorder_level,
                    date.today(),
                    payload.reason_adjustment,
                    inventory_id
                ),
            )
            
            # Inventory reference removed from pos_management as table is dropped
            
            conn.commit()
            return _get_inventory_item(cur, inventory_id)
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{inventory_id}/")
def delete_inventory_item(inventory_id: int):
    conn = get_connection()
    try:
        conn.autocommit = False
        with conn.cursor() as cur:
            cur.execute("DELETE FROM inventory WHERE inventory_id = %s", (inventory_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Inventory item not found")
            
            conn.commit()
            return {"message": "Inventory item deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
