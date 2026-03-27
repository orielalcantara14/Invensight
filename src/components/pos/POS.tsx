import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RefreshCw, AlertCircle, ArrowLeft } from "lucide-react";
import { api } from "@/services/api";
import type { Product, Category, Terminal } from "@/services/api";

interface CartItem {
  product: Product;
  quantity: number;
}

interface SaleResult {
  transaction_id: number;
  invoice_number: string;
  transaction_timestamp: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  cash_received: number;
  change: number;
}

const TAX_RATE = 0.06;
const CATALOG_REFRESH_INTERVAL_MS = 15000;

// TODO: replace with real auth context once login is wired up
const CURRENT_USER = { user_id: 1, full_name: "Admin" };

function fmt(n: number) {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPosPrice(product: Product): number {
  const pos = typeof product.pos_price === "number" ? product.pos_price : NaN;
  if (Number.isFinite(pos)) return pos;
  return product.unit_price;
}

interface ReceiptProps {
  result: SaleResult;
  cartItems: CartItem[];
  terminal: Terminal | null;
  onNewSale: () => void;
}

function Receipt({ result, cartItems, terminal, onNewSale }: ReceiptProps) {
  const saleDate = new Date(result.transaction_timestamp);
  const dateStr = saleDate.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = saleDate.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center justify-start p-8">
      {/* Action buttons – hidden when printing */}
      <div className="flex gap-3 mb-6 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          <Printer className="w-4 h-4" />
          Print Receipt
        </button>
        <button
          onClick={onNewSale}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          New Sale
        </button>
      </div>

      {/* Receipt paper */}
      <div
        id="receipt"
        className="bg-white shadow-xl p-6 w-full max-w-xs font-mono text-sm leading-relaxed"
        style={{ minWidth: "300px" }}
      >
        {/* Header */}
        <div className="font-bold text-base">
          {terminal?.terminal_name ?? "POS Terminal #01"} (JonBrix)
        </div>
        <div>Receipt #: {result.invoice_number}</div>
        <div>Date: {dateStr} | Time: {timeStr}</div>
        <div>Cashier: {CURRENT_USER.full_name}</div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-3" />

        {/* Items */}
        <div className="font-bold mb-1">Product (ID) | Qty | Price | Total</div>
        {cartItems.map((item, idx) => {
          const lineNum = String(idx + 1).padStart(3, "0");
          const price = getPosPrice(item.product);
          const total = price * item.quantity;
          return (
            <div key={item.product.product_id} className="mb-0.5">
              {idx + 1}.{" "}
              {item.product.product_name} ({item.product.sku}) | {item.quantity} |{" "}
              {fmt(price)} |{" "}
              <span className="font-bold">{fmt(total)}</span>
            </div>
          );
        })}

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-3" />

        {/* Totals */}
        <div>SUBTOTAL | {fmt(result.subtotal)}</div>
        <div>VAT (6%) | {fmt(result.tax_amount)}</div>
        <div className="font-bold">GRAND TOTAL | {fmt(result.total_amount)}</div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-3" />

        {/* Payment */}
        <div className="font-bold">Payment Details:</div>
        <div>Payment Method | Cash</div>
        <div>Cash Received | {fmt(result.cash_received)}</div>
        <div>Total Sales (Deducted) | ({fmt(result.total_amount)})</div>
        <div className="font-bold">CHANGE | {fmt(result.change)}</div>
      </div>
    </div>
  );
}

interface CheckoutModalProps {
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  processing: boolean;
  onClose: () => void;
  onConfirm: (cashReceived: number) => void;
}

function CheckoutModal({
  subtotal,
  taxAmount,
  grandTotal,
  processing,
  onClose,
  onConfirm,
}: CheckoutModalProps) {
  const [cashInput, setCashInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const cashFloat = parseFloat(cashInput) || 0;
  const change = cashFloat - grandTotal;
  const sufficient = cashFloat >= grandTotal;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && sufficient && !processing) {
      onConfirm(cashFloat);
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Complete Sale</h2>

        {/* Order summary */}
        <div className="space-y-1 text-sm mb-4">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>₱{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>VAT (6%)</span>
            <span>₱{fmt(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
            <span>GRAND TOTAL</span>
            <span>₱{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Cash received input */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cash Received (₱)
        </label>
        <input
          ref={inputRef}
          type="number"
          min={grandTotal}
          step="0.01"
          value={cashInput}
          onChange={(e) => setCashInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl font-bold mb-3"
          placeholder="0.00"
        />

        {/* Change display */}
        {sufficient && cashFloat > 0 && (
          <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 font-bold text-green-800">
            <span>CHANGE</span>
            <span>₱{fmt(change)}</span>
          </div>
        )}
        {!sufficient && cashFloat > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Need ₱{fmt(grandTotal - cashFloat)} more</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(cashFloat)}
            disabled={!sufficient || processing}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? "Processing…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main POS page
// ---------------------------------------------------------------------------
export function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const [showCheckout, setShowCheckout] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);

  // Live clock shown in header
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const fetchCatalog = useCallback(async (isInitialLoad: boolean) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      const [prods, cats, terminals] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getTerminals(),
      ]);

      setProducts(prods);
      setCategories(cats);
      setTerminal((prev) => {
        if (!terminals.length) return null;
        if (!prev) return terminals[0];
        return terminals.find((t) => t.terminal_id === prev.terminal_id) ?? terminals[0];
      });
      setCartItems((prev) =>
        prev
          .filter((item) => prods.some((p) => p.product_id === item.product.product_id))
          .map((item) => {
            const latest = prods.find((p) => p.product_id === item.product.product_id);
            return latest ? { ...item, product: latest } : item;
          })
      );
      setError(null);
    } catch {
      if (isInitialLoad) {
        setError("Cannot connect to server. Make sure the FastAPI server is running on port 8000.");
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchCatalog(true);
  }, [fetchCatalog]);

  // Live catalog refresh while POS page is open
  useEffect(() => {
    const id = setInterval(() => {
      fetchCatalog(false);
    }, CATALOG_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchCatalog]);

  // Refresh immediately when tab becomes active again
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchCatalog(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [fetchCatalog]);

  // ---------- Cart operations ----------
  const addToCart = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.product_id === product.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product.product_id === product.product_id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((productId: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) =>
          i.product.product_id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCartItems((prev) => prev.filter((i) => i.product.product_id !== productId));
  }, []);

  const clearCart = () => {
    setCartItems([]);
    setSaleResult(null);
  };

  // ---------- Totals ----------
  const subtotal = cartItems.reduce(
    (sum, i) => sum + getPosPrice(i.product) * i.quantity,
    0
  );
  const taxAmount = subtotal * TAX_RATE;
  const grandTotal = subtotal + taxAmount;

  // ---------- Filtered products ----------
  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.product_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchesCat = selectedCategory === null || p.category_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // ---------- Confirm sale ----------
  const handleConfirmSale = async (cashReceived: number) => {
    setProcessing(true);
    try {
      const result = await api.createSale({
        pos_terminal_id: terminal?.terminal_id ?? 1,
        user_id: CURRENT_USER.user_id,
        customer_info: "Walk-in Customer",
        cash_received: cashReceived,
        service_charge: 0,
        items: cartItems.map((i) => ({
          product_id: i.product.product_id,
          quantity: i.quantity,
          unit_price: getPosPrice(i.product),
        })),
      });
      setSaleResult(result);
      setShowCheckout(false);
    } catch (e: unknown) {
      alert(`Error: ${e instanceof Error ? e.message : "Sale failed"}`);
    } finally {
      setProcessing(false);
    }
  };

  // ---------- Receipt view ----------
  if (saleResult) {
    return (
      <Receipt
        result={saleResult}
        cartItems={cartItems}
        terminal={terminal}
        onNewSale={clearCart}
      />
    );
  }

  // ---------- Header date/time ----------
  const dateStr = now.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  // ---------- Main POS view ----------
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ====== LEFT: Product catalog ====== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = "/"}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
              title="Go back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>
            <div>
              <span className="font-bold text-gray-900">
                {terminal?.terminal_name ?? "POS Terminal"}
              </span>
              <span className="text-gray-400 ml-1 text-sm">(JonBrix)</span>
            </div>
            <span className="text-gray-400 text-sm hidden sm:block">
              {dateStr} | {timeStr}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Cashier:{" "}
            <span className="font-semibold text-gray-800">{CURRENT_USER.full_name}</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name or SKU…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 px-6 py-2 bg-white border-b border-gray-200 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category_id}
              onClick={() => setSelectedCategory(cat.category_id)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.category_id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
              Loading products…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-red-600 text-sm text-center max-w-xs">{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.product_id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-xl p-4 text-left border border-gray-200 hover:border-blue-400 hover:shadow-md active:scale-95 transition-all group"
                >
                  <div className="w-full h-28 bg-gray-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-mono mb-1 truncate">
                    {product.sku}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 leading-tight mb-3 line-clamp-2 group-hover:text-blue-700">
                    {product.product_name}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate max-w-[70px]">
                      {product.category_name}
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      ₱{fmt(getPosPrice(product))}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ====== RIGHT: Cart panel ====== */}
      <div className="w-72 xl:w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">

        {/* Cart header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <ShoppingCart className="w-5 h-5" />
            Order
            {cartCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {cartCount}
              </span>
            )}
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <ShoppingCart className="w-8 h-8 mb-2 text-gray-200" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-0.5">Tap a product to add it</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.product.product_id}
                className="bg-gray-50 border border-gray-100 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs text-gray-400 font-mono">{item.product.sku}</p>
                  <button
                    onClick={() => removeFromCart(item.product.product_id)}
                    className="text-gray-300 hover:text-red-500 transition-colors -mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm font-medium text-gray-800 leading-tight mb-2 line-clamp-2">
                  {item.product.product_name}
                </p>
                <div className="flex items-center justify-between">
                  {/* Qty controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.product.product_id, -1)}
                      className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.product.product_id, 1)}
                      className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    ₱{fmt(item.product.unit_price * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Order summary + action */}
        <div className="border-t border-gray-200 px-4 py-4 flex-shrink-0 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>₱{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>VAT (6%)</span>
            <span>₱{fmt(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-200 pt-2">
            <span>GRAND TOTAL</span>
            <span>₱{fmt(grandTotal)}</span>
          </div>

          <button
            onClick={() => setShowCheckout(true)}
            disabled={cartItems.length === 0}
            className="w-full mt-1 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Complete Sale
          </button>
        </div>
      </div>

      {/* ====== Checkout modal ====== */}
      {showCheckout && (
        <CheckoutModal
          subtotal={subtotal}
          taxAmount={taxAmount}
          grandTotal={grandTotal}
          processing={processing}
          onClose={() => setShowCheckout(false)}
          onConfirm={handleConfirmSale}
        />
      )}
    </div>
  );
}
