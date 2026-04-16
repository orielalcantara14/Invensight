import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RefreshCw, AlertCircle, ArrowLeft, CreditCard, Smartphone, User, Phone, MapPin, X, CheckCircle2, LogOut } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import { getSession, clearSession } from "@/auth/session";
import type { Product, Category, Terminal, Supplier } from "@/services/api";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
          className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          New Sale
        </button>
      </div>

      {/* Receipt paper */}
      <div
        id="receipt"
        className="bg-card shadow-xl p-6 w-full max-w-xs font-mono text-sm leading-relaxed"
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

        <div className="grid grid-cols-12 gap-1 font-bold border-b border-border pb-1 mb-2 text-[10px] uppercase">
          <div className="col-span-6">Product</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
        {cartItems.map((item, idx) => {
          const product = item?.product;
          if (!product) return null;
          const price = getPosPrice(product);
          const total = price * item.quantity;
          return (
            <div key={product.product_id} className="text-[11px] mb-2 border-b border-gray-50 pb-1 last:border-0">
              <div className="font-bold leading-tight">{idx + 1}. {product.product_name || "Unknown"}</div>
              <div className="grid grid-cols-12 gap-1 text-muted-foreground mt-0.5">
                <div className="col-span-6 pl-3 text-[9px] truncate">[{product.sku || ""}]</div>
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
          {result.payment_method === "Split" ? (
            <>
              <div className="flex justify-between">
                <span>Method</span>
                <span>Split (Cash + E-Wal)</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span>Cash</span>
                <span>{fmt(result.cash_given || result.cash_received)}</span>
              </div>
              <div className="flex justify-between">
                <span>E-Wallet</span>
                <span>{fmt(result.ewallet_amount || (result.total_amount - (result.cash_given || 0)))}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span>Method</span>
                <span>{result.payment_method || "Cash"}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid</span>
                <span>{fmt(result.cash_given || result.cash_received)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between font-bold pt-1 border-t border-border">
            <span>CHANGE</span>
            <span>{fmt(result.change || result.change_amount || 0)}</span>
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [numpadTarget, setNumpadTarget] = useState<"cash" | "partialCash" | "partialEWallet">("cash");

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
  const hasProcessedPayment = useRef(false);

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

  const formatNumberWithCommas = (value: string | number) => {
    const s = typeof value === "number" ? value.toString() : value;
    if (!s) return "";
    const parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const handlePartialCashChange = (val: string) => {
    const clean = val.replace(/,/g, "");
    if (clean !== "" && !/^\d*\.?\d*$/.test(clean)) return;
    setPartialCash(clean);
    const cash = parseFloat(clean) || 0;
    const remaining = Math.max(0, grandTotal - cash);
    setPartialEWallet(remaining.toFixed(2));
  };

  const handlePartialEWalletChange = (val: string) => {
    const clean = val.replace(/,/g, "");
    if (clean !== "" && !/^\d*\.?\d*$/.test(clean)) return;
    setPartialEWallet(clean);
    const ewallet = parseFloat(clean) || 0;
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
      if (numpadTarget === "cash") setCashInput(prev => prev.slice(0, -1));
      else if (numpadTarget === "partialCash") handlePartialCashChange(partialCash.slice(0, -1));
      else if (numpadTarget === "partialEWallet") handlePartialEWalletChange(partialEWallet.slice(0, -1));
    } else if (val === "CANCEL") {
      if (numpadTarget === "cash") { setCashInput(""); setPaymentMethod("Cash"); }
      else if (numpadTarget === "partialCash") handlePartialCashChange("");
      else if (numpadTarget === "partialEWallet") handlePartialEWalletChange("");
    } else if (val === "ENTER") {
      if (!processing && cartItems.length > 0) {
        handleConfirmSale();
      }
    } else {
      if (numpadTarget === "cash") {
        if (val === "." && cashInput.includes(".")) return;
        if (val === "00" && (!cashInput || cashInput === "0")) return;
        setCashInput(prev => prev + val);
      } else if (numpadTarget === "partialCash") {
        if (val === "." && partialCash.includes(".")) return;
        if (val === "00" && (!partialCash || partialCash === "0")) return;
        handlePartialCashChange(partialCash + val);
      } else if (numpadTarget === "partialEWallet") {
        if (val === "." && partialEWallet.includes(".")) return;
        if (val === "00" && (!partialEWallet || partialEWallet === "0")) return;
        handlePartialEWalletChange(partialEWallet + val);
      }
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

        const eWalletCentavos = Math.round(ewalletAmountToSend * 100);
        const lineItems = cartItems.map(item => ({
          name: item.product.product_name,
          amount: Math.round(getPosPrice(item.product) * 100),
          quantity: item.quantity
        }));
        
        const sumOfLineItems = lineItems.reduce((acc, i) => acc + (i.amount * i.quantity), 0);
        const taxCentavos = eWalletCentavos - sumOfLineItems;

        // For partial payments, we send a single summarized item to ensure PayMongo UI matches the amount.
        // For full payments, PayMongo expects the sum of line items to precisely match the total checkout amount, so we append the tax difference as its own line item.
        const paymongoItems = finalMethod === "Split"
          ? [{
            name: `POS Sale - Remaining Balance`,
            amount: eWalletCentavos,
            quantity: 1
          }]
          : [
              ...lineItems,
              ...(taxCentavos > 0 ? [{
                name: "VAT (3%)",
                amount: taxCentavos,
                quantity: 1
              }] : [])
            ];

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

      if (!storedCData || !storedCartItems) {
        localStorage.removeItem("invensight_pending_sale");
        return;
      }

      setCartItems(storedCartItems);
      setCustomerNameData(storedCData);
      
      if (storedCData && storedCData.method === "Split") {
        setPaymentMethod("Split");
      } else {
        setPaymentMethod(storedCData?.method || "Cash");
      }

      try {
        await api.createSale({
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
          payment_status: "Failed",
          failure_reason: "PayMongo session cancelled or failed"
        });
      } catch (err) {
        console.error("Failed to record failed sale attempt", err);
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
      const paymentStatus = searchParams.get("payment");
      if (paymentStatus && !hasProcessedPayment.current) {
        hasProcessedPayment.current = true;
        if (paymentStatus === "success") {
          handlePayMongoSuccess();
        } else if (paymentStatus === "failed") {
          handlePayMongoFailure();
        }
        searchParams.delete("payment");
        setSearchParams(searchParams, { replace: true });
      }
    } catch (e) {
      console.error("Critical error in payment param handler:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  if (saleResult) {
    return <Receipt result={saleResult} cartItems={cartItems} terminal={terminal} onNewSale={clearCart} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/50 flex-col sm:flex-row font-sans">
      {/* ====== LEFT: Products Panel ====== */}
      <div className="flex-1 flex flex-col min-w-0 bg-card z-0">
        <div className="p-4 border-b border-border bg-card flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input type="text" placeholder="SEARCH PRODUCT..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full bg-muted/50 border-none rounded-xl py-3 pl-10 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 placeholder:text-gray-300" />
          </div>
          <select value={searchCategory} onChange={e => setSearchCategory(e.target.value)} className="bg-muted/50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none appearance-none cursor-pointer">
            <option value="">ALL CATEGORIES</option>
            {categories.map(cat => <option key={cat.category_id} value={cat.category_name}>{cat.category_name}</option>)}
          </select>
          <select value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} className="bg-muted/50 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none appearance-none cursor-pointer">
            <option value="">ALL SUPPLIERS</option>
            {suppliers.map(sup => <option key={sup.supplier_id} value={sup.supplier_name}>{sup.supplier_name}</option>)}
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
              {filteredProducts.map(product => (
                <div key={product.product_id} className="grid grid-cols-12 gap-4 items-center px-4 py-5 hover:bg-primary/10/80 transition-all group cursor-pointer" onClick={() => addToCart(product)}>
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

    
      {/* ====== RIGHT: Checkout Panel ====== */}
      <div className="w-full sm:w-[450px] shadow-lg z-10 bg-card flex flex-col border-l border-border flex-shrink-0">
        <div className="p-4 border-b border-border flex justify-between items-center bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-primary tracking-tight">CheckOut</h1>
          </div>
          <div className="flex items-center gap-2">
            {currentRole === "cashier" ? (
              <button onClick={handleLogout} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 flex items-center gap-1 font-bold text-[10px] uppercase group">
                <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /> Logout
              </button>
            ) : (
              <button onClick={() => navigate("/sales")} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted flex items-center gap-1 font-bold text-[10px] uppercase">
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
            )}
          </div>
        </div>
        
        {cartItems.length > 0 && (
          <div className="p-3 bg-muted/50 border-b border-border flex justify-between items-center group">
            <div className="flex items-center gap-1 ml-2">
              <input type="checkbox" id="partial-toggle" checked={isPartialPayment} onChange={(e) => setIsPartialPayment(e.target.checked)} className="w-4 h-4 text-primary rounded focus:ring-primary" />
              <label htmlFor="partial-toggle" className="text-xs font-bold text-muted-foreground cursor-pointer">PARTIAL SECURE</label>
            </div>
            <button onClick={clearCart} className="text-xs text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded uppercase mr-2">CLEAR CART</button>
          </div>
        )}

        <div className="p-4 gap-3 bg-card border-b border-border flex flex-col">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Customer</label>
              <input type="text" placeholder="Walk-in" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Contact (Optional)</label>
              <input type="text" placeholder="+639..." value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Address (Optional)</label>
            <input type="text" placeholder="Complete Address" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/50 p-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-bold text-xs uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-1">
              {cartItems.map(item => (
                <div key={item.product?.product_id} className="bg-card p-2 border border-border flex items-center justify-between group">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-foreground text-xs uppercase truncate">{item.product.product_name}</div>
                    <div className="text-[9px] text-muted-foreground font-bold uppercase mt-0.5 tracking-tight">{item.product.sku}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-muted rounded-lg p-0.5">
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
                    <button onClick={() => removeFromCart(item.product?.product_id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-card border-t border-border space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground/70 font-black uppercase tracking-wider">
            <span>Item Total</span>
            <span>₱ {fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-primary pt-1 border-t border-gray-50">
            <span className="text-xs font-black uppercase tracking-widest">Subtotal</span>
            <span className="text-2xl font-black">₱ {fmt(grandTotal)}</span>
          </div>
        </div>

        <div className="border-t border-border bg-card p-4">
          {isPartialPayment ? (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground/70 uppercase">Cash Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-sm font-black">₱</span>
                  <input type="text" value={formatNumberWithCommas(partialCash)} onChange={(e) => handlePartialCashChange(e.target.value)} onFocus={() => setNumpadTarget("partialCash")} placeholder="0.00" className={`w-full bg-muted/50 border-2 rounded-xl py-3 pl-7 pr-4 text-lg font-black text-foreground outline-none transition-colors ${numpadTarget === "partialCash" ? "border-primary ring-4 ring-primary/10" : "border-transparent"}`} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground/70 uppercase">E-Wallet Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-sm font-black">₱</span>
                  <input type="text" value={formatNumberWithCommas(partialEWallet)} onChange={(e) => handlePartialEWalletChange(e.target.value)} onFocus={() => setNumpadTarget("partialEWallet")} placeholder="0.00" className={`w-full bg-muted/50 border-2 rounded-xl py-3 pl-7 pr-4 text-lg font-black text-foreground outline-none transition-colors ${numpadTarget === "partialEWallet" ? "border-primary ring-4 ring-primary/10" : "border-transparent"}`} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1 block">Cash Received</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 font-black">₱</span>
                  <input type="text" value={formatNumberWithCommas(cashInput)} onChange={(e) => {
                    const val = e.target.value.replace(/,/g, "");
                    if (val === "" || /^\d*\.?\d*$/.test(val)) setCashInput(val);
                  }} onFocus={() => setNumpadTarget("cash")} placeholder="0.00" className={`w-full bg-muted border-2 rounded-xl py-3 pl-8 text-2xl font-black text-foreground outline-none transition-colors ${numpadTarget === "cash" ? "border-primary ring-4 ring-primary/10" : "border-transparent"}`} />
                </div>
              </div>
              <div className="w-32">
                <label className="text-[10px] font-bold text-muted-foreground/70 uppercase mb-1 block">Change</label>
                <div className={`py-3 px-2 rounded-xl text-center font-black text-xl truncate h-[52px] flex items-center justify-center ${change >= 0 && cashFloat > 0 ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground/70'}`}>
                  {fmt(Math.max(0, change))}
                </div>
              </div>
            </div>
          )}

          {!isPartialPayment && (
            <div className="flex gap-2 mb-4">
              {["CASH", "GCASH", "PAYMAYA"].map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m === "CASH" ? "Cash" : m === "GCASH" ? "GCash" : "PayMaya")} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] tracking-widest transition-all ${paymentMethod === (m === "CASH" ? "Cash" : m === "GCASH" ? "GCash" : "PayMaya") ? "border-primary bg-primary text-white shadow-lg" : "border-border bg-muted/50 text-muted-foreground/70 hover:bg-muted"}`}>
                  {m}
                </button>
              ))}
            </div>
          )}

          
          <div className="grid grid-cols-4 gap-1 mb-3">
            {['7', '8', '9', 'CLR', '4', '5', '6', 'DEL', '1', '2', '3', '.', '0', '00'].map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === 'CLR') handleNumpad('CANCEL');
                  else if (btn === 'DEL') handleNumpad('DELETE');
                  else handleNumpad(btn);
                }}
                className={`py-2 rounded border-b-2 active:border-b-0 active:translate-y-0.5 transition-all font-black text-lg ${
                  btn === 'CLR' || btn === 'DEL' 
                    ? 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200' 
                    : 'bg-card text-foreground border-border hover:bg-muted/50 shadow-sm'
                } ${btn === '0' ? 'col-span-2' : ''}`}
              >
                {btn}
              </button>
            ))}
          </div>
          <button onClick={handleConfirmSale} disabled={processing || cartItems.length === 0 || (paymentMethod === "Cash" && !isPartialPayment && !sufficient)} className="w-full py-3 bg-[#38b75e] hover:bg-[#2fa050] text-white font-black text-lg rounded-xl shadow border-b-4 border-[#2fa050] active:border-b-0 active:translate-y-1 disabled:opacity-50 pulse-button">
            {processing ? "PROCESSING..." : "FINALIZE SALE"}
          </button>
        </div>
      </div>

      </div>
  );
}
