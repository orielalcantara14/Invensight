import json
import logging
from database import get_connection

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("migrate_roles")

ALL_MODULES_ADMIN = {
    "Sales": ["View", "Add", "Edit", "Delete"],
    "Inventory": ["View", "Add Item", "Edit", "Delete"],
    "Products": ["View", "Add Product", "Edit", "Delete"],
    "Suppliers": ["View", "Add Supplier", "Edit", "Delete"],
    "Reports": ["View", "Generate Report"],
    "User Management": ["View", "Add User", "Edit User", "Delete User"],
    "Role Permissions": ["View", "Create", "Edit", "Delete"],
    "Forecasting": ["View", "Generate Forecast"],
    "Stock Prediction": ["View", "Run Prediction"],
    "Audit Log": ["View", "Export"],
    "Purchase Order": ["View", "Create Order", "Edit", "Delete"],
    "Product Return": ["View", "Process Return", "Edit"]
}

MANAGER_MODULES = {
    "Sales": ["View", "Add", "Edit"],
    "Inventory": ["View", "Add Item", "Edit"],
    "Products": ["View", "Add Product", "Edit"],
    "Suppliers": ["View", "Add Supplier", "Edit"],
    "Reports": ["View", "Generate Report"],
    "Forecasting": ["View", "Generate Forecast"],
    "Stock Prediction": ["View", "Run Prediction"],
    "Purchase Order": ["View", "Create Order", "Edit"],
    "Product Return": ["View", "Process Return", "Edit"]
}

SALES_STAFF_MODULES = {
    "Sales": ["View", "Add"],
    "Inventory": ["View"],
    "Products": ["View"],
    "Product Return": ["View", "Process Return"]
}

WAREHOUSE_STAFF_MODULES = {
    "Inventory": ["View", "Add Item", "Edit"],
    "Products": ["View"],
    "Suppliers": ["View"],
    "Purchase Order": ["View"],
    "Product Return": ["View", "Process Return"]
}

DEFAULT_ROLES = {
    "administrator": ALL_MODULES_ADMIN,
    "manager": MANAGER_MODULES,
    "sales staff": SALES_STAFF_MODULES,
    "warehouse staff": WAREHOUSE_STAFF_MODULES
}

def migrate_roles():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT role_id, role_name, permissions_text FROM roles")
            roles = cur.fetchall()
            
            for role_id, role_name, perm_text in roles:
                role_key = role_name.strip().lower()
                
                # Check if it's already a valid JSON dict
                is_valid_json = False
                if perm_text:
                    try:
                        parsed = json.loads(perm_text)
                        if isinstance(parsed, dict):
                            is_valid_json = True
                    except:
                        pass
                
                if not is_valid_json:
                    # Update it
                    new_perms = DEFAULT_ROLES.get(role_key, {})
                    cur.execute(
                        "UPDATE roles SET permissions_text = %s WHERE role_id = %s",
                        (json.dumps(new_perms), role_id)
                    )
                    log.info(f"Updated permissions for role: {role_name}")
                else:
                    log.info(f"Role {role_name} already has JSON permissions.")
            
            conn.commit()
            log.info("Role migration completed successfully.")
            
    except Exception as e:
        conn.rollback()
        log.error(f"Failed to migrate roles: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_roles()
