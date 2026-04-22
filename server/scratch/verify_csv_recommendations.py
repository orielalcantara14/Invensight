import csv
from collections import defaultdict
from datetime import datetime

ITEMS_TO_CHECK = [
    "MOTUL SCT 800ML",
    "GRASA KOBY",
    "HONDA BLUE SCT 800ML",
    "YAMALUBE BLUE CORE 1L",
    "TIRE SEALANT PROTIRE",
    "YAMALUBE AT 800ML"
]

def verify():
    csv_path = "../Sales_Data.csv"
    item_sales = defaultdict(list)
    
    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row['Product Name'].strip()
            if name in ITEMS_TO_CHECK:
                qty = int(float(row['Quantity'] or 0))
                dt_str = row['DATE'].strip().split(' ')[0]
                try:
                    # Attempt to parse date (e.g. 2024-01-02)
                    dt = datetime.strptime(dt_str, "%Y-%m-%d")
                    item_sales[name].append((dt, qty))
                except:
                    pass

    print(f"{'Product Name':<30} | {'Total Qty':<10} | {'Daily Velocity':<15} | {'Predicted 30d'}")
    print("-" * 75)
    
    for name in ITEMS_TO_CHECK:
        sales = item_sales[name]
        total_qty = sum(s[1] for s in sales)
        
        if sales:
            min_date = min(s[0] for s in sales)
            max_date = max(s[0] for s in sales)
            days_span = (max_date - min_date).days
            if days_span == 0: days_span = 1
            
            velocity = total_qty / days_span
            pred_30d = velocity * 30
            
            print(f"{name:<30} | {total_qty:<10} | {velocity:<15.2f} | {pred_30d:.2f}")
        else:
            print(f"{name:<30} | {'0':<10} | {'0.00':<15} | 0.00")

if __name__ == "__main__":
    verify()
