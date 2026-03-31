from fastapi import APIRouter, HTTPException
from database import get_connection
from models import InventoryResponse, CreateInventoryRequest, UpdateInventoryRequest
import psycopg2.extras
from datetime import date

import logging

logger = logging.getLogger("invensight.inventory")
router = APIRouter()

def _get_inventory_item(cur: psycopg2.extras.RealDictCursor, inventory_id: int):
    cur.execute(
        """
        SELECT
            i.inventory_id,
            p.product_id,
            p.product_name,
            p.sku,
            COALESCE(c.category_name, 'Uncategorized') AS category_name,
            p.specific_category,
            p.unit_of_measurement,
            i.supplier_id,
            s.supplier_name,
            COALESCE(i.quantity_on_hand, 0) AS quantity_on_hand,
            COALESCE(i.reorder_level, 10) AS reorder_level,
            COALESCE(p.unit_price, 0) AS unit_price,
            CASE
                WHEN COALESCE(i.quantity_on_hand, 0) <= 0 THEN 'Critical'
                WHEN COALESCE(i.quantity_on_hand, 0) <= COALESCE(i.reorder_level, 10) THEN 'Low'
                ELSE 'Normal'
            END AS status,
            i.last_updated::text AS last_updated
        FROM inventory i
        JOIN products p ON i.product_id = p.product_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN supplier s ON i.supplier_id = s.supplier_id
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
                    p.product_name,
                    p.sku,
                    COALESCE(c.category_name, 'Uncategorized') AS category_name,
                    p.specific_category,
                    p.unit_of_measurement,
                    i.supplier_id,
                    s.supplier_name,
                    COALESCE(i.quantity_on_hand, 0) AS quantity_on_hand,
                    COALESCE(i.reorder_level, 10) AS reorder_level,
                    COALESCE(p.unit_price, 0) AS unit_price,
                    CASE
                        WHEN COALESCE(i.quantity_on_hand, 0) <= 0 THEN 'Critical'
                        WHEN COALESCE(i.quantity_on_hand, 0) <= COALESCE(i.reorder_level, 10) THEN 'Low'
                        ELSE 'Normal'
                    END AS status,
                    i.last_updated::text AS last_updated
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
                LEFT JOIN categories c ON p.category_id = c.category_id
                LEFT JOIN supplier s ON i.supplier_id = s.supplier_id
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
            # Check if product already in inventory
            cur.execute("SELECT inventory_id FROM inventory WHERE product_id = %s", (payload.product_id,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Product already exists in inventory")
            
            # Get next ID
            cur.execute("SELECT COALESCE(MAX(inventory_id), 0) + 1 AS next_id FROM inventory")
            inventory_id = cur.fetchone()["next_id"]
            
            cur.execute(
                """
                INSERT INTO inventory (
                    inventory_id, product_id, quantity_on_hand, reorder_level, last_updated, supplier_id
                ) VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
                """,
                (
                    inventory_id,
                    payload.product_id,
                    payload.quantity_on_hand,
                    payload.reorder_level,
                    date.today(),
                    payload.supplier_id
                ),
            )
            cur.fetchone()
            
            # Also update pos_management stock if it exists
            cur.execute(
                "UPDATE pos_management SET stock = %s, inventory_id = %s WHERE product_id = %s",
                (payload.quantity_on_hand, inventory_id, payload.product_id)
            )
            
            conn.commit()
            return _get_inventory_item(cur, inventory_id)
    except HTTPException:
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
            cur.execute(
                """
                UPDATE inventory SET 
                    quantity_on_hand = %s, 
                    reorder_level = %s, 
                    supplier_id = %s,
                    last_updated = %s
                WHERE inventory_id = %s RETURNING *
                """,
                (
                    payload.quantity_on_hand,
                    payload.reorder_level,
                    payload.supplier_id,
                    date.today(),
                    inventory_id
                ),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Inventory item not found")
            
            # Also update pos_management stock and supplier_id in products
            cur.execute(
                "UPDATE pos_management SET stock = %s WHERE inventory_id = %s",
                (payload.quantity_on_hand, inventory_id)
            )
            
            # Sync supplier back to products table
            cur.execute(
                "UPDATE products SET supplier_id = %s WHERE product_id = (SELECT product_id FROM inventory WHERE inventory_id = %s)",
                (payload.supplier_id, inventory_id)
            )
            
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
            
            # Remove inventory reference from pos_management
            cur.execute("UPDATE pos_management SET inventory_id = NULL WHERE inventory_id = %s", (inventory_id,))
            
            conn.commit()
            return {"message": "Inventory item deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
