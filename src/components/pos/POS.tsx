import React, { useState, useEffect, useRef, useCallback, useMemo, Component, type ErrorInfo } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RefreshCw, AlertCircle, ArrowLeft, CreditCard, Smartphone, User, Phone, MapPin, X, CheckCircle2, LogOut } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "@/services/api";
import { getSession, clearSession } from "@/auth/session";
import type { Product, Category, Terminal, Supplier } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Types ---
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
  change_amount?: number;
  cash_given?: number;
  ewallet_amount?: number;
  payment_method?: string;
  cash_amount?: number;
}

// --- Local Error Boundary for POS ---
class POSErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("POS CRITICAL CRASH:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-50 p-10 text-center font-sans">
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-red-200 max-w-lg">
             <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
             <h1 className="text-2xl font-black text-gray-900 mb-2">POS TERMINAL CRASHED</h1>
             <p className="text-gray-600 mb-6 font-medium">An internal error occurred during render. This is usually caused by a data mismatch or a routing conflict.</p>
             <div className="bg-red-50 p-4 rounded-xl text-left mb-6 overflow-auto max-h-40">
                <code className="text-xs text-red-700 font-mono break-all">{this.state.error?.message}</code>
             </div>
             <button onClick={() => window.location.reload()} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-100">
               Force Reset Terminal
             </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Constants ---
const TAX_RATE = 0.03;
const BRAND_NAME = "JonBrix";
const BRAND_ADDRESS = "Blk 77 lot 68 ascencion ave. Greater lagro, Quezon City, Philippines, 1118";

// --- Helpers ---
function fmt(n: any): string {
  const val = typeof n === "number" ? n : parseFloat(n);
  if (isNaN(val)) return "0.00";
  try {
    return val.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return val.toFixed(2);
  }
}

function getPosPrice(product: Product | null | undefined): number {
  if (!product) return 0;
  const pos = typeof product.pos_price === "number" ? product.pos_price : NaN;
  if (Number.isFinite(pos)) return pos;
  return product.unit_price || 0;
}

function normalizePhilippineMobile(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  const digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
  return null;
}

// --- Components ---

function Receipt({ result, cartItems, onNewSale }: { result: SaleResult; cartItems: CartItem[]; onNewSale: () => void }) {
  const session = getSession();
  const saleDate = result?.transaction_timestamp ? new Date(result.transaction_timestamp) : new Date();
  const dateStr = saleDate.toLocaleDateString("en-PH", { year: "numeric", month: "2-digit", day: "2-digit" });
  const timeStr = saleDate.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center justify-start p-8 animate-in fade-in duration-500">
      <div className="flex gap-3 mb-6 print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium">
          <Printer className="w-4 h-4" /> Print Receipt
        </button>
        <button onClick={onNewSale} className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium">
          <RefreshCw className="w-4 h-4" /> New Sale
        </button>
      </div>

      <div id="receipt" className="bg-card shadow-xl p-6 w-full max-w-xs font-mono text-sm leading-relaxed" style={{ minWidth: "300px" }}>
        <div className="font-bold text-lg uppercase tracking-tight">{BRAND_NAME}</div>
        <div className="text-[10px] uppercase leading-tight mb-2 opacity-60">{BRAND_ADDRESS}</div>
        
        <div className="text-xs space-y-0.5 border-t border-b border-gray-100 py-2 my-2">
          <div>Receipt #: {result?.invoice_number || "N/A"}</div>
          <div>Date: {dateStr} | Time: {timeStr}</div>
          <div>Cashier: {session?.full_name || "System"}</div>
        </div>

        <div className="grid grid-cols-12 gap-1 font-bold border-b border-gray-100 pb-1 mb-2 text-[10px] uppercase text-muted-foreground">
          <div className="col-span-6">Product</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-4 text-right">Total</div>
        </div>

        <div className="space-y-2">
          {(cartItems || []).map((item, idx) => {
            if (!item?.product) return null;
            const price = getPosPrice(item.product);
            const total = price * (item.quantity || 0);
            return (
              <div key={item.product.product_id} className="text-[11px]">
                <div className="font-bold leading-tight">{idx + 1}. {item.product.product_name}</div>
                <div className="grid grid-cols-12 gap-1 text-muted-foreground mt-0.5">
                  <div className="col-span-6 pl-3 text-[9px] truncate opacity-50">[{item.product.sku}]</div>
                  <div className="col-span-2 text-center">{item.quantity}</div>
                  <div className="col-span-4 text-right font-bold text-black">{fmt(total)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-dashed border-gray-300 my-4" />

        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span>SUBTOTAL</span><span>{fmt(result?.subtotal)}</span></div>
          <div className="flex justify-between"><span>VAT (3%)</span><span>{fmt(result?.tax_amount)}</span></div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-400 mt-1">
            <span>GRAND TOTAL</span><span>{fmt(result?.total_amount)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 my-4" />

        <div className="font-bold uppercase text-[10px] mb-1 text-muted-foreground">Payment:</div>
        <div className="text-[11px] space-y-0.5">
          {result?.payment_method === "Split" ? (
            <>
              <div className="flex justify-between"><span>Method</span><span className="font-bold">Split</span></div>
              <div className="flex justify-between text-[10px] opacity-70"><span>Cash Portion</span><span>{fmt(result?.cash_amount)}</span></div>
              <div className="flex justify-between text-[10px] opacity-70"><span>E-Wallet Portion</span><span>{fmt(result?.ewallet_amount)}</span></div>
            </>
          ) : (
            <div className="flex justify-between"><span>Method</span><span className="font-bold">{result?.payment_method || "Cash"}</span></div>
          )}
          <div className="flex justify-between font-bold pt-1 border-t border-gray-100 mt-2">
            <span>CHANGE</span><span>{fmt(result?.change || result?.change_amount || 0)}</span>
          </div>
        </div>
        
        <div className="mt-6 text-center text-[9px] uppercase tracking-widest opacity-40">
          Thank you for your business!
        </div>
      </div>
    </div>
  );
}

// --- Internal POS Component (The original UI) ---

function POSInternal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = getSession();
  
  const currentRole = useMemo(() => String(session?.role ?? "").trim().toLowerCase(), [session]);
  const currentUser = useMemo(() => ({
    user_id: session?.user_id ?? 0,
    full_name: String(session?.full_name ?? "Unknown User")
  }), [session]);

  // State
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
  const [numpadTarget, setNumpadTarget] = useState<"cash" | "partialCash" | "partialEWallet">("cash");

  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [partialCash, setPartialCash] = useState("");
  const [partialEWallet, setPartialEWallet] = useState("");

  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const hasProcessedPayment = useRef(false);

  // Derived
  const subtotal = useMemo(() => (cartItems || []).reduce((sum, i) => sum + (getPosPrice(i?.product) * (i?.quantity || 0)), 0), [cartItems]);
  const taxAmount = subtotal * TAX_RATE;
  const grandTotal = subtotal + taxAmount;

  const cashFloat = parseFloat(cashInput) || 0;
  const change = cashFloat - grandTotal;
  const sufficient = cashFloat >= grandTotal - 0.01;

  const handleLogout = useCallback(() => {
    clearSession();
    window.location.href = "/login";
  }, []);

  // Effects
  useEffect(() => {
    if (isPartialPayment) {
      setPartialCash(grandTotal.toFixed(2));
      setPartialEWallet("0.00");
    } else {
      setPartialCash("");
      setPartialEWallet("");
    }
  }, [isPartialPayment, grandTotal]);

  const formatNumberWithCommas = (value: string | number) => {
    const s = typeof value === "number" ? value.toString() : value;
    if (!s) return "";
    const parts = s.split(".");
    parts[0] = (parts[0] || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const handlePartialCashChange = (val: string) => {
    const clean = val.replace(/,/g, "");
    if (clean !== "" && !/^\d*\.?\d*$/.test(clean)) return;
    setPartialCash(clean);
    const cash = parseFloat(clean) || 0;
    setPartialEWallet(Math.max(0, grandTotal - cash).toFixed(2));
  };

  const handlePartialEWalletChange = (val: string) => {
    const clean = val.replace(/,/g, "");
    if (clean !== "" && !/^\d*\.?\d*$/.test(clean)) return;
    setPartialEWallet(clean);
    const ewal = parseFloat(clean) || 0;
    setPartialCash(Math.max(0, grandTotal - ewal).toFixed(2));
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

      setProducts(prods || []);
      setCategories(cats || []);
      setSuppliers(sups || []);
      setTerminal((prev) => {
        const list = terminals || [];
        if (!list.length) return null;
        if (!prev) return list[0];
        return list.find((t) => t.terminal_id === prev.terminal_id) ?? list[0];
      });
      setError(null);
    } catch {
      if (isInitialLoad) setError("Connection failed. Ensure API is running.");
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCatalog(true); }, [fetchCatalog]);

  const addToCart = useCallback((product: Product) => {
    const stock = product?.quantity ?? 0;
    if (stock <= 0) { toast.error("Out of stock"); return; }
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product?.product_id === product?.product_id);
      if (existing) {
        if (existing.quantity >= stock) { toast.error("Stock limit reached"); return prev; }
        return prev.map((i) => i.product?.product_id === product?.product_id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateQty = useCallback((pid: number, delta: number) => {
    setCartItems((prev) => prev.map((i) => i.product?.product_id === pid ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0));
  }, []);

  const setQty = useCallback((pid: number, val: string) => {
    const q = parseInt(val) || 0;
    setCartItems((prev) => prev.map((i) => i.product?.product_id === pid ? { ...i, quantity: Math.max(0, q) } : i).filter((i) => i.quantity > 0));
  }, []);

  const removeFromCart = useCallback((pid: number) => {
    setCartItems((prev) => prev.filter((i) => i.product?.product_id !== pid));
  }, []);

  const clearCart = () => { setCartItems([]); setSaleResult(null); };

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      if (!p) return false;
      const name = (p.product_name || "").toLowerCase();
      const cat = (p.category_name || "").toLowerCase();
      const sup = (p.supplier_name || "").toLowerCase();
      return name.includes(searchName.toLowerCase()) && cat.includes(searchCategory.toLowerCase()) && sup.includes(searchSupplier.toLowerCase());
    });
  }, [products, searchName, searchCategory, searchSupplier]);

  const handleNumpad = (val: string) => {
    const update = (prev: string) => {
      if (val === "CANCEL") return "";
      if (val === "DELETE") return prev.slice(0, -1);
      if (val === "." && prev.includes(".")) return prev;
      if (val === "00" && (!prev || prev === "0")) return prev;
      return prev + val;
    };
    if (numpadTarget === "cash") setCashInput(update(cashInput));
    else if (numpadTarget === "partialCash") handlePartialCashChange(update(partialCash));
    else if (numpadTarget === "partialEWallet") handlePartialEWalletChange(update(partialEWallet));
  };

  const handleConfirmSale = async () => {
    const normalizedContact = normalizePhilippineMobile(contactNumber);
    const cashVal = isPartialPayment ? (parseFloat(partialCash) || 0) : (paymentMethod === "Cash" ? cashFloat : 0);
    const ewalletVal = isPartialPayment ? (parseFloat(partialEWallet) || 0) : (paymentMethod !== "Cash" ? grandTotal : 0);
    const finalMethod = isPartialPayment ? "Split" : paymentMethod;

    if (finalMethod === "Cash" && !sufficient) { toast.error("Insufficient cash"); return; }
    if (finalMethod === "Split" && (cashVal + ewalletVal < grandTotal - 0.01)) { toast.error("Insufficient total payment"); return; }

    const finalData = {
      pos_terminal_id: terminal?.terminal_id ?? 1,
      user_id: currentUser.user_id,
      customer_info: customerName || "Walk-in",
      customer_name: customerName,
      contact_number: normalizedContact || undefined,
      address,
      payment_method: finalMethod,
      cash_received: finalMethod === "Cash" ? cashFloat : (isPartialPayment ? cashVal : 0),
      cash_amount: cashVal,
      ewallet_amount: ewalletVal,
      service_charge: 0,
      items: cartItems.map((i) => ({ product_id: i.product.product_id, quantity: i.quantity, unit_price: getPosPrice(i.product) }))
    };

    try {
      setProcessing(true);
      const isEWallet = finalMethod === "GCash" || finalMethod === "PayMaya" || (finalMethod === "Split" && ewalletVal > 0);
      
      if (isEWallet) {
        const ewalCentavos = Math.round((finalMethod === "Split" ? ewalletVal : grandTotal) * 100);
        const sessionRes = await api.createPayMongoCheckoutSession({
          amount: ewalCentavos,
          currency: "PHP",
          description: `Sale: ${customerName || "Walk-in"}`,
          customer_name: customerName,
          customer_phone: normalizedContact || undefined,
          items: [{ name: "POS Transaction", amount: ewalCentavos, quantity: 1 }],
          success_url: `${window.location.origin}/pos?payment=success`,
          cancel_url: `${window.location.origin}/pos?payment=failed`
        });

        const url = sessionRes.data?.attributes?.checkout_url;
        const sid = sessionRes.data?.id;
        if (url && sid) {
          localStorage.setItem("invensight_pending_sale", JSON.stringify({ finalData, cartItems, sessionId: sid }));
          window.location.href = url;
          return;
        }
        throw new Error("PayMongo session failed");
      }

      const res = await api.createSale(finalData);
      setSaleResult(res);
      setCashInput("");
      toast.success("Sale completed!");
    } catch (err: any) {
      toast.error(err.message || "Sale failed");
    } finally {
      setProcessing(false);
    }
  };

  const finalizePayMongo = useCallback(async (status: string) => {
    const stored = localStorage.getItem("invensight_pending_sale");
    if (!stored) return;
    setVerifyingPayment(true);
    try {
      const { finalData, cartItems: storedCart } = JSON.parse(stored);
      if (status === "success") {
        const res = await api.createSale({ ...finalData, payment_status: "Paid" });
        setCartItems(storedCart);
        setSaleResult(res);
        toast.success("Payment verified!");
      } else {
        setCartItems(storedCart);
        setCustomerName(finalData.customerName || "");
        toast.error("Payment failed. Cart restored.");
      }
    } catch {
      toast.error("Error finalizing payment.");
    } finally {
      setVerifyingPayment(false);
      localStorage.removeItem("invensight_pending_sale");
    }
  }, []);

  useEffect(() => {
    const status = searchParams.get("payment");
    if (status && !hasProcessedPayment.current) {
      hasProcessedPayment.current = true;
      finalizePayMongo(status);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, finalizePayMongo, setSearchParams]);

  if (saleResult) return <Receipt result={saleResult} cartItems={cartItems} onNewSale={clearCart} />;

  return (
    <div className="flex h-screen overflow-hidden bg-muted/50 flex-col sm:flex-row font-sans relative">
      {verifyingPayment && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-black uppercase tracking-widest">Verifying Payment...</h2>
        </div>
      )}

      {/* LEFT: Products Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-card z-0">
        <div className="p-4 border-b border-border bg-card flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input type="text" placeholder="SEARCH PRODUCT..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="w-full bg-muted/50 border-none rounded-xl py-3 pl-10 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 placeholder:text-gray-300" />
          </div>
          <select value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)} className="bg-muted/50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none appearance-none cursor-pointer">
            <option value="">ALL CATEGORIES</option>
            {categories.map((c) => <option key={c.category_id} value={c.category_name}>{c.category_name}</option>)}
          </select>
          <select value={searchSupplier} onChange={(e) => setSearchSupplier(e.target.value)} className="bg-muted/50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none appearance-none cursor-pointer">
            <option value="">ALL SUPPLIERS</option>
            {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_name}>{s.supplier_name}</option>)}
          </select>
        </div>
        <div className="px-6 py-4 bg-muted/50 grid grid-cols-12 gap-4 text-xs font-black text-muted-foreground uppercase tracking-wider border-b border-border">
          <div className="col-span-4">Product Details</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Supplier</div>
          <div className="col-span-1 text-center">Stock</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-1"></div>
        </div>

        <div className="flex-1 overflow-y-auto bg-card px-2">
          {loading ? (
             <div className="flex items-center justify-center h-40 text-muted-foreground/70 text-sm font-bold animate-pulse uppercase">Syncing Catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
              <ShoppingCart className="w-24 h-24 mb-4 opacity-20" />
              <p className="font-black text-sm uppercase tracking-wide">No items found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredProducts.map((product) => (
                <div key={product.product_id} className="grid grid-cols-12 gap-4 items-center px-4 py-5 hover:bg-primary/10 transition-all group cursor-pointer" onClick={() => addToCart(product)}>
                  <div className="col-span-4">
                    <div className="text-sm sm:text-base font-black text-foreground uppercase group-hover:text-primary transition-colors truncate">{product.product_name}</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-tight mt-1">{product.sku}</div>
                  </div>
                  <div className="col-span-2 text-xs sm:text-sm font-bold text-muted-foreground uppercase truncate">{product.category_name}</div>
                  <div className="col-span-2 text-xs sm:text-sm font-bold text-muted-foreground uppercase truncate">{product.supplier_name}</div>
                  <div className="col-span-1 text-sm font-black text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full",
                      (product.quantity || 0) <= 5 ? "bg-red-100 text-red-600" : (product.quantity || 0) <= 10 ? "bg-orange-100 text-orange-600" : "text-foreground bg-muted"
                    )}>
                      {product.quantity ?? 0}
                    </span>
                  </div>
                  <div className="col-span-2 text-right text-base font-black text-foreground pr-2">₱ {fmt(getPosPrice(product))}</div>
                  <div className="col-span-1 text-right">
                    <button className="w-10 h-10 flex items-center justify-center bg-muted group-hover:bg-primary group-hover:text-white rounded-full transition-all shadow-sm">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Checkout Panel */}
      <div className="w-full sm:w-[450px] shadow-lg z-10 bg-card flex flex-col border-l border-border flex-shrink-0">
        <div className="p-4 border-b border-border flex justify-between items-center bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-primary tracking-tight uppercase">CheckOut</h1>
          </div>
          <div className="flex items-center gap-2">
            {currentRole === "cashier" ? (
              <button onClick={handleLogout} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 flex items-center gap-1 font-bold text-[10px] uppercase group">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            ) : (
              <button 
                onClick={() => window.location.href = "/sales"} 
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted flex items-center gap-1 font-bold text-[10px] uppercase"
              >
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
            )}
          </div>
        </div>
        
        {cartItems.length > 0 && (
          <div className="p-3 bg-muted/50 border-b border-border flex justify-between items-center group">
            <div className="flex items-center gap-1 ml-2">
              <input type="checkbox" id="partial-toggle" checked={isPartialPayment} onChange={(e) => setIsPartialPayment(e.target.checked)} className="w-4 h-4 text-primary rounded focus:ring-primary" />
              <label htmlFor="partial-toggle" className="text-xs font-bold text-muted-foreground cursor-pointer uppercase tracking-tighter">Partial Payment Mode</label>
            </div>
            <button onClick={clearCart} className="text-xs text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded uppercase mr-2 tracking-widest">CLEAR CART</button>
          </div>
        )}

        <div className="p-4 gap-3 bg-card border-b border-border flex flex-col">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-muted-foreground uppercase mb-1">Customer</label>
              <input type="text" placeholder="Walk-in" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary bg-muted/10" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-muted-foreground uppercase mb-1">Contact</label>
              <input type="text" placeholder="09..." value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary bg-muted/10" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/20 p-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-black text-[10px] uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-1">
              {cartItems.map((item) => (
                <div key={item.product?.product_id} className="bg-card p-3 rounded-2xl border border-border flex items-center justify-between group shadow-sm">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-black text-foreground text-xs uppercase truncate">{item.product?.product_name}</div>
                    <div className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5 tracking-tight">{item.product?.sku}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-muted rounded-full p-1">
                      <button onClick={() => updateQty(item.product?.product_id, -1)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-black font-black">-</button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => setQty(item.product?.product_id, e.target.value)}
                        className="w-8 bg-transparent text-center text-xs font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button onClick={() => updateQty(item.product?.product_id, 1)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-black font-black">+</button>
                    </div>
                    <div className="font-black text-foreground text-xs w-20 text-right">₱ {fmt(getPosPrice(item.product) * item.quantity)}</div>
                    <button onClick={() => removeFromCart(item.product?.product_id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-card border-t border-border space-y-2">
          <div className="flex justify-between text-[10px] text-muted-foreground font-black uppercase tracking-wider">
            <span>Subtotal</span>
            <span>₱ {fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-primary pt-1 border-t border-gray-100">
            <span className="text-xs font-black uppercase tracking-widest">Total Amount</span>
            <span className="text-2xl font-black">₱ {fmt(grandTotal)}</span>
          </div>
        </div>

        <div className="border-t border-border bg-card p-4">
          {isPartialPayment ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-muted-foreground uppercase">Cash Portion</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-black">₱</span>
                  <input type="text" value={formatNumberWithCommas(partialCash)} onChange={(e) => handlePartialCashChange(e.target.value)} onFocus={() => setNumpadTarget("partialCash")} placeholder="0.00" className={cn("w-full bg-muted/50 border-2 rounded-xl py-2 pl-7 pr-4 text-sm font-black outline-none transition-all", numpadTarget === "partialCash" ? "border-primary" : "border-transparent")} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-muted-foreground uppercase">E-Wallet Portion</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-black">₱</span>
                  <input type="text" value={formatNumberWithCommas(partialEWallet)} onChange={(e) => handlePartialEWalletChange(e.target.value)} onFocus={() => setNumpadTarget("partialEWallet")} placeholder="0.00" className={cn("w-full bg-muted/50 border-2 rounded-xl py-2 pl-7 pr-4 text-sm font-black outline-none transition-all", numpadTarget === "partialEWallet" ? "border-primary" : "border-transparent")} />
                </div>
              </div>
            </div>
          ) : paymentMethod === "Cash" ? (
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Amount Tendered</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black">₱</span>
                  <input type="text" value={formatNumberWithCommas(cashInput)} onChange={(e) => {
                    const val = e.target.value.replace(/,/g, "");
                    if (val === "" || /^\d*\.?\d*$/.test(val)) setCashInput(val);
                  }} onFocus={() => setNumpadTarget("cash")} placeholder="0.00" className={cn("w-full bg-muted border-2 rounded-xl py-3 pl-8 text-xl font-black outline-none transition-all", numpadTarget === "cash" ? "border-primary" : "border-transparent")} />
                </div>
              </div>
              <div className="w-32">
                <label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Change</label>
                <div className={cn("py-3 px-2 rounded-xl text-center font-black text-lg h-[52px] flex items-center justify-center", change >= 0 && cashFloat > 0 ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
                  {fmt(Math.max(0, change))}
                </div>
              </div>
            </div>
          ) : null}

          {!isPartialPayment && (
            <div className="flex gap-2 mb-4">
              {["CASH", "GCASH", "PAYMAYA"].map((m) => {
                const mappedMethod = m === "CASH" ? "Cash" : m === "GCASH" ? "GCash" : "PayMaya";
                return (
                  <button key={m} onClick={() => setPaymentMethod(mappedMethod)} className={cn("flex-1 py-3 rounded-xl border-2 font-black text-[10px] tracking-widest transition-all", paymentMethod === mappedMethod ? "border-primary bg-primary text-white shadow-lg" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted")}>
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-4 gap-1 mb-3">
            {['7', '8', '9', 'CLR', '4', '5', '6', 'DEL', '1', '2', '3', '.', '0', '00'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleNumpad(btn === 'CLR' ? 'CANCEL' : btn === 'DEL' ? 'DELETE' : btn)}
                className={cn("py-2 rounded border-b-2 active:border-b-0 active:translate-y-0.5 transition-all font-black text-lg", btn === 'CLR' || btn === 'DEL' ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100' : 'bg-card text-foreground border-border hover:bg-muted shadow-sm', btn === '0' ? 'col-span-2' : '')}
              >
                {btn}
              </button>
            ))}
          </div>
          <button onClick={handleConfirmSale} disabled={processing || cartItems.length === 0 || (paymentMethod === "Cash" && !isPartialPayment && !sufficient)} className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-100 disabled:opacity-50 transition-all active:scale-95">
            {processing ? "PROCESSING..." : "FINALIZE TRANSACTION"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Export with Error Boundary ---

export function POS() {
  return (
    <POSErrorBoundary>
      <POSInternal />
    </POSErrorBoundary>
  );
}
