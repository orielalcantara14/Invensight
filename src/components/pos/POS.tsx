import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RefreshCw, AlertCircle, ArrowLeft, CreditCard, Smartphone, User, Phone, MapPin, X, CheckCircle2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { getSession, clearSession } from "@/auth/session";
import type { Product, Category, Terminal, Supplier } from "@/services/api";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";

interface CartItem {
  product: Product;
  quantity: number;
}

interface SaleResult {
  invoice_id: number;
  invoice_number: string;
  transaction_timestamp: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  cash_received: number;
  change: number;
  payment_method?: string;
}

const TAX_RATE = 0.03;
const CATALOG_REFRESH_INTERVAL_MS = 15000;

// branding constants
const BRAND_NAME = "JonBrix";
const BRAND_ADDRESS = "Blk 77 lot 68 ascencion ave. Greater lagro, Quezon City, Philippines, 1118";

function fmt(n: any) {
  const val = typeof n === "number" ? n : parseFloat(n);
  if (isNaN(val)) return "0.00";
  return val.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPosPrice(product: Product): number {
  if (!product) return 0;
  const pos = typeof product.pos_price === "number" ? product.pos_price : NaN;
  if (Number.isFinite(pos)) return pos;
  return product.unit_price || 0;
}

function normalizePhilippineMobile(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  return null;
}

interface ReceiptProps {
  result: SaleResult;
  cartItems: CartItem[];
  terminal: Terminal | null;
  onNewSale: () => void;
}

function Receipt({ result, cartItems, terminal, onNewSale }: ReceiptProps) {
  const session = getSession();
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
        <div className="font-bold text-lg uppercase tracking-tight">
          {BRAND_NAME}
        </div>
        <div className="text-[10px] uppercase leading-tight mb-2">
          {BRAND_ADDRESS}
        </div>
        <div className="text-xs">
          <div>Receipt #: {result.invoice_number}</div>
          <div>Date: {dateStr} | Time: {timeStr}</div>
          <div>Cashier: {session?.full_name || "Unknown User"}</div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-3" />

        <div className="grid grid-cols-12 gap-1 font-bold border-b border-gray-200 pb-1 mb-2 text-[10px] uppercase">
          <div className="col-span-6">Product</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
        {cartItems.map((item, idx) => {
          const price = getPosPrice(item.product);
          const total = price * item.quantity;
          return (
            <div key={item.product.product_id} className="text-[11px] mb-2 border-b border-gray-50 pb-1 last:border-0">
              <div className="font-bold leading-tight">{idx + 1}. {item.product.product_name}</div>
              <div className="grid grid-cols-12 gap-1 text-gray-600 mt-0.5">
                <div className="col-span-6 pl-3 text-[9px] truncate">[{item.product.sku}]</div>
                <div className="col-span-2 text-center">{item.quantity}</div>
                <div className="col-span-2 text-right">{fmt(price)}</div>
                <div className="col-span-2 text-right font-bold text-black">{fmt(total)}</div>
              </div>
            </div>
          );
        })}

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-3" />

        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>ITEM TOTAL</span>
            <span>{fmt(result.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (3%)</span>
            <span>{fmt(result.tax_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-400">
            <span>SUBTOTAL</span>
            <span>{fmt(result.total_amount)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-3" />

        {/* Payment */}
        <div className="font-bold uppercase text-[10px] mb-1">Payment Details:</div>
        <div className="text-[11px] space-y-0.5">
          <div className="flex justify-between">
            <span>Method</span>
            <span>{result.payment_method || "Cash"}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid</span>
            <span>{fmt(result.cash_received)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-gray-100">
            <span>CHANGE</span>
            <span>{fmt(result.change)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
  );
}

export function POS() {
  const navigate = useNavigate();
  const session = getSession();
  const currentRole = (session?.role ?? "").trim().toLowerCase();
  const currentUser = {
    user_id: session?.user_id ?? 0,
    full_name: session?.full_name ?? "Unknown User"
  };

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchName, setSearchName] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchSupplier, setSearchSupplier] = useState("");

  const [processing, setProcessing] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cashInput, setCashInput] = useState("");

  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialCash, setPartialCash] = useState("");
  const [partialEWallet, setPartialEWallet] = useState("");

  const [customerData, setCustomerNameData] = useState({
    name: "",
    contact: "",
    address: "",
    method: "Cash",
    cashReceived: 0,
    cashAmount: 0,
    ewalletAmount: 0
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "failed" | "expired">("pending");
  const [paymongoSessionId, setPaymongoSessionId] = useState<string | null>(null);
  const [paymongoCheckoutUrl, setPaymongoCheckoutUrl] = useState<string | null>(null);

  const subtotal = cartItems.reduce((sum, i) => sum + (getPosPrice(i?.product) || 0) * (i?.quantity || 0), 0);
  const taxAmount = subtotal * TAX_RATE;
  const grandTotal = subtotal + taxAmount;

  // Sync partial payments
  useEffect(() => {
    if (isPartialPayment) {
      setPartialCash(grandTotal.toFixed(2));
      setPartialEWallet("0.00");
    } else {
      setPartialCash("");
      setPartialEWallet("");
    }
  }, [isPartialPayment, grandTotal]);

  const handlePartialCashChange = (val: string) => {
    setPartialCash(val);
    const cash = parseFloat(val) || 0;
    const remaining = Math.max(0, grandTotal - cash);
    setPartialEWallet(remaining.toFixed(2));
  };

  const handlePartialEWalletChange = (val: string) => {
    setPartialEWallet(val);
    const ewallet = parseFloat(val) || 0;
    const remaining = Math.max(0, grandTotal - ewallet);
    setPartialCash(remaining.toFixed(2));
  };

  const fetchCatalog = useCallback(async (isInitialLoad: boolean) => {
    try {
      if (isInitialLoad) setLoading(true);
      const [prods, cats, terminals, sups] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getTerminals(),
        api.getSuppliers(),
      ]);

      setProducts(prods);
      setCategories(cats);
      setSuppliers(sups);
      setTerminal((prev) => {
        if (!terminals.length) return null;
        if (!prev) return terminals[0];
        return terminals.find((t) => t.terminal_id === prev.terminal_id) ?? terminals[0];
      });
      setError(null);
    } catch {
      if (isInitialLoad) {
        setError("Cannot connect to server. Make sure the FastAPI server is running on port 8000.");
      }
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCatalog(true); }, [fetchCatalog]);

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


  const setQty = useCallback((productId: number, qtyString: string) => {
    const qty = parseInt(qtyString) || 0;
    setCartItems((prev) =>
      prev
        .map((i) =>
          i.product.product_id === productId ? { ...i, quantity: Math.max(0, qty) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const cashFloat = parseFloat(cashInput) || 0;
  const change = cashFloat - grandTotal;
  const withinLimit = cashFloat <= 500000;
  const sufficient = cashFloat >= grandTotal && withinLimit;

  const filteredProducts = products.filter((p) => {
    const pName = p.product_name.toLowerCase();
    const pCat = p.category_name?.toLowerCase() || '';
    const pSup = p.supplier_name?.toLowerCase() || '';

    return pName.includes(searchName.toLowerCase()) &&
      pCat.includes(searchCategory.toLowerCase()) &&
      pSup.includes(searchSupplier.toLowerCase());
  });

  const handleNumpad = (val: string) => {
    if (val === "DELETE") {
      setCashInput(prev => prev.slice(0, -1));
    } else if (val === "CANCEL") {
      setCashInput("");
      setPaymentMethod("Cash");
    } else if (val === "ENTER") {
      if (!processing && cartItems.length > 0 && (paymentMethod !== "Cash" || sufficient)) {
        handleConfirmSale();
      }
    } else {
      if (val === "." && cashInput.includes(".")) return;
      if (val === "00" && (!cashInput || cashInput === "0")) return;
      setCashInput(prev => prev + val);
    }
  };


  const handleConfirmSale = async () => {
    const trimmedContact = contactNumber.trim();
    const normalizedContact = trimmedContact ? normalizePhilippineMobile(trimmedContact) : null;

    const cashVal = isPartialPayment ? (parseFloat(partialCash) || 0) : (paymentMethod === "Cash" ? cashFloat : 0);
    const ewalletVal = isPartialPayment ? (parseFloat(partialEWallet) || 0) : (paymentMethod !== "Cash" ? grandTotal : 0);
    const finalMethod = isPartialPayment ? "Split" : paymentMethod;

    if (finalMethod === "Cash" && !sufficient) {
      toast.error("Insufficient cash received.");
      return;
    }

    if (finalMethod === "Split" && (cashVal + ewalletVal < grandTotal - 0.01)) {
      toast.error(`Insufficient total payment. Total: ₱${fmt(cashVal + ewalletVal)} vs ₱${fmt(grandTotal)}`);
      return;
    }

    const finalCashReceived = finalMethod === "Cash" ? cashFloat : (isPartialPayment ? cashVal : 0);

    const cData = {
      name: customerName,
      contact: normalizedContact || "",
      address: address,
      method: finalMethod,
      cashReceived: finalCashReceived,
      cashAmount: cashVal,
      ewalletAmount: ewalletVal
    };
    setCustomerNameData(cData);

    try {
      const requiresEWallet = finalMethod === "GCash" || finalMethod === "PayMaya" || (finalMethod === "Split" && ewalletVal > 0);

      if (requiresEWallet) {
        setProcessing(true);
        const ewalletAmountToSend = finalMethod === "Split" ? ewalletVal : grandTotal;

        // For partial payments, we send a single summarized item to ensure PayMongo UI matches the amount
        const paymongoItems = finalMethod === "Split"
          ? [{
            name: `POS Sale - Remaining Balance`,
            amount: Math.round(ewalletAmountToSend * 100),
            quantity: 1
          }]
          : cartItems.map(item => ({
            name: item.product.product_name,
            amount: Math.round(getPosPrice(item.product) * 100),
            quantity: item.quantity
          }));

        const sessionRes = await api.createPayMongoCheckoutSession({
          amount: Math.round(ewalletAmountToSend * 100),
          currency: "PHP",
          description: `POS Sale - ${customerName || "Walk-in"}`,
          customer_name: customerName,
          customer_phone: normalizedContact || undefined,
          items: paymongoItems
        });

        const checkoutUrl = sessionRes.data?.attributes?.checkout_url;
        const sId = sessionRes.data?.id;

        if (checkoutUrl && sId) {
          localStorage.setItem("invensight_pending_sale", JSON.stringify({ cData, cartItems, sessionId: sId }));
          window.location.href = checkoutUrl;
          return;
        } else {
          throw new Error("Could not generate checkout session.");
        }
      }

      setProcessing(true);
      const result = await api.createSale({
        pos_terminal_id: terminal?.terminal_id ?? 1,
        user_id: currentUser.user_id,
        customer_info: customerName || "Walk-in Customer",
        customer_name: customerName,
        contact_number: normalizedContact || undefined,
        address: address,
        payment_method: finalMethod,
        cash_received: finalCashReceived,
        cash_amount: cashVal,
        ewallet_amount: ewalletVal,
        service_charge: 0,
        items: cartItems.map((i) => ({
          product_id: i.product.product_id,
          quantity: i.quantity,
          unit_price: getPosPrice(i.product),
        })),
      });

      setSaleResult(result);
      setCashInput("");
      toast.success("Sale completed successfully!");
    } catch (e: unknown) {
      toast.error(`Error: ${e instanceof Error ? e.message : "Sale failed"}`);
    } finally {
      setProcessing(false);
    }
  };


  const handlePayMongoFailure = async () => {
    const stored = localStorage.getItem("invensight_pending_sale");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (!parsed) return;
      const { cData: storedCData, cartItems: storedCartItems, sessionId } = parsed;

      if (!storedCData) {
        console.warn("No stored customer data in partial/split payment recovery");
        localStorage.removeItem("invensight_pending_sale");
        return;
      }

      // Record failure to backend for analytics
      try {
        if (!storedCData) {
          console.warn("No stored customer data for PayMongo failure handler");
          return;
        }
        await api.createSale({
          pos_terminal_id: terminal?.terminal_id ?? 1,
          user_id: currentUser.user_id,
          customer_info: storedCData?.name || "Walk-in Customer",
          customer_name: storedCData?.name,
          contact_number: storedCData?.contact,
          address: storedCData?.address,
          payment_method: storedCData?.method || "Cash",
          cash_received: storedCData?.cashReceived || 0,
          cash_amount: storedCData?.cashAmount || 0,
          ewallet_amount: storedCData?.ewalletAmount || 0,
          service_charge: 0,
          items: (storedCartItems || []).map((i: any) => ({
            product_id: i.product?.product_id || 0,
            quantity: i.quantity || 0,
            unit_price: getPosPrice(i.product),
          })),
          payment_status: "Failed",
          failure_reason: "Payment window closed or transaction failed",
          paymongo_source_id: sessionId
        });
      } catch (apiErr) {
        console.error("Failed to record failure in DB:", apiErr);
      }

      // Restore state
      setCartItems(storedCartItems || []);
      setCustomerName(storedCData?.name || "");
      setContactNumber(storedCData?.contact || "");
      setAddress(storedCData?.address || "");

      if (storedCData?.method === "Split") {
        setIsPartialPayment(true);
        setTimeout(() => {
          setPartialCash(storedCData?.cashAmount?.toString() || "0.00");
          setPartialEWallet(storedCData?.ewalletAmount?.toString() || "0.00");
        }, 100);
      } else {
        setPaymentMethod(storedCData?.method || "Cash");
      }

      localStorage.removeItem("invensight_pending_sale");
      toast.error("Payment failed or was cancelled. Your cart has been restored.", {
        duration: 5000,
        description: "A record of this failed attempt has been saved."
      });
    } catch (e) {
      console.error("Error restoring after failure:", e);
      localStorage.removeItem("invensight_pending_sale");
    }
  };


  const handlePayMongoSuccess = async () => {
    const stored = localStorage.getItem("invensight_pending_sale");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (!parsed) return;
      const { cData: storedCData, cartItems: storedCartItems, sessionId } = parsed;

      if (!storedCData || !storedCartItems) {
        console.warn("Incomplete sale data in localStorage");
        localStorage.removeItem("invensight_pending_sale");
        return;
      }

      setProcessing(true);
      try {
        const result = await api.createSale({
          pos_terminal_id: terminal?.terminal_id ?? 1,
          user_id: currentUser.user_id,
          customer_info: storedCData.name || "Walk-in Customer",
          customer_name: storedCData.name,
          contact_number: storedCData.contact,
          address: storedCData.address,
          payment_method: storedCData.method,
          cash_received: storedCData.cashReceived || 0,
          cash_amount: storedCData.cashAmount || 0,
          ewallet_amount: storedCData.ewalletAmount || 0,
          service_charge: 0,
          items: (storedCartItems || []).map((i: any) => ({
            product_id: i.product?.product_id || 0,
            quantity: i.quantity || 0,
            unit_price: getPosPrice(i.product),
          })),
          paymongo_source_id: sessionId,
          payment_status: "Paid"
        });

        setCartItems(storedCartItems);
        setCustomerNameData(storedCData);
        setSaleResult(result);
        localStorage.removeItem("invensight_pending_sale");
        toast.success(`Payment verified and sale finalized!`);
      } catch (e: unknown) {
        toast.error(`Error finalizing sale: ${e instanceof Error ? e.message : "Finalization failed"}`);
        // If it failed but we have data, keep it in localStorage to retry? 
        // No, let's allow them to try again manually from restored state.
        setCartItems(storedCartItems);
        setCustomerName(storedCData.name || "");
      }
    } catch (e: unknown) {
      console.error("Error parsing stored sale data:", e);
      localStorage.removeItem("invensight_pending_sale");
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success") {
        handlePayMongoSuccess();
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get("payment") === "failed") {
        handlePayMongoFailure();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.error("Critical error in payment param handler:", e);
    }
  }, []);

  if (saleResult) {
    return <Receipt result={saleResult} cartItems={cartItems} terminal={terminal} onNewSale={clearCart} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 flex-col sm:flex-row font-sans">
      {/* ====== LEFT: Checkout Panel ====== */}
      <div className="w-full sm:w-[450px] shadow-lg z-10 bg-white flex flex-col border-r border-gray-200 flex-shrink-0">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
          <div className="flex items-center gap-2">
            {currentRole === "cashier" ? (
              <button onClick={handleLogout} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 flex items-center gap-1 font-bold text-[10px] uppercase group">
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Logout
              </button>
            ) : (
              <button onClick={() => navigate("/sales")} className="text-gray-500 hover:text-gray-800 transition-colors p-1 rounded hover:bg-gray-100 flex items-center gap-1 font-bold text-[10px] uppercase">
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
            )}
            <h1 className="text-2xl font-black text-blue-600 tracking-tight">CheckOut</h1>
          </div>
          {cartItems.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-4">
                <input type="checkbox" id="partial-toggle" checked={isPartialPayment} onChange={(e) => setIsPartialPayment(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <label htmlFor="partial-toggle" className="text-xs font-bold text-gray-700 cursor-pointer">PARTIAL</label>
              </div>
              <button onClick={clearCart} className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded uppercase">CLEAR</button>
            </div>
          )}
        </div>

        <div className="p-4 gap-2 bg-white border-b border-gray-100 flex flex-col">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Customer</label>
              <input type="text" placeholder="Walk-in" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Contact (Optional)</label>
              <input type="text" placeholder="+639..." value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Address (Optional)</label>
            <input type="text" placeholder="Complete Address" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-bold text-xs uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-1">
              {cartItems.map(item => (
                <div key={item.product?.product_id} className="bg-white p-3 border border-gray-100 flex items-center justify-between group">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-bold text-gray-800 text-xs uppercase truncate">{item.product.product_name}</div>
                    <div className="text-[9px] text-gray-400 font-black uppercase mt-0.5 tracking-tighter">{item.product.sku}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                      <button onClick={() => updateQty(item.product?.product_id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black font-black">-</button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => setQty(item.product?.product_id, e.target.value)}
                        className="w-10 bg-transparent text-center text-[11px] font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button onClick={() => updateQty(item.product?.product_id, 1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black font-black">+</button>
                    </div>
                    <div className="font-black text-gray-900 text-xs w-20 text-right">₱ {fmt(getPosPrice(item.product) * item.quantity)}</div>
                    <button onClick={() => removeFromCart(item.product?.product_id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-200 space-y-1.5">
          <div className="flex justify-between text-[10px] text-gray-400 font-black uppercase tracking-wider">
            <span>Item Total</span>
            <span>₱ {fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-blue-600 pt-1 border-t border-gray-50">
            <span className="text-xs font-black uppercase tracking-widest">Subtotal</span>
            <span className="text-2xl font-black">₱ {fmt(grandTotal)}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white p-4">
          {isPartialPayment ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Cash Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-black">₱</span>
                  <input type="number" value={partialCash} onChange={(e) => handlePartialCashChange(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-7 pr-4 text-lg font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">E-Wallet Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-black">₱</span>
                  <input type="number" value={partialEWallet} onChange={(e) => handlePartialEWalletChange(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-7 pr-4 text-lg font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Cash Received</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-black">₱</span>
                  <input type="number" value={cashInput} onChange={(e) => setCashInput(e.target.value)} placeholder="0.00" className="w-full bg-gray-100 border-none rounded-xl py-3 pl-8 text-2xl font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="w-32">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Change</label>
                <div className={`py-3 px-2 rounded-xl text-center font-black text-xl truncate h-[52px] flex items-center justify-center ${change >= 0 && cashFloat > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {fmt(Math.max(0, change))}
                </div>
              </div>
            </div>
          )}

          {!isPartialPayment && (
            <div className="flex gap-2 mb-4">
              {["CASH", "GCASH", "PAYMAYA"].map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m === "CASH" ? "Cash" : m === "GCASH" ? "GCash" : "PayMaya")} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] tracking-widest transition-all ${paymentMethod === (m === "CASH" ? "Cash" : m === "GCASH" ? "GCash" : "PayMaya") ? "border-blue-600 bg-blue-600 text-white shadow-lg" : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>
                  {m}
                </button>
              ))}
            </div>
          )}

          <button onClick={handleConfirmSale} disabled={processing || cartItems.length === 0 || (paymentMethod === "Cash" && !isPartialPayment && !sufficient)} className="w-full py-4 bg-[#38b75e] hover:bg-[#2fa050] text-white font-black text-xl rounded-2xl shadow-xl shadow-green-200 transition-all active:scale-[0.98] disabled:opacity-50 pulse-button">
            {processing ? "PROCESSING..." : "FINALIZE SALE"}
          </button>
        </div>
      </div>

      {/* ====== RIGHT: Products Panel ====== */}
      <div className="flex-1 flex flex-col min-w-0 bg-white z-0">
        <div className="p-4 border-b border-gray-100 bg-white grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="SEARCH PRODUCT..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl py-3 pl-10 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-gray-300" />
          </div>
          <select value={searchCategory} onChange={e => setSearchCategory(e.target.value)} className="bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none appearance-none cursor-pointer">
            <option value="">ALL CATEGORIES</option>
            {categories.map(cat => <option key={cat.category_id} value={cat.category_name}>{cat.category_name}</option>)}
          </select>
          <select value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} className="bg-gray-50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none appearance-none cursor-pointer">
            <option value="">ALL SUPPLIERS</option>
            {suppliers.map(sup => <option key={sup.supplier_id} value={sup.supplier_name}>{sup.supplier_name}</option>)}
          </select>
        </div>

        <div className="px-6 py-3 bg-gray-50 grid grid-cols-12 gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
          <div className="col-span-5">Product Details</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Supplier</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-1"></div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-2">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-xs font-bold animate-pulse uppercase">Syncing Catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-200">
              <ShoppingCart className="w-20 h-20 mb-4 opacity-10" />
              <p className="font-black text-xs uppercase tracking-tighter">No items found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredProducts.map(product => (
                <div key={product.product_id} className="grid grid-cols-12 gap-4 items-center px-4 py-4 hover:bg-blue-50/50 transition-all group cursor-pointer" onClick={() => addToCart(product)}>
                  <div className="col-span-5">
                    <div className="text-[11px] font-black text-gray-800 uppercase group-hover:text-blue-600 transition-colors uppercase">{product.product_name}</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{product.sku}</div>
                  </div>
                  <div className="col-span-2 text-[10px] font-bold text-gray-400 uppercase truncate">{product.category_name}</div>
                  <div className="col-span-2 text-[10px] font-bold text-gray-400 uppercase truncate">{product.supplier_name}</div>
                  <div className="col-span-2 text-right text-xs font-black text-gray-900 pr-2">₱ {fmt(getPosPrice(product))}</div>
                  <div className="col-span-1 text-right">
                    <button className="w-8 h-8 flex items-center justify-center bg-gray-100 group-hover:bg-blue-600 group-hover:text-white rounded-full transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
