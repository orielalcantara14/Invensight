import pprint
import re
with open(r"c:\Users\USER\Desktop\InvenSight\src\components\pos\POS.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Swap the panels
# We know the container structure:
# <div className="flex h-screen overflow-hidden bg-gray-50 flex-col sm:flex-row font-sans">
#   {/* ====== LEFT: Checkout Panel ====== */}
#   ...
#   {/* ====== RIGHT: Products Panel ====== */}
#   ...
# </div>

parts = text.split("{/* ====== LEFT: Checkout Panel ====== */}")
pre_left = parts[0]
left_and_right = parts[1].split("{/* ====== RIGHT: Products Panel ====== */}")
left_panel = "{/* ====== RIGHT: Checkout Panel ====== */}" + left_and_right[0]
right_panel = "{/* ====== LEFT: Products Panel ====== */}" + left_and_right[1]

# right_panel continues until the end of the div
# Actually, the last closing tag `    </div>\n  );\n}` is in right_panel.
# We need to split right_panel at the end of the return statement.
end_pos = right_panel.rfind("</div>\n  );\n}")
products_panel = right_panel[:end_pos]
footer = right_panel[end_pos:]

# 2. Inject numpad into the Checkout Panel
numpad_code = """
          {!isPartialPayment && paymentMethod === "Cash" && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['7', '8', '9', 'CLR', '4', '5', '6', 'DEL', '1', '2', '3', '.', '0', '00'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    if (btn === 'CLR') handleNumpad('CANCEL');
                    else if (btn === 'DEL') handleNumpad('DELETE');
                    else handleNumpad(btn);
                  }}
                  className={`py-3 rounded-xl font-black text-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                    btn === 'CLR' || btn === 'DEL' 
                      ? 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200' 
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50 shadow-sm'
                  } ${btn === '0' ? 'col-span-2' : ''}`}
                >
                  {btn}
                </button>
              ))}
            </div>
          )}
"""

# Find where to inject it in left_panel.
# Below the payment method buttons and above the Finalize Sale button.
left_panel = left_panel.replace(
    "          {!isPartialPayment && (\n            <div className=\"flex gap-2 mb-4\">",
    "          {!isPartialPayment && (\n            <div className=\"flex gap-2 mb-4\">"
)
# Actually, wait, there is `          <button onClick={handleConfirmSale}`
insert_idx = left_panel.find("<button onClick={handleConfirmSale}")
left_panel = left_panel[:insert_idx] + numpad_code + "          " + left_panel[insert_idx:]

new_text = pre_left + products_panel + "\n      " + left_panel + footer

with open(r"c:\Users\USER\Desktop\InvenSight\src\components\pos\POS.tsx", "w", encoding="utf-8") as f:
    f.write(new_text)

print("SUCCESS")
