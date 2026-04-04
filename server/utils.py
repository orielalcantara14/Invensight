import re


def build_sku(cur, raw_sku: str, product_name: str = "", category_name: str = "") -> str:
    cat_code = ""
    if category_name and category_name != "Uncategorized":
        cat_code = "".join([word[0].upper() for word in category_name.split() if word])

    prefix_base = cat_code if cat_code else (raw_sku or "").strip().upper()
    if not prefix_base:
        prefix_base = "PRD"

    brand_code = ""
    if product_name:
        parts = product_name.split()
        if parts:
            brand_code = parts[0][:2].upper()

    details_code = ""
    if product_name:
        parts = product_name.split()
        if len(parts) > 1:
            unit_part = parts[-1]
            digit = "".join(filter(str.isdigit, unit_part))
            unit_letter = "".join(filter(str.isalpha, unit_part))
            unit_code = ""
            if digit:
                unit_code += digit[0]
            if unit_letter:
                unit_code += unit_letter[0].upper()

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

    if brand_code and details_code:
        prefix = f"{prefix_base}-{brand_code}-{details_code}"
    elif brand_code:
        prefix = f"{prefix_base}-{brand_code}"
    else:
        prefix = prefix_base

    cur.execute("SELECT 1 FROM products WHERE sku = %s", (prefix,))
    if not cur.fetchone():
        return prefix

    cur.execute(
        "SELECT sku FROM products WHERE sku LIKE %s || '%%'",
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
