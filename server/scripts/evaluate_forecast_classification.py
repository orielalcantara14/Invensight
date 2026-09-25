import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from datetime import date, timedelta

load_dotenv()

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "InvenSight"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "Rocketman09"),
        port=os.getenv("DB_PORT", "5432")
    )

def evaluate_reorder_predictions():
    print("Connecting to the database...")
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor if hasattr(psycopg2.extras, 'DictCursor') else None)
    
    # 1. Fetch products and current inventory
    cur.execute("""
        SELECT i.product_id, p.product_name, 
               COALESCE(i.actual, 0) as current_stock,
               COALESCE(i.reorder_level, 10) as reorder_level
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        WHERE i.status = 'Active'
    """)
    products = cur.fetchall()
    
    if not products:
        print("No active products found in inventory.")
        return
        
    print(f"Loaded {len(products)} active products. Performing evaluation on the last 30 days of historical sales...")
    
    # 2. For each product, calculate predicted sales and actual sales in the last 30 days
    # We simulate prediction as of 30 days ago
    y_pred = []
    y_actual = []
    
    tp_items = []
    fp_items = []
    fn_items = []
    tn_items = []
    
    for prod in products:
        pid = prod[0] if isinstance(prod, tuple) else prod["product_id"]
        pname = prod[1] if isinstance(prod, tuple) else prod["product_name"]
        curr_stock = prod[2] if isinstance(prod, tuple) else prod["current_stock"]
        reorder_level = prod[3] if isinstance(prod, tuple) else prod["reorder_level"]
        
        # Get actual sales of this product in the last 30 days
        cur.execute("""
            SELECT SUM(si.quantity)::float
            FROM sold_items si
            JOIN sales s ON si.invoice_id = s.invoice_id
            WHERE si.product_id = %s
              AND s.invoice_date >= CURRENT_DATE - INTERVAL '30 days'
        """, (pid,))
        actual_sales_30d = cur.fetchone()[0] or 0.0
        
        # Get sales in the period before the last 30 days to calculate predicted velocity
        # Period: [CURRENT_DATE - 44 days, CURRENT_DATE - 30 days] (14 days window)
        cur.execute("""
            SELECT SUM(si.quantity)::float
            FROM sold_items si
            JOIN sales s ON si.invoice_id = s.invoice_id
            WHERE si.product_id = %s
              AND s.invoice_date >= CURRENT_DATE - INTERVAL '44 days'
              AND s.invoice_date < CURRENT_DATE - INTERVAL '30 days'
        """, (pid,))
        sales_training_14d = cur.fetchone()[0] or 0.0
        
        # Predicted velocity based on 14d window, projected to 30 days
        daily_velocity_pred = sales_training_14d / 14.0
        predicted_demand_30d = daily_velocity_pred * 30.0
        
        # Estimate stock 30 days ago (current_stock + sales_in_last_30d)
        stock_30d_ago = curr_stock + actual_sales_30d
        
        # Determine if system would have generated a Reorder Alert 30 days ago
        # Alert is triggered if predicted 30-day demand exceeds stock 30 days ago OR stock 30 days ago <= reorder level
        predicted_alert = 1 if (predicted_demand_30d > stock_30d_ago or stock_30d_ago <= reorder_level) else 0
        
        # Determine if a reorder was ACTUALLY needed
        # Actual reorder needed if actual sales in the 30 days exceeded stock 30 days ago OR stock actually fell below reorder level
        actual_need = 1 if (actual_sales_30d > stock_30d_ago or curr_stock <= reorder_level) else 0
        
        y_pred.append(predicted_alert)
        y_actual.append(actual_need)
        
        item_details = f"{pname} (ID: {pid}) [Pred Demand: {predicted_demand_30d:.1f}, Actual Sales: {actual_sales_30d:.1f}, Stock 30d ago: {stock_30d_ago:.1f}]"
        if predicted_alert == 1 and actual_need == 1:
            tp_items.append(item_details)
        elif predicted_alert == 1 and actual_need == 0:
            fp_items.append(item_details)
        elif predicted_alert == 0 and actual_need == 1:
            fn_items.append(item_details)
        else:
            tn_items.append(item_details)

    # 3. Compute Metrics
    tp = sum(1 for p, a in zip(y_pred, y_actual) if p == 1 and a == 1)
    fp = sum(1 for p, a in zip(y_pred, y_actual) if p == 1 and a == 0)
    fn = sum(1 for p, a in zip(y_pred, y_actual) if p == 0 and a == 1)
    tn = sum(1 for p, a in zip(y_pred, y_actual) if p == 0 and a == 0)
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / (tp + fp + fn + tn) if (tp + fp + fn + tn) > 0 else 0.0
    
    # 4. Display Results
    print("\n" + "="*50)
    print("         INVENIGHT MODEL EVALUATION REPORT")
    print("="*50)
    print(f"Total Products Evaluated: {len(y_pred)}")
    print(f"True Positives (TP):      {tp}  (Correct reorder alerts)")
    print(f"False Positives (FP):     {fp}  (Unnecessary reorder alerts - Overstocking risk)")
    print(f"False Negatives (FN):     {fn}  (Missed alerts - Stockout risk)")
    print(f"True Negatives (TN):      {tn}  (Correctly identified no reorder needed)")
    print("-"*50)
    print(f"Precision:                {precision:.4f} ({precision*100:.2f}%)")
    print(f"Recall:                   {recall:.4f} ({recall*100:.2f}%)")
    print(f"F1 Measure:               {f1:.4f} ({f1*100:.2f}%)")
    print(f"Overall Accuracy:         {accuracy:.4f} ({accuracy*100:.2f}%)")
    print("="*50)
    
    print("\n--- DETAILED SAMPLES ---")
    print(f"\n[TRUE POSITIVES (TP) - Alerted & Needed - Count: {len(tp_items)}]")
    for item in tp_items[:5]:
        print(f"  [OK] {item}")
        
    print(f"\n[FALSE POSITIVES (FP) - Alerted but Not Needed (Overstock Risk) - Count: {len(fp_items)}]")
    for item in fp_items[:5]:
        print(f"  [X] {item}")
        
    print(f"\n[FALSE NEGATIVES (FN) - Missed Alert (Stockout Risk) - Count: {len(fn_items)}]")
    for item in fn_items[:5]:
        print(f"  [X] {item}")
        
    print(f"\n[TRUE NEGATIVES (TN) - No Alert & Not Needed - Count: {len(tn_items)}]")
    for item in tn_items[:5]:
        print(f"  [OK] {item}")
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    try:
        evaluate_reorder_predictions()
    except Exception as e:
        print(f"\nEvaluation failed: {e}")
        print("Please check your database connection or environment variables.")
