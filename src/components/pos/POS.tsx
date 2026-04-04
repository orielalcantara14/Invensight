import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RefreshCw, AlertCircle, ArrowLeft, CreditCard, Smartphone, User, Phone, MapPin, X, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "@/services/api";
import type { Product, Category, Terminal, Supplier } from "@/services/api";
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

const TAX_RATE = 0.03;
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
        <div>VAT (3%) | {fmt(result.tax_amount)}</div>
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Search states for right pane
  const [searchName, setSearchName] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchSupplier, setSearchSupplier] = useState("");

  const [processing, setProcessing] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);

  // Checkout left pane states
  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cashInput, setCashInput] = useState("");

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

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

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

  useEffect(() => { fetchCatalog(true); }, [fetchCatalog]);

  useEffect(() => {
    const id = setInterval(() => { fetchCatalog(false); }, CATALOG_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchCatalog]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchCatalog(false);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [fetchCatalog]);

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

  const subtotal = cartItems.reduce((sum, i) => sum + getPosPrice(i.product) * i.quantity, 0);
  const taxAmount = subtotal * TAX_RATE;
  const grandTotal = subtotal + taxAmount;

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
      if (!processing && cartItems.length > 0 && sufficient) {
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
    if (trimmedContact && !normalizedContact) {
      toast.error("Please enter a valid Philippine mobile number");
      return;
    }
    
    if (paymentMethod === "Cash" && !sufficient) {
      toast.error("Insufficient cash received.");
      return;
    }

    const finalCashReceived = paymentMethod === "Cash" ? cashFloat : grandTotal;

    setProcessing(true);
    setCustomerNameData({
      name: customerName,
      contact: normalizedContact || "",
      address: address,
      method: paymentMethod,
      cashReceived: finalCashReceived
    });

    try {
      if (paymentMethod === "GCash" || paymentMethod === "PayMaya") {
        const payloadData = {
          amount: Math.round(grandTotal * 100),
          currency: "PHP" as const,
          customer_name: customerName,
          customer_phone: normalizedContact || undefined,
        };

        if (paymentMethod === "GCash") {
          const sourceRes = await api.createPayMongoSource({
            ...payloadData,
            type: "gcash",
            description: `POS Sale - ${customerName || "Walk-in"}`,
          });
          const source = sourceRes.data;
          const checkoutUrl = source.attributes?.redirect?.checkout_url 
            || source.attributes?.source?.qr_code_url 
            || source.attributes?.qr_code_url;
          
          if (!checkoutUrl) throw new Error("Failed to generate QR code.");
          
          setPayMongoQR(checkoutUrl);
          setPayMongoSourceId(source.id);
          setShowPayMongo(true);
          return;
        }

        if (paymentMethod === "PayMaya") {
          const intentRes = await api.createPayMongoPaymentIntent({
            ...payloadData,
            payment_method_allowed: "paymaya",
          });
          const intent = intentRes.data;
          const nextAction = intent.attributes?.next_action;
          const qrCodeUrl = nextAction?.paymaya?.qr_code_url 
            || nextAction?.redirect?.url
            || intent.attributes?.client_key;
            
          if (!qrCodeUrl) throw new Error("Failed to generate QR code.");
          
          setPayMongoQR(qrCodeUrl);
          setPayMongoSourceId(intent.id);
          setShowPayMongo(true);
          return;
        }
      }

      // Normal Cash Flow
      const result = await api.createSale({
        pos_terminal_id: terminal?.terminal_id ?? 1,
        user_id: CURRENT_USER.user_id,
        customer_info: customerName || "Walk-in Customer",
        customer_name: customerName,
        contact_number: normalizedContact || undefined,
        address: address,
        payment_method: paymentMethod,
        cash_received: finalCashReceived,
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
        cash_received: customerData.cashReceived,
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
      setCashInput("");
      toast.success(`${customerData.method} payment verified!`);
    } catch (e: unknown) {
      toast.error(`Error finalizing sale: ${e instanceof Error ? e.message : "Finalization failed"}`);
    } finally {
      setProcessing(false);
    }
  };

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

  const handleBackToSales = () => {
    navigate("/sales");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 flex-col sm:flex-row font-sans">
      
      {/* ====== LEFT: Checkout Panel ====== */}
      <div className="w-full sm:w-[450px] shadow-lg z-10 bg-white flex flex-col border-r border-gray-200 flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
             <button onClick={handleBackToSales} className="text-gray-500 hover:text-gray-800 transition-colors p-1 rounded hover:bg-gray-100">
               <ArrowLeft className="w-5 h-5"/>
             </button>
             <h1 className="text-2xl font-black text-blue-600 tracking-tight">CheckOut</h1>
          </div>
          {cartItems.length > 0 && (
             <button onClick={clearCart} className="text-xs text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded">CLEAR</button>
          )}
        </div>

        {/* Customer Inputs */}
        <div className="p-4 space-y-3 bg-white border-b border-gray-100 flex-shrink-0">
           <div className="flex gap-3">
              <div className="flex-1">
                 <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Name</label>
                 <input type="text" placeholder="John Doe" value={customerName} onChange={e=>setCustomerName(e.target.value)} className="w-full border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none px-3 py-2 text-sm transition-shadow" />
              </div>
              <div className="flex-1">
                 <label className="block text-xs font-semibold text-gray-700 mb-1">Address (Optional)</label>
                 <input type="text" placeholder="123 Street" value={address} onChange={e=>setAddress(e.target.value)} className="w-full border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none px-3 py-2 text-sm transition-shadow" />
              </div>
           </div>
           <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Number (Optional)</label>
              <input type="text" placeholder="+639..." value={contactNumber} onChange={e=>setContactNumber(e.target.value)} className="w-full border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none px-3 py-2 text-sm transition-shadow" />
           </div>
        </div>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-2">
            {cartItems.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-400">
                 <ShoppingCart className="w-12 h-12 mb-3 text-gray-200" />
                 <p className="font-medium text-sm">Cart is empty</p>
               </div>
            ) : (
                <div className="space-y-2">
                    {cartItems.map(item => (
                       <div key={item.product.product_id} className="bg-white p-3 border border-gray-200 shadow-sm flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                             <div className="font-semibold text-gray-800 text-sm truncate">{item.product.product_name}</div>
                             <div className="text-[10px] text-gray-500 uppercase font-medium mt-0.5">{item.product.supplier_name || item.product.category_name}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                             <div className="font-bold text-gray-900 pr-1">₱ {fmt(getPosPrice(item.product) * item.quantity)}</div>
                             <div className="flex items-center">
                                <button onClick={()=>updateQty(item.product.product_id, -1)} className="text-gray-500 hover:text-black w-6 h-6 flex items-center justify-center font-bold text-lg leading-none">-</button>
                                <input 
                                   type="number" 
                                   min="1"
                                   value={item.quantity || ""} 
                                   onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val)) {
                                         setCartItems(prev => prev.map(i => i.product.product_id === item.product.product_id ? { ...i, quantity: val } : i));
                                      } else if (e.target.value === "") {
                                         setCartItems(prev => prev.map(i => i.product.product_id === item.product.product_id ? { ...i, quantity: 0 as any } : i));
                                      }
                                   }}
                                   onBlur={(e) => {
                                      if (!item.quantity) {
                                         updateQty(item.product.product_id, 1);
                                      }
                                   }}
                                   className="w-10 text-center text-sm font-bold border border-gray-200 rounded outline-none h-7 appearance-none mx-1" 
                                />
                                <button onClick={()=>updateQty(item.product.product_id, 1)} className="text-gray-500 hover:text-black w-6 h-6 flex items-center justify-center font-bold text-lg leading-none">+</button>
                             </div>
                          </div>
                       </div>
                    ))}
                </div>
            )}
        </div>

        {/* Totals Box */}
        <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0 space-y-1">
           <div className="flex justify-between text-xs text-gray-600 font-medium">
             <span>SubTotal :</span>
             <span>{fmt(subtotal)}</span>
           </div>
           <div className="flex justify-between text-xs text-gray-600 font-medium">
             <span>Tax (3%) :</span>
             <span>{fmt(taxAmount)}</span>
           </div>
           <div className="flex justify-between items-center text-sm font-black pt-1">
             <span>Total :</span>
             <span className="text-lg">₱ {fmt(grandTotal)}</span>
           </div>
        </div>

        {/* Cash Received / Change */}
        <div className="border-t border-gray-200 grid grid-cols-2 bg-white flex-shrink-0">
           <div className="p-3 border-r border-gray-200">
              <label className="block text-xs font-semibold text-gray-700">Cash Received</label>
              <div className="relative mt-2">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xl text-gray-500">₱</span>
                 <input 
                    type="number" 
                    min="0"
                    step="0.01" 
                    value={cashInput} 
                    onChange={(e) => {
                       const val = e.target.value;
                       if (!val.includes('-')) setCashInput(val);
                    }} 
                    className="w-full border border-gray-300 rounded font-black text-xl pl-8 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 bg-white placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    placeholder="0.00" 
                 />
              </div>
           </div>
           <div className="p-3">
              <label className="block text-xs font-semibold text-gray-700">Change</label>
              <div className={`border border-gray-300 rounded font-black text-xl px-3 py-2 mt-2 truncate ${cashFloat >= grandTotal && grandTotal > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50'}`}>
                ₱ {fmt(Math.max(0, change))}
              </div>
           </div>
        </div>

        {/* Numpad & Proceed section */}
        <div className="flex h-56 border-t border-gray-200 bg-white flex-shrink-0">
           
           {/* Left block: Payment Method + Proceed */}
           <div className="w-[45%] flex flex-col border-r border-gray-200">
              <div className="flex-1 bg-gray-50/50 flex flex-col items-center justify-center border-b border-gray-200">
                 <div className="text-xs font-medium text-gray-500 mb-1">Payment Method</div>
                 <div className="relative">
                    <CreditCard className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="w-full bg-white border border-gray-300 rounded outline-none text-sm font-bold pl-8 pr-6 py-2 appearance-none">
                       <option value="Cash">Cash</option>
                       <option value="GCash">GCash</option>
                       <option value="PayMaya">PayMaya</option>
                    </select>
                 </div>
              </div>
              <button 
                 onClick={handleConfirmSale} 
                 disabled={processing || cartItems.length === 0 || (paymentMethod === "Cash" && !sufficient)} 
                 className="h-28 bg-[#38b75e] hover:bg-[#2fa050] active:bg-[#258540] text-white font-extrabold text-2xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                 {processing ? "..." : "PROCEED"}
              </button>
           </div>

           {/* Right block: Keypad */}
           <div className="w-[55%] grid grid-cols-4 grid-rows-4 bg-white text-lg font-semibold text-gray-800">
             <button onClick={() => handleNumpad('1')} className="border-b border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">1</button>
             <button onClick={() => handleNumpad('2')} className="border-b border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">2</button>
             <button onClick={() => handleNumpad('3')} className="border-b border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">3</button>
             <button onClick={() => handleNumpad('CANCEL')} className="border-b bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold tracking-wide active:bg-blue-800 transition-colors">CANCEL</button>
             
             <button onClick={() => handleNumpad('4')} className="border-b border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">4</button>
             <button onClick={() => handleNumpad('5')} className="border-b border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">5</button>
             <button onClick={() => handleNumpad('6')} className="border-b border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">6</button>
             <button onClick={() => handleNumpad('DELETE')} className="border-b bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold tracking-wide active:bg-red-700 transition-colors">DELETE</button>
             
             <button onClick={() => handleNumpad('7')} className="border-b border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">7</button>
             <button onClick={() => handleNumpad('8')} className="border-b border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">8</button>
             <button onClick={() => handleNumpad('9')} className="border-b border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">9</button>
             <button onClick={() => handleNumpad('ENTER')} className="row-span-2 bg-[#38b75e] hover:bg-[#2fa050] text-white text-[12px] font-bold tracking-wide active:bg-[#258540] transition-colors">ENTER</button>
             
             <button onClick={() => handleNumpad('0')} className="border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">0</button>
             <button onClick={() => handleNumpad('.')} className="border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">.</button>
             <button onClick={() => handleNumpad('00')} className="border-r hover:bg-gray-100 active:bg-gray-200 transition-colors">00</button>
           </div>
        </div>
      </div>


      {/* ====== RIGHT: Products Panel ====== */}
      <div className="flex-1 flex flex-col min-w-0 bg-white z-0">
        
         {/* Top Search Bars */}
         <div className="p-3 border-b border-gray-200 bg-gray-50 flex gap-2 flex-shrink-0">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input type="text" placeholder="Product Name" value={searchName} onChange={e=>setSearchName(e.target.value)} className="w-full bg-white border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-blue-500 outline-none pl-9 pr-3 py-2 text-sm" />
               {searchName && (
                  <button onClick={()=>setSearchName("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3 h-3"/></button>
               )}
            </div>
            <div className="relative flex-1">
               <select value={searchCategory} onChange={e=>setSearchCategory(e.target.value)} className="w-full bg-white border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-blue-500 outline-none pl-3 pr-8 py-2 text-sm appearance-none">
                  <option value="">All Categories</option>
                  {categories.map(cat => <option key={cat.category_id} value={cat.category_name}>{cat.category_name}</option>)}
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-400" />
               </div>
            </div>
            <div className="relative flex-1">
               <select value={searchSupplier} onChange={e=>setSearchSupplier(e.target.value)} className="w-full bg-white border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-blue-500 outline-none pl-3 pr-8 py-2 text-sm appearance-none">
                  <option value="">All Suppliers</option>
                  {suppliers.map(sup => <option key={sup.supplier_id} value={sup.supplier_name}>{sup.supplier_name}</option>)}
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-gray-400" />
               </div>
            </div>
         </div>

         {/* Sub-header / Category title */}
         <div className="px-4 py-2 bg-white flex justify-between items-center shadow-sm z-10 flex-shrink-0">
             <h2 className="font-semibold text-gray-800 text-sm">{searchCategory || searchName || searchSupplier || "All Products"}</h2>
             <div className="relative w-64 hidden sm:block">
                 <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                 <input type="text" placeholder="Search....." value={searchName} onChange={e=>setSearchName(e.target.value)} className="w-full border-0 border-b border-gray-300 focus:border-gray-800 focus:ring-0 outline-none pl-8 py-1 text-xs bg-transparent transition-colors" />
             </div>
         </div>

         {/* Product List */}
         <div className="flex-1 overflow-y-auto bg-gray-100 p-3">
             {loading ? (
                <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Loading products…</div>
             ) : error ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                   <AlertCircle className="w-8 h-8 text-red-400" />
                   <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
             ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                   <ShoppingCart className="w-10 h-10 text-gray-300" />
                   <div className="text-gray-400 text-sm font-medium">No products found</div>
                </div>
             ) : (
                <div className="flex flex-col gap-[2px]">
                   {filteredProducts.map(product => (
                      <div key={product.product_id} className="bg-white px-4 py-3 flex items-center justify-between hover:bg-blue-50/50 transition-colors border border-transparent hover:border-blue-100 hover:shadow-sm">
                         <div className="flex-1 min-w-0 pr-4">
                            <div className="text-[13px] font-semibold text-gray-800 tracking-wide uppercase truncate">{product.product_name}</div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase mt-0.5 tracking-wider truncate">{product.supplier_name || product.category_name}</div>
                         </div>
                         <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="font-black text-gray-800 text-[15px]">₱ {fmt(getPosPrice(product))}</div>
                            <button 
                               onClick={()=>addToCart(product)} 
                               className="text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-200 border border-gray-200 px-4 py-1.5 rounded uppercase tracking-wider transition-colors active:bg-gray-300">
                               ADD
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
             )}
         </div>

      </div>

      {showPayMongo && (
        <PayMongoModal
          amount={grandTotal}
          qrUrl={payMongoQR}
          sourceId={payMongoSourceId}
          paymentMethod={paymentMethod}
          onSuccess={handlePayMongoSuccess}
          onFailed={() => {
            setShowPayMongo(false);
            toast.error(`${paymentMethod} payment failed or was cancelled.`);
          }}
          onClose={() => setShowPayMongo(false)}
        />
      )}
    </div>
  );
}
