import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RefreshCw, AlertCircle, ArrowLeft, CreditCard, Smartphone, User, Phone, MapPin, X, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "@/services/api";
import type { Product, Category, Terminal } from "@/services/api";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";

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
  payment_method?: string;
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
        <div>Payment Method | {result.payment_method || "Cash"}</div>
        <div>{result.payment_method === "GCash" ? "GCash Paid" : "Cash Received"} | {fmt(result.cash_received)}</div>
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
  onConfirm: (data: { 
    cashReceived: number; 
    customerName: string; 
    contactNumber: string; 
    address: string; 
    paymentMethod: string;
  }) => void;
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
  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paymentMethod === "Cash") {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [paymentMethod]);

  const cashFloat = parseFloat(cashInput) || 0;
  const change = cashFloat - grandTotal;
  const withinLimit = cashFloat <= 500000;
  const sufficient = cashFloat >= grandTotal && withinLimit;
  const canGenerateQR = paymentMethod === "Cash" || (cashFloat >= grandTotal && withinLimit);

  const handleConfirm = () => {
    if (sufficient && !processing) {
      onConfirm({
        cashReceived: cashFloat,
        customerName,
        contactNumber,
        address,
        paymentMethod
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">Complete Payment</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Order Summary Card */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-2 border border-blue-100">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal:</span>
              <span>₱{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax (6%):</span>
              <span>₱{fmt(taxAmount)}</span>
            </div>
            <div className="border-t border-blue-200 my-2 pt-2 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="text-2xl font-black text-blue-600">₱{fmt(grandTotal)}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Street, City"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
              >
                <option value="Cash">Cash Payment</option>
                <option value="GCash">GCash (PayMongo)</option>
                <option value="PayMaya">PayMaya (PayMongo)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {paymentMethod === "Cash" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cash Received (₱)
                </label>
                <input
                  ref={inputRef}
                  type="number"
                  min={grandTotal}
                  max={500000}
                  step="0.01"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-2xl font-black text-gray-900 outline-none"
                  placeholder="0.00"
                />
              </div>

              {sufficient && cashFloat > 0 && (
                <div className="flex justify-between items-center bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-green-800">
                  <span className="font-bold">CHANGE</span>
                  <span className="text-xl font-black">₱{fmt(change)}</span>
                </div>
              )}
              {!sufficient && cashFloat > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Need ₱{fmt(grandTotal - cashFloat)} more</span>
                </div>
              )}
              {cashFloat > 500000 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Maximum cash received is ₱500,000</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Received (₱)
                </label>
                <input
                  ref={inputRef}
                  type="number"
                  min={grandTotal}
                  max={500000}
                  step="0.01"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-2xl font-black text-gray-900 outline-none"
                  placeholder="0.00"
                />
              </div>

              {sufficient && cashFloat > 0 && change >= 0 && (
                <div className="flex justify-between items-center bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-green-800">
                  <span className="font-bold">CHANGE</span>
                  <span className="text-xl font-black">₱{fmt(change)}</span>
                </div>
              )}
              {!sufficient && cashFloat > 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Need ₱{fmt(grandTotal - cashFloat)} more</span>
                </div>
              )}
              {cashFloat > 500000 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-700 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Maximum amount received is ₱500,000</span>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <p className="text-blue-800 font-bold text-sm">PayMongo QR Payment</p>
                <p className="text-blue-600 text-xs">Customer will scan a QR code to complete payment via {paymentMethod}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex gap-3 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 bg-white rounded-xl text-gray-700 hover:bg-gray-50 font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!sufficient || processing}
            className={`flex-1 py-3 rounded-xl font-black text-white transition-all shadow-lg ${
              paymentMethod === "Cash" 
                ? "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300" 
                : "bg-green-600 hover:bg-green-700 disabled:bg-green-300"
            }`}
          >
            {processing 
              ? "Processing..." 
              : paymentMethod === "Cash" ? "Confirm Sale" : "Generate QR Code"
            }
          </button>
        </div>
      </div>
    </div>
  );
}

interface PayMongoModalProps {
  amount: number;
  qrUrl: string;
  sourceId: string;
  paymentMethod: string;
  onSuccess: () => void;
  onFailed: () => void;
  onClose: () => void;
}

function PayMongoModal({ amount, qrUrl, sourceId, paymentMethod, onSuccess, onFailed, onClose }: PayMongoModalProps) {
  const [polling, setPolling] = useState(true);
  const [status, setStatus] = useState<"pending" | "chargeable" | "failed">("pending");

  useEffect(() => {
    if (!polling || !sourceId) return;

    const interval = setInterval(async () => {
      try {
        let paymentStatus: string | undefined;

        if (paymentMethod === "PayMaya") {
          // PaymentIntent workflow for PayMaya
          const res = await api.getPayMongoPaymentIntent(sourceId);
          paymentStatus = res.data?.attributes?.status;
        } else {
          // Sources workflow for GCash
          const res = await api.getPayMongoSource(sourceId);
          paymentStatus = res.data?.attributes?.status;
        }

        // For GCash (Sources): "chargeable" means payment is ready
        // For PayMaya (PaymentIntent): "succeeded" means payment is complete
        const isSuccess = paymentMethod === "PayMaya" 
          ? paymentStatus === "succeeded" 
          : paymentStatus === "chargeable";

        const isFailed = paymentStatus === "failed" || paymentStatus === "cancelled" || paymentStatus === "canceled";

        if (isSuccess) {
          setPolling(false);
          setStatus("chargeable");
          onSuccess();
        } else if (isFailed) {
          setPolling(false);
          setStatus("failed");
          onFailed();
        }
      } catch {
        // Ignore polling errors, keep trying
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sourceId, polling, paymentMethod, onSuccess, onFailed]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">PayMongo - {paymentMethod}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-50 rounded-2xl p-6 text-center border border-blue-100">
          <p className="text-sm text-blue-600 font-bold mb-1">Total Amount</p>
          <p className="text-4xl font-black text-blue-700">₱{fmt(amount)}</p>
        </div>

        <div className="relative bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center">
          {qrUrl ? (
            <>
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <QRCodeCanvas value={qrUrl} size={180} />
              </div>
              <p className="text-sm font-bold text-gray-500">Scan with {paymentMethod} app</p>
            </>
          ) : (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-red-500">QR code not available</p>
              <p className="text-xs text-gray-400 mt-1">Please try again or use another payment method</p>
            </div>
          )}
        </div>

        {polling && (
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <p className="text-sm font-medium">Waiting for payment...</p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
          <p className="text-yellow-800 text-xs font-medium leading-relaxed">
            <span className="font-black">Note:</span> Customer should scan this QR code with their {paymentMethod} app to complete payment.
          </p>
        </div>

        <button
          onClick={onSuccess}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg"
        >
          Confirm Payment (Test)
        </button>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onFailed}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all"
          >
            Cancel Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
  );
}

// ---------------------------------------------------------------------------
// Main POS page
// ---------------------------------------------------------------------------
export function POS() {
  const navigate = useNavigate();
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

  // PayMongo specific state
  const [showPayMongo, setShowPayMongo] = useState(false);
  const [payMongoQR, setPayMongoQR] = useState("");
  const [payMongoSourceId, setPayMongoSourceId] = useState("");
  const [customerData, setCustomerNameData] = useState({
    name: "",
    contact: "",
    address: "",
    method: "Cash",
    cashReceived: 0
  });

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
    const availableStock = product.quantity ?? 0;
    if (availableStock <= 0) {
      toast.error(`${product.product_name} is out of stock`);
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.product_id === product.product_id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          toast.error(`Only ${availableStock} in stock for ${product.product_name}`);
          return prev;
        }
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
  const handleConfirmSale = async (data: { 
    cashReceived: number; 
    customerName: string; 
    contactNumber: string; 
    address: string; 
    paymentMethod: string;
  }) => {
    setProcessing(true);
    setCustomerNameData({
      name: data.customerName,
      contact: data.contactNumber,
      address: data.address,
      method: data.paymentMethod,
      cashReceived: data.cashReceived
    });

    try {
      if (data.paymentMethod === "GCash") {
        // Create PayMongo Source for GCash
        const sourceRes = await api.createPayMongoSource({
          amount: Math.round(grandTotal * 100), // convert to centavos
          type: "gcash",
          currency: "PHP",
          description: `POS Sale - ${data.customerName || "Walk-in"}`,
          customer_name: data.customerName,
          customer_phone: data.contactNumber,
        });

        const source = sourceRes.data;
        const checkoutUrl = source.attributes?.redirect?.checkout_url 
          || source.attributes?.source?.qr_code_url 
          || source.attributes?.qr_code_url;
        
        if (!checkoutUrl) {
          toast.error("Failed to generate QR code. Please try again.");
          console.error("PayMongo response:", source);
          return;
        }

        setPayMongoQR(checkoutUrl);
        setPayMongoSourceId(source.id);
        setShowCheckout(false);
        setShowPayMongo(true);
        return;
      }

      if (data.paymentMethod === "PayMaya") {
        // Create PayMongo PaymentIntent for PayMaya
        const intentRes = await api.createPayMongoPaymentIntent({
          amount: Math.round(grandTotal * 100), // convert to centavos
          currency: "PHP",
          payment_method_allowed: "paymaya",
          customer_name: data.customerName,
          customer_phone: data.contactNumber,
        });

        const intent = intentRes.data;
        const nextAction = intent.attributes?.next_action;
        const qrCodeUrl = nextAction?.paymaya?.qr_code_url 
          || nextAction?.redirect?.url
          || intent.attributes?.client_key;
        
        if (!qrCodeUrl) {
          toast.error("Failed to generate QR code. Please try again.");
          console.error("PayMongo PaymentIntent response:", intent);
          return;
        }

        setPayMongoQR(qrCodeUrl);
        setPayMongoSourceId(intent.id);
        setShowCheckout(false);
        setShowPayMongo(true);
        return;
      }

      // Normal Cash Flow
      const result = await api.createSale({
        pos_terminal_id: terminal?.terminal_id ?? 1,
        user_id: CURRENT_USER.user_id,
        customer_info: data.customerName || "Walk-in Customer",
        customer_name: data.customerName,
        contact_number: data.contactNumber,
        address: data.address,
        payment_method: "Cash",
        cash_received: data.cashReceived,
        service_charge: 0,
        items: cartItems.map((i) => ({
          product_id: i.product.product_id,
          quantity: i.quantity,
          unit_price: getPosPrice(i.product),
        })),
      });
      setSaleResult(result);
      setShowCheckout(false);
      toast.success("Sale completed successfully!");
    } catch (e: unknown) {
      toast.error(`Error: ${e instanceof Error ? e.message : "Sale failed"}`);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayMongoSuccess = async () => {
    setProcessing(true);
    try {
      const result = await api.createSale({
        pos_terminal_id: terminal?.terminal_id ?? 1,
        user_id: CURRENT_USER.user_id,
        customer_info: customerData.name || "Walk-in Customer",
        customer_name: customerData.name,
        contact_number: customerData.contact,
        address: customerData.address,
        payment_method: customerData.method,
        cash_received: customerData.cashReceived || grandTotal,
        service_charge: 0,
        items: cartItems.map((i) => ({
          product_id: i.product.product_id,
          quantity: i.quantity,
          unit_price: getPosPrice(i.product),
        })),
        paymongo_source_id: payMongoSourceId
      });
      setSaleResult(result);
      setShowPayMongo(false);
      toast.success(`${customerData.method} payment verified and sale completed!`);
    } catch (e: unknown) {
      toast.error(`Error finalizing sale: ${e instanceof Error ? e.message : "Finalization failed"}`);
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
              onClick={() => navigate("/sales")}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
              title="Go back to Sales"
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
                  <p className={`text-xs mt-1 ${product.quantity && product.quantity <= 5 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    Stock: {product.quantity ?? 0}
                  </p>
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

      {/* ====== PayMongo modal ====== */}
      {showPayMongo && (
        <PayMongoModal
          amount={grandTotal}
          qrUrl={payMongoQR}
          sourceId={payMongoSourceId}
          onSuccess={handlePayMongoSuccess}
          onFailed={() => {
            setShowPayMongo(false);
            toast.error("GCash payment failed or was cancelled.");
          }}
          onClose={() => setShowPayMongo(false)}
        />
      )}
    </div>
  );
}
