import React, { useState, useEffect, useRef, useCallback, useMemo, Component, type ErrorInfo } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, RefreshCw, AlertCircle, ArrowLeft, CreditCard, Smartphone, User, Phone, MapPin, X, CheckCircle2, LogOut, Wallet, Banknote, DollarSign, Store, PauseCircle, Play, Clock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { api } from "@/services/api";
import { getSession, clearSession, getLastActivity, setLastActivity, getStoredTimeout, setStoredTimeout, DEFAULT_TIMEOUT_BY_ROLE } from "@/auth/session";
import { getCurrencySymbol } from "@/utils/format";
import type { Product, Category, Terminal, Supplier, Mechanic, PosShift } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printElementById } from "@/utils/print";

// --- Types ---
interface CartItem {
  product: Product;
  quantity: number;
  mechanic_name?: string;
  custom_price?: number;
  cart_id: string;
}

export interface HeldOrder {
  id: string;
  customerName: string;
  contactNumber: string;
  address: string;
  cartItems: CartItem[];
  isPartialPayment: boolean;
  partialCash: string;
  partialEWallet: string;
  paymentMethod: string;
  heldAt: string;
  totalAmount: number;
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
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-10 text-center font-sans">
          <div className="bg-card p-8 rounded-xl border border-red-200 dark:border-red-900/35 max-w-lg shadow-sm">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2 uppercase tracking-tight">POS TERMINAL CRASHED</h1>
            <p className="text-xs text-muted-foreground mb-6 font-medium">An error occurred in the terminal. Try resetting.</p>
            <div className="bg-muted/50 border border-border/50 p-4 rounded-lg text-left mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-600 dark:text-red-400 font-mono break-all">{this.state.error?.message}</code>
            </div>
            <button onClick={() => window.location.reload()} className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-all active:scale-95">
              Reset Terminal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Constants ---
const getBrandName = () => localStorage.getItem("shop_name") || "JONBRIX Motorcycle Parts And Accessories";
const getBrandAddress = () => localStorage.getItem("shop_address") || "Blk 77 lot 68 ascencion ave. Greater lagro, Quezon City, Philippines, 1118";
const getReceiptFooter = () => localStorage.getItem("receipt_footer") || "Thank you for your business!";

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

function getPosPrice(product: Product | null | undefined, custom_price?: number): number {
  if (custom_price !== undefined) return custom_price;
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

function Receipt({ 
  result, 
  cartItems, 
  onNewSale, 
  taxRate, 
  heldOrdersCount = 0, 
  onResumeHeld 
}: { 
  result: SaleResult; 
  cartItems: CartItem[]; 
  onNewSale: () => void; 
  taxRate: number; 
  heldOrdersCount?: number; 
  onResumeHeld?: () => void; 
}) {
  const session = getSession();
  const saleDate = (() => {
    if (!result?.transaction_timestamp) return new Date();
    const raw = result.transaction_timestamp;
    if (typeof raw === "string" && !raw.includes("Z") && !raw.includes("+") && (raw.includes("T") || raw.includes(" "))) {
      return new Date(raw.replace(" ", "T") + "+08:00");
    }
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  })();
  const dateStr = saleDate.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
  const timeStr = saleDate.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: true });

  const partsItems = (cartItems || []).filter(item => item?.product && !item.product.is_service);
  const servicesItems = (cartItems || []).filter(item => item?.product && item.product.is_service);

  const partsTotal = partsItems.reduce((acc, item) => {
    const price = getPosPrice(item.product, item.custom_price);
    return acc + price * (item.quantity || 0);
  }, 0);

  const servicesTotal = servicesItems.reduce((acc, item) => {
    const price = getPosPrice(item.product, item.custom_price);
    return acc + price * (item.quantity || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-start p-8 animate-in fade-in duration-500">
      <div className="flex gap-3 mb-6 print:hidden">
        <button onClick={() => printElementById("receipt", `Receipt - ${result?.invoice_number || "POS"}`)} className="flex items-center gap-2 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-5 py-2 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors font-bold text-xs uppercase tracking-wider border border-border/50 shadow-sm">
          <Printer className="w-4 h-4" /> Print Receipt
        </button>
        <button onClick={onNewSale} className="flex items-center gap-2 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-5 py-2 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors font-bold text-xs uppercase tracking-wider border border-border/50 shadow-sm">
          <RefreshCw className="w-4 h-4" /> New Sale
        </button>
        {heldOrdersCount > 0 && onResumeHeld && (
          <button 
            onClick={onResumeHeld} 
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg transition-colors font-bold text-xs uppercase tracking-wider shadow-sm cursor-pointer animate-pulse"
          >
            <Play className="w-4 h-4" /> Resume Held Order ({heldOrdersCount})
          </button>
        )}
      </div>

      <div id="receipt" className="bg-card text-foreground shadow-sm border border-border/50 p-8 w-full max-w-sm font-mono text-base leading-relaxed min-w-[360px] print:p-6 print:max-w-xs print:text-sm print:min-w-[300px] rounded-xl">
        <div className="font-bold text-xl uppercase tracking-tight print:text-lg">{getBrandName()}</div>
        <div className="text-xs uppercase leading-tight mb-2 opacity-60 print:text-[10px]">{getBrandAddress()}</div>

        <div className="text-sm space-y-0.5 border-t border-b border-border/50 py-2 my-2 print:text-xs">
          <div>Invoice #: {(result?.invoice_number || "N/A").replace(/^INV-?/i, "")}</div>
          <div>Date: {dateStr} | Time: {timeStr}</div>
          <div>Cashier: {session?.full_name || "System"}</div>
          {(() => {
            const mechanicsList = Array.from(new Set(cartItems.map(i => i.mechanic_name).filter(Boolean)));
            if (mechanicsList.length > 0) {
              return <div className="font-bold pt-1">Mechanic: {mechanicsList.join(", ")}</div>;
            }
            return null;
          })()}
        </div>

        <div className="grid grid-cols-12 gap-1 font-bold border-b border-border/50 pb-1 mb-2 text-xs uppercase text-muted-foreground print:text-[10px]">
          <div className="col-span-5">Product</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-3 text-right">Price</div>
          <div className="col-span-3 text-right">Amount</div>
        </div>

        <div className="space-y-4">
          {/* Parts / Products Section */}
          {partsItems.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-xs uppercase text-muted-foreground print:text-[10px] tracking-wider mb-1">Parts & Accessories</div>
              {partsItems.map((item, idx) => {
                const price = getPosPrice(item.product, item.custom_price);
                const total = price * (item.quantity || 0);
                return (
                  <div key={item.cart_id} className="text-sm print:text-[11px]">
                    <div className="grid grid-cols-12 gap-1 items-start mt-0.5">
                      <div className="col-span-5 font-bold leading-tight break-words">{idx + 1}. {item.product.product_name}</div>
                      <div className="col-span-1 text-center font-mono text-muted-foreground">{item.quantity}</div>
                      <div className="col-span-3 text-right font-mono text-muted-foreground">{fmt(price)}</div>
                      <div className="col-span-3 text-right font-mono font-bold text-foreground">{fmt(total)}</div>
                    </div>
                    {item.mechanic_name && (
                      <div className="text-xs text-muted-foreground italic pl-3 leading-none mt-1">Mechanic: {item.mechanic_name}</div>
                    )}
                  </div>
                );
              })}
              {partsItems.length > 0 && servicesItems.length > 0 && (
                <div className="flex justify-between font-bold text-xs border-t border-dashed border-border/50 pt-2 mt-2">
                  <span className="text-muted-foreground">Part/s Subtotal</span>
                  <span className="text-foreground">{fmt(partsTotal)}</span>
                </div>
              )}
            </div>
          )}

          {partsItems.length > 0 && servicesItems.length > 0 && (
            <div className="border-t border-dashed border-border/50 my-3" />
          )}

          {/* Services Section */}
          {servicesItems.length > 0 && (
            <div className="space-y-2">
              <div className="font-bold text-xs uppercase text-muted-foreground print:text-[10px] tracking-wider mb-1">Services</div>
              {servicesItems.map((item, idx) => {
                const price = getPosPrice(item.product, item.custom_price);
                const total = price * (item.quantity || 0);
                const sequenceNum = partsItems.length + idx + 1;
                return (
                  <div key={item.cart_id} className="text-sm print:text-[11px]">
                    <div className="grid grid-cols-12 gap-1 items-start mt-0.5">
                      <div className="col-span-5 font-bold leading-tight break-words">{sequenceNum}. {item.product.product_name}</div>
                      <div className="col-span-1 text-center font-mono text-muted-foreground">{item.quantity}</div>
                      <div className="col-span-3 text-right font-mono text-muted-foreground">{fmt(price)}</div>
                      <div className="col-span-3 text-right font-mono font-bold text-foreground">{fmt(total)}</div>
                    </div>
                    {item.mechanic_name && (
                      <div className="text-xs text-muted-foreground italic pl-3 leading-none mt-1">Mechanic: {item.mechanic_name}</div>
                    )}
                  </div>
                );
              })}
              {partsItems.length > 0 && servicesItems.length > 0 && (
                <div className="flex justify-between font-bold text-xs border-t border-dashed border-border/50 pt-2 mt-2">
                  <span className="text-muted-foreground">Service/s Subtotal</span>
                  <span className="text-foreground">{fmt(servicesTotal)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-border/50 my-4" />

        <div className="space-y-1 text-sm print:text-xs">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>₱{fmt((result?.total_amount || 0) - (result?.tax_amount || 0))}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
            <span>₱{fmt(result?.tax_amount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base mt-1 pt-2 border-t border-dashed border-border/50 print:text-sm">
            <span>GRAND TOTAL</span>
            <span>₱{fmt(result?.total_amount)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-border/50 my-4" />

        <div className="text-sm space-y-0.5 print:text-[11px]">
          {result?.payment_method === "Split" ? (
            <>
              <div className="flex justify-between"><span>Payment Method</span><span className="font-bold">Split</span></div>
              <div className="flex justify-between text-xs opacity-70 print:text-[10px]"><span>Cash Portion</span><span>{fmt(result?.cash_amount)}</span></div>
              <div className="flex justify-between text-xs opacity-70 print:text-[10px]"><span>E-Wallet Portion</span><span>{fmt(result?.ewallet_amount)}</span></div>
            </>
          ) : (
            <div className="flex justify-between"><span>Payment Method</span><span className="font-bold">{result?.payment_method || "Cash"}</span></div>
          )}
          <div className="flex justify-between font-bold pt-1 border-t border-border/50 mt-2">
            <span>CHANGE</span><span>{fmt(result?.change || result?.change_amount || 0)}</span>
          </div>
        </div>

        <div className="mt-6 text-center text-xs uppercase tracking-widest opacity-40 print:text-[9px]">
          {getReceiptFooter()}
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

  const isRootAdmin = useMemo(() => !!session?.is_root_admin || (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo", [session]);
  const posPermissions = useMemo(() => session?.permissions?.["POS Terminal"] || session?.permissions?.["pos terminal"] || session?.permissions?.["POS"] || [], [session]);
  const canAddSale = useMemo(() => isRootAdmin || posPermissions.some((a: string) => ["add", "edit", "create"].includes(a.toLowerCase())), [isRootAdmin, posPermissions]);

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
  const [taxRate, setTaxRate] = useState(() => parseFloat(localStorage.getItem("tax_rate") || "0.03"));
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<string[]>(() => {
    const raw = localStorage.getItem("pos_payment_methods");
    const allowed = ["Cash", "GCash", "PayMaya"];
    const methods = raw ? raw.split(",") : allowed;
    return methods.filter((m) => allowed.includes(m));
  });

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showServicesOnly, setShowServicesOnly] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Product | null>(null);
  const [mechanicName, setMechanicName] = useState("");
  const [mechanicsList, setMechanicsList] = useState<Mechanic[]>([]);
  const [servicePrice, setServicePrice] = useState("");
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const hasProcessedPayment = useRef(false);

  // --- Starting Cash & Shift Management State ---
  const [currentShift, setCurrentShift] = useState<PosShift | null>(null);
  const [showStartingCashModal, setShowStartingCashModal] = useState(false);
  const [startingCashInput, setStartingCashInput] = useState("");
  const [startingCashNotes, setStartingCashNotes] = useState("");
  const [startingShiftLoading, setStartingShiftLoading] = useState(false);

  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [endingCashInput, setEndingCashInput] = useState("");
  const [endShiftNotes, setEndShiftNotes] = useState("");
  const [endingShiftLoading, setEndingShiftLoading] = useState(false);

  // --- Held / Set Aside Transactions State ---
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    try {
      const saved = localStorage.getItem("invensight_held_orders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState(false);

  const saveHeldOrders = (orders: HeldOrder[]) => {
    setHeldOrders(orders);
    try {
      localStorage.setItem("invensight_held_orders", JSON.stringify(orders));
    } catch {}
  };

  const checkCurrentShift = useCallback(async () => {
    try {
      const res = await api.getCurrentShift();
      if (res.active && res.shift) {
        setCurrentShift(res.shift);
        setShowStartingCashModal(false);
      } else {
        setCurrentShift(null);
        if (canAddSale) {
          setShowStartingCashModal(true);
        } else {
          setShowStartingCashModal(false);
        }
      }
    } catch {
      setCurrentShift(null);
      if (canAddSale) {
        setShowStartingCashModal(true);
      } else {
        setShowStartingCashModal(false);
      }
    }
  }, [canAddSale]);

  useEffect(() => {
    checkCurrentShift();
  }, [checkCurrentShift]);

  const handleStartShift = async () => {
    if (!canAddSale) {
      toast.error("You have view-only access to POS Terminal. Starting shifts requires 'Add' permission.");
      return;
    }
    const amount = parseFloat(startingCashInput);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid Starting Cash amount (e.g. 0 or 1000)");
      return;
    }
    setStartingShiftLoading(true);
    try {
      await api.startShift(amount, terminal?.terminal_id || 1, startingCashNotes || undefined);
      toast.success(`Shift started with Starting Cash of ₱${(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
      setShowStartingCashModal(false);
      setStartingCashInput("");
      setStartingCashNotes("");
      await checkCurrentShift();
    } catch (err: any) {
      toast.error(err.message || "Failed to start shift");
    } finally {
      setStartingShiftLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!currentShift) return;
    setEndingShiftLoading(true);
    try {
      const endingAmount = endingCashInput !== "" ? parseFloat(endingCashInput) : undefined;
      await api.endShift(currentShift.shift_id, endingAmount, endShiftNotes || undefined);
      toast.success("Shift successfully closed.");
      setShowEndShiftModal(false);
      setEndingCashInput("");
      setEndShiftNotes("");
      setCurrentShift(null);
      setShowStartingCashModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to end shift");
    } finally {
      setEndingShiftLoading(false);
    }
  };

  // Derived
  const subtotal = useMemo(() => (cartItems || []).reduce((sum, i) => sum + (getPosPrice(i?.product, i?.custom_price) * (i?.quantity || 0)), 0), [cartItems]);
  const grandTotal = subtotal;
  const taxAmount = grandTotal - (grandTotal / (1 + taxRate));

  const cashFloat = parseFloat(cashInput) || 0;
  const change = cashFloat - grandTotal;
  const sufficient = cashFloat >= grandTotal - 0.01;

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const forceLogout = useCallback(async (isTimeout = false) => {
    setShowLogoutModal(false);
    const uid = session?.user_id;
    if (uid) {
      try {
        await api.logout(uid, isTimeout ? "Inactivity timeout" : "Manual logout");
      } catch {}
    }
    clearSession();
    if (isTimeout) {
      toast.warning("You have been logged out due to inactivity.", { id: "inactivity-timeout" });
    }
    navigate("/login", { replace: true });
  }, [session?.user_id, navigate]);

  const confirmLogout = useCallback(() => {
    void forceLogout(false);
  }, [forceLogout]);

  const handleLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const handleBack = useCallback(() => {
    navigate("/sales");
  }, [navigate]);

  // --- Inactivity Timeout Tracker for POS (Cross-Tab Synced) ---
  useEffect(() => {
    if (!session) return;

    // Load initial timeout
    const loadTimeout = async () => {
      try {
        const roleDefault = DEFAULT_TIMEOUT_BY_ROLE[currentRole] ?? (currentRole === "cashier" ? 15 : 120);

        const [settings, sysSettings] = await Promise.all([
          api.get<Record<string, any>>("/api/settings/user").catch(() => ({})),
          api.get<Record<string, string>>("/api/settings/system").catch(() => ({}))
        ]);
        
        let timeoutLimit: number;
        if (currentRole === "cashier") {
          if (sysSettings?.cashier_session_timeout !== undefined && sysSettings.cashier_session_timeout !== "") {
            timeoutLimit = parseInt(sysSettings.cashier_session_timeout, 10);
          } else if (settings?.session_timeout !== undefined && settings.session_timeout !== "default") {
            timeoutLimit = parseInt(settings.session_timeout, 10);
          } else {
            timeoutLimit = 15;
          }
        } else {
          if (settings?.session_timeout !== undefined && settings.session_timeout !== "default") {
            timeoutLimit = parseInt(settings.session_timeout, 10);
          } else {
            timeoutLimit = roleDefault;
          }
        }

        if (sysSettings?.shop_name !== undefined) localStorage.setItem("shop_name", sysSettings.shop_name);
        if (sysSettings?.shop_address !== undefined) localStorage.setItem("shop_address", sysSettings.shop_address);
        if (sysSettings?.shop_tagline !== undefined) localStorage.setItem("shop_tagline", sysSettings.shop_tagline);
        if (sysSettings?.shop_contact !== undefined) localStorage.setItem("shop_contact", sysSettings.shop_contact);

        setStoredTimeout(isNaN(timeoutLimit) ? roleDefault : timeoutLimit);
      } catch (e) {
        console.error("Failed to load timeout setting", e);
      }
    };
    loadTimeout();

    // Always initialize fresh activity on mount
    setLastActivity();

    const checkTimeout = () => {
      const stored = getStoredTimeout();
      const roleDefault = DEFAULT_TIMEOUT_BY_ROLE[currentRole] ?? (currentRole === "cashier" ? 15 : 120);
      const timeoutMinutes = stored !== null ? stored : roleDefault;

      if (timeoutMinutes <= 0) return;

      const now = Date.now();
      const lastActivity = getLastActivity();
      const inactiveMs = now - lastActivity;
      const timeoutMs = timeoutMinutes * 60 * 1000;

      if (inactiveMs >= timeoutMs) {
        console.log("POS session timed out after", timeoutMinutes, "minutes");
        forceLogout(true);
      }
    };

    let lastActivityLogged = 0;
    const handleActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once every 2 seconds
      if (now - lastActivityLogged > 2000) {
        lastActivityLogged = now;
        setLastActivity();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "invensight_session" && !e.newValue) {
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("mousedown", handleActivity, { passive: true });
    window.addEventListener("keypress", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });
    window.addEventListener("touchstart", handleActivity, { passive: true });
    window.addEventListener("focus", checkTimeout);
    document.addEventListener("visibilitychange", checkTimeout);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("invensight_settings_updated", loadTimeout);

    const interval = setInterval(checkTimeout, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keypress", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("focus", checkTimeout);
      document.removeEventListener("visibilitychange", checkTimeout);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("invensight_settings_updated", loadTimeout);
      clearInterval(interval);
    };
  }, [session, navigate, currentRole, forceLogout]);

  // --- POS Session Heartbeat ---
  useEffect(() => {
    if (!session?.user_id) return;
    api.heartbeat(session.user_id).catch(() => {});
    const heartbeatInterval = setInterval(() => {
      if (session?.user_id) {
        api.heartbeat(session.user_id).catch(() => {});
      }
    }, 60000);
    return () => clearInterval(heartbeatInterval);
  }, [session]);

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
    if (value === undefined || value === null || value === "") return "";
    const s = typeof value === "number" ? (isNaN(value) ? "" : value.toString()) : value;
    if (!s) return "";
    const parts = s.split(".");
    parts[0] = (parts[0] || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
  };

  const handlePartialCashChange = (val: string) => {
    const clean = val.replace(/,/g, "");
    if (clean === "") {
      setPartialCash("");
      setPartialEWallet(grandTotal > 0 ? grandTotal.toFixed(2) : "0.00");
      return;
    }
    if (!/^\d{0,9}(\.\d{0,2})?$/.test(clean)) return;
    setPartialCash(clean);
    const cash = parseFloat(clean) || 0;
    setPartialEWallet(Math.max(0, grandTotal - cash).toFixed(2));
  };

  const handlePartialEWalletChange = (val: string) => {
    const clean = val.replace(/,/g, "");
    if (clean === "") {
      setPartialEWallet("");
      setPartialCash(grandTotal > 0 ? grandTotal.toFixed(2) : "0.00");
      return;
    }
    if (!/^\d{0,9}(\.\d{0,2})?$/.test(clean)) return;
    setPartialEWallet(clean);
    const ewal = parseFloat(clean) || 0;
    setPartialCash(Math.max(0, grandTotal - ewal).toFixed(2));
  };

  const fetchCatalog = useCallback(async (isInitialLoad: boolean) => {
    try {
      if (isInitialLoad) setLoading(true);
      const [prods, cats, terminals, sups, taxRateData, mechanicsData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getTerminals(),
        api.getSuppliers(),
        api.get<{ tax_rate: number }>("/api/settings/tax-rate").catch(() => ({ tax_rate: 0.03 })),
        api.getMechanics().catch(() => []),
      ]);

      setProducts(prods || []);
      setCategories(cats || []);
      setSuppliers(sups || []);
      setMechanicsList(Array.isArray(mechanicsData) ? mechanicsData : (mechanicsData?.mechanics || []));
      if (taxRateData && typeof taxRateData.tax_rate === "number") {
        setTaxRate(taxRateData.tax_rate);
      }
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

  const handleProductClick = useCallback((product: Product) => {
    if (product.is_service) {
      setSelectedService(product);
      setMechanicName("");
      setServicePrice(product.unit_price ? String(product.unit_price) : "");
      setShowServiceModal(true);
    } else {
      const stock = product?.quantity ?? 0;
      if (stock <= 0) { toast.error("Out of stock"); return; }
      setCartItems((prev) => {
        const cartId = `${product.product_id}`;
        const existing = prev.find((i) => i.cart_id === cartId);
        if (existing) {
          if (existing.quantity >= stock) { toast.error("Stock limit reached"); return prev; }
          return prev.map((i) => i.cart_id === cartId ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { product, quantity: 1, cart_id: cartId }];
      });
    }
  }, []);

  const addToCart = handleProductClick;

  const addServiceToCart = useCallback((product: Product, mechanic: string, price: number) => {
    setCartItems((prev) => {
      const cartId = `${product.product_id}-${mechanic}-${price}`;
      const existing = prev.find((i) => i.cart_id === cartId);
      if (existing) {
        return prev.map((i) => i.cart_id === cartId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1, mechanic_name: mechanic, custom_price: price, cart_id: cartId }];
    });
  }, []);

  const handleConfirmService = () => {
    if (!selectedService) return;
    if (!mechanicName.trim()) {
      toast.error("Please enter mechanic name");
      return;
    }
    const price = parseFloat(servicePrice);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }
    addServiceToCart(selectedService, mechanicName.trim(), price);
    setShowServiceModal(false);
    setSelectedService(null);
  };

  const updateQty = useCallback((cartId: string, delta: number) => {
    setCartItems((prev) => prev.map((i) => i.cart_id === cartId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0));
  }, []);

  const setQty = useCallback((cartId: string, val: string) => {
    const q = parseInt(val) || 0;
    setCartItems((prev) => prev.map((i) => i.cart_id === cartId ? { ...i, quantity: Math.max(0, q) } : i).filter((i) => i.quantity > 0));
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cart_id !== cartId));
  }, []);

  const clearCart = () => {
    setCartItems([]);
    setCustomerName("");
    setContactNumber("");
    setAddress("");
    setCashInput("");
    setPartialCash("");
    setPartialEWallet("");
    setIsPartialPayment(false);
    setSaleResult(null);
  };

  const handleHoldOrder = () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty. Nothing to set aside.");
      return;
    }

    const newHeld: HeldOrder = {
      id: `hold-${Date.now()}`,
      customerName: customerName.trim() || "Walk In customer",
      contactNumber,
      address,
      cartItems: [...cartItems],
      isPartialPayment,
      partialCash,
      partialEWallet,
      paymentMethod,
      heldAt: new Date().toISOString(),
      totalAmount: grandTotal,
    };

    const updated = [newHeld, ...heldOrders];
    saveHeldOrders(updated);
    clearCart();
    toast.success(`Transaction for "${newHeld.customerName}" held. Ready for next customer!`);
  };

  const handleResumeHeldOrder = (heldId?: string) => {
    if (heldOrders.length === 0) {
      toast.info("No held transactions available.");
      return;
    }

    const target = heldId ? heldOrders.find(o => o.id === heldId) : heldOrders[0];
    if (!target) return;

    // Cleanly remove the target order from the held orders list
    const remainingHeld = heldOrders.filter(o => o.id !== target.id);

    // Only auto-hold current cart if NOT on the receipt screen and cart has uncompleted items
    if (!saleResult && cartItems.length > 0) {
      const autoHoldCurrent: HeldOrder = {
        id: `hold-${Date.now()}`,
        customerName: customerName.trim() || "Walk In customer",
        contactNumber,
        address,
        cartItems: [...cartItems],
        isPartialPayment,
        partialCash,
        partialEWallet,
        paymentMethod,
        heldAt: new Date().toISOString(),
        totalAmount: grandTotal,
      };
      saveHeldOrders([autoHoldCurrent, ...remainingHeld]);
      toast.info("Current uncompleted order set aside. Resumed previous order.");
    } else {
      saveHeldOrders(remainingHeld);
      toast.success(`Resumed order for "${target.customerName}".`);
    }

    // Load resumed order into active cart
    setCartItems(target.cartItems);
    setCustomerName(target.customerName === "Walk In customer" ? "" : target.customerName);
    setContactNumber(target.contactNumber || "");
    setAddress(target.address || "");
    setIsPartialPayment(target.isPartialPayment || false);
    setPartialCash(target.partialCash || "");
    setPartialEWallet(target.partialEWallet || "");
    setPaymentMethod(target.paymentMethod || "Cash");
    setCashInput("");
    setShowHeldOrdersModal(false);
    setSaleResult(null); // Return to POS from receipt view
  };

  const handleDiscardHeldOrder = (heldId: string) => {
    const updated = heldOrders.filter(o => o.id !== heldId);
    saveHeldOrders(updated);
    toast.info("Held transaction discarded.");
  };

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      if (!p) return false;
      if (showServicesOnly) {
        if (!p.is_service) return false;
      } else {
        if (p.is_service) return false;
      }
      const name = (p.product_name || "").toLowerCase();
      const cat = (p.category_name || "").toLowerCase();
      const sup = (p.supplier_name || "").toLowerCase();
      return name.includes(searchName.toLowerCase()) && cat.includes(searchCategory.toLowerCase()) && sup.includes(searchSupplier.toLowerCase());
    });
  }, [products, searchName, searchCategory, searchSupplier, showServicesOnly]);

  const handleNumpad = (val: string) => {
    const update = (prev: string) => {
      if (val === "CANCEL") return "";
      if (val === "DELETE") return prev.slice(0, -1);
      if (val === "." && prev.includes(".")) return prev;
      if (val === "." && !prev) return "0.";
      if (val === "00" && (!prev || prev === "0")) return "0";

      // If already has decimal point, max 2 decimal places
      if (prev.includes(".")) {
        const parts = prev.split(".");
        if (parts[1] && parts[1].length >= 2) return prev;
        if (val === "00") {
          if (parts[1] && parts[1].length >= 1) return prev;
          return prev + "0";
        }
      } else {
        // Integer part limit (max 9 digits before decimal)
        if (val !== "." && prev.replace(/^0+/, "").length >= 9) return prev;
        if (prev === "0" && val !== ".") return val === "00" ? "0" : val;
      }
      return prev + val;
    };
    if (numpadTarget === "cash") setCashInput(update(cashInput));
    else if (numpadTarget === "partialCash") handlePartialCashChange(update(partialCash));
    else if (numpadTarget === "partialEWallet") handlePartialEWalletChange(update(partialEWallet));
  };

  const handleProceedClick = () => {
    if (!canAddSale) {
      toast.error("You have 'View' only access to POS Terminal. Processing sales requires 'Add' permission.");
      return;
    }
    if (!currentShift) {
      toast.error("Please enter Starting Cash to start your shift before transacting.");
      setShowStartingCashModal(true);
      return;
    }

    const cashVal = isPartialPayment ? (parseFloat(partialCash) || 0) : (paymentMethod === "Cash" ? cashFloat : 0);
    const ewalletVal = isPartialPayment ? (parseFloat(partialEWallet) || 0) : (paymentMethod !== "Cash" ? grandTotal : 0);
    const finalMethod = isPartialPayment ? "Split" : paymentMethod;

    if (finalMethod === "Cash" && !sufficient) { toast.error("Insufficient cash"); return; }
    if (finalMethod === "Split" && (cashVal + ewalletVal < grandTotal - 0.01)) { toast.error("Insufficient total payment"); return; }

    setShowConfirmModal(true);
  };

  const handleConfirmSale = async () => {
    if (!canAddSale) {
      toast.error("Permission denied: You do not have 'Add' permission to process sales.");
      return;
    }
    const normalizedContact = normalizePhilippineMobile(contactNumber);
    const cashVal = isPartialPayment ? (parseFloat(partialCash) || 0) : (paymentMethod === "Cash" ? cashFloat : 0);
    const ewalletVal = isPartialPayment ? (parseFloat(partialEWallet) || 0) : (paymentMethod !== "Cash" ? grandTotal : 0);
    const finalMethod = isPartialPayment ? "Split" : paymentMethod;

    if (finalMethod === "Cash" && !sufficient) { toast.error("Insufficient cash"); return; }
    if (finalMethod === "Split" && (cashVal + ewalletVal < grandTotal - 0.01)) { toast.error("Insufficient total payment"); return; }

    const finalData = {
      pos_terminal_id: terminal?.terminal_id ?? 1,
      user_id: currentUser.user_id,
      customer_info: customerName || "Walk In customer",
      customer_name: customerName,
      contact_number: normalizedContact || undefined,
      address,
      payment_method: finalMethod,
      cash_received: finalMethod === "Cash" ? cashFloat : (isPartialPayment ? cashVal : 0),
      cash_amount: cashVal,
      ewallet_amount: ewalletVal,
      service_charge: 0,
      items: cartItems.map((i) => ({ product_id: i.product.product_id, quantity: i.quantity, unit_price: getPosPrice(i.product, i.custom_price), mechanic_name: i.mechanic_name }))
    };

    try {
      setProcessing(true);
      const isEWallet = finalMethod === "GCash" || finalMethod === "PayMaya" || (finalMethod === "Split" && ewalletVal > 0);

      if (isEWallet) {
        const ewalCentavos = Math.round((finalMethod === "Split" ? ewalletVal : grandTotal) * 100);
        const sessionRes = await api.createPayMongoCheckoutSession({
          amount: ewalCentavos,
          currency: "PHP",
          description: `Sale: ${customerName || "Walk In customer"}`,
          customer_name: customerName,
          customer_phone: normalizedContact || undefined,
          items: [{ name: "POS Transaction", amount: ewalCentavos, quantity: 1 }],
          success_url: `${window.location.origin}/?payment=success`,
          cancel_url: `${window.location.origin}/?payment=failed`
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
      setShowConfirmModal(false);
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
      const parsed = JSON.parse(stored);
      const { finalData, cartItems: storedCart, sessionId } = parsed;
      if (status === "success") {
        const payload = {
          ...finalData,
          paymongo_source_id: sessionId || undefined,
          payment_status: "Paid"
        };
        const res = await api.createSale(payload);
        setCartItems(storedCart || []);
        setSaleResult(res);
        localStorage.removeItem("invensight_pending_sale");
        toast.success("Payment verified! Sale completed.");
      } else {
        setCartItems(storedCart || []);
        setCustomerName(finalData?.customer_name || "");
        localStorage.removeItem("invensight_pending_sale");
        toast.error("Payment was cancelled or failed. Cart restored.");
      }
    } catch (err: any) {
      console.error("Error finalizing PayMongo sale:", err);
      toast.error(err?.message || "Error finalizing payment.");
    } finally {
      setVerifyingPayment(false);
    }
  }, []);

  useEffect(() => {
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const windowStatus = urlParams?.get("payment");
    const routerStatus = searchParams.get("payment");
    const status = windowStatus || routerStatus;
    const hasPending = typeof window !== "undefined" && !!localStorage.getItem("invensight_pending_sale");

    if (status && hasPending && !hasProcessedPayment.current) {
      hasProcessedPayment.current = true;
      finalizePayMongo(status);
      try {
        setSearchParams({}, { replace: true });
        window.history.replaceState(null, "", "/");
      } catch {
        // Ignore
      }
    }
  }, [searchParams, finalizePayMongo, setSearchParams]);

  if (saleResult) {
    return (
      <Receipt 
        result={saleResult} 
        cartItems={cartItems} 
        onNewSale={clearCart} 
        taxRate={taxRate} 
        heldOrdersCount={heldOrders.length} 
        onResumeHeld={() => handleResumeHeldOrder()} 
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background flex-col sm:flex-row font-sans relative">
      {verifyingPayment && (
        <div className="absolute inset-0 z-[100] bg-zinc-950/60 backdrop-blur-sm flex flex-col items-center justify-center text-zinc-50">
          <div className="w-16 h-16 border-4 border-zinc-200 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-bold uppercase tracking-widest">Verifying Payment...</h2>
        </div>
      )}

      {/* LEFT: Products Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-card z-0">
        <div className="p-4 border-b border-border/50 bg-card flex items-center gap-4">
          <div className="flex border border-border/50 rounded-xl p-1 bg-muted/30 flex-shrink-0">
            <button
              onClick={() => setShowServicesOnly(false)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                !showServicesOnly ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Products
            </button>
            <button
              onClick={() => setShowServicesOnly(true)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                showServicesOnly ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All Services
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input type="text" placeholder="SEARCH PRODUCT..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="w-full bg-muted/20 border border-border/50 rounded-xl py-3 pl-10 text-xs font-bold outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-muted-foreground/50 text-foreground" />
          </div>
          <select value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)} className="bg-muted/20 border border-border/50 rounded-xl py-3 px-4 text-xs font-bold outline-none appearance-none cursor-pointer text-foreground">
            <option value="">ALL CATEGORIES</option>
            {categories.map((c) => <option key={c.category_id} value={c.category_name}>{c.category_name}</option>)}
          </select>
          <select value={searchSupplier} onChange={(e) => setSearchSupplier(e.target.value)} className="bg-muted/20 border border-border/50 rounded-xl py-3 px-4 text-xs font-bold outline-none appearance-none cursor-pointer text-foreground">
            <option value="">ALL SUPPLIERS</option>
            {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_name}>{s.supplier_name}</option>)}
          </select>
        </div>
        <div className="px-6 py-4 bg-muted/30 grid grid-cols-12 gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50">
          <div className={showServicesOnly ? "col-span-8" : "col-span-4"}>Product Details</div>
          <div className={showServicesOnly ? "col-span-3" : "col-span-2"}>Category</div>
          {!showServicesOnly && (
            <>
              <div className="col-span-2">Supplier</div>
              <div className="col-span-1 text-center">Stock</div>
              <div className="col-span-2 text-right">Price</div>
            </>
          )}
          <div className="col-span-1"></div>
        </div>

        <div className="flex-1 overflow-y-auto bg-card px-2">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground/70 text-sm font-bold animate-pulse uppercase">Syncing Catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
              <ShoppingCart className="w-24 h-24 mb-4 opacity-20" />
              <p className="font-bold text-sm uppercase tracking-wide">No items found</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredProducts.map((product) => (
                <div
                  key={product.product_id}
                  onClick={() => addToCart(product)}
                  className="px-4 py-3.5 grid grid-cols-12 gap-4 items-center hover:bg-muted/40 cursor-pointer transition-colors group"
                >
                  <div className={showServicesOnly ? "col-span-8" : "col-span-4"}>
                    <div className="text-sm font-bold text-foreground uppercase group-hover:text-zinc-950 dark:group-hover:text-white transition-colors truncate">{product.product_name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight mt-1">{product.sku}</div>
                  </div>
                  <div className={cn("text-xs font-semibold text-muted-foreground uppercase truncate", showServicesOnly ? "col-span-3" : "col-span-2")}>{product.category_name}</div>
                  {!showServicesOnly && (
                    <>
                      <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase truncate">{product.supplier_name}</div>
                      <div className="col-span-1 text-sm text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium font-mono",
                          (product.quantity || 0) <= 5 ? "text-red-600 dark:text-red-500" : (product.quantity || 0) <= 10 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-500"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            (product.quantity || 0) <= 5 ? "bg-red-500" : (product.quantity || 0) <= 10 ? "bg-amber-500" : "bg-emerald-500"
                          )} />
                          {product.quantity ?? 0}
                        </span>
                      </div>
                      <div className="col-span-2 text-right text-base font-bold text-foreground pr-2 font-mono">₱ {fmt(getPosPrice(product))}</div>
                    </>
                  )}
                  <div className="col-span-1 text-right">
                    <button className="w-8 h-8 flex items-center justify-center bg-muted hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-950 rounded-full transition-all border border-border/50">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* RIGHT: Checkout Panel */}
      <div className="w-full sm:w-[450px] shadow-sm z-10 bg-card flex flex-col border-l border-border/50 flex-shrink-0">
        <div className="p-3.5 border-b border-border/50 flex justify-between items-center bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground tracking-tight uppercase">Checkout</h1>
            {!canAddSale && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                View Only
              </span>
            )}
            {canAddSale && (
              currentShift ? (
                <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                  <Banknote className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    Starting: ₱{fmt(currentShift.starting_cash)}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowStartingCashModal(true)}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/25 transition-all cursor-pointer shadow-xs"
                  title="Enter Starting Cash to start shift"
                >
                  <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  + Start Shift
                </button>
              )
            )}
            {heldOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHeldOrdersModal(true)}
                className="px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-amber-500/25 transition-all shadow-xs cursor-pointer animate-pulse"
                title="View and resume set-aside orders"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Held ({heldOrders.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentShift && (
              <button
                onClick={async () => {
                  try {
                    const res = await api.getCurrentShift();
                    if (res.active && res.shift) {
                      setCurrentShift(res.shift);
                      const expected = res.shift.total_expected_cash ?? (res.shift.starting_cash + (res.shift.cash_sales || 0));
                      setEndingCashInput(String(expected));
                    } else {
                      const expected = currentShift.total_expected_cash ?? (currentShift.starting_cash + (currentShift.cash_sales || 0));
                      setEndingCashInput(String(expected));
                    }
                  } catch {
                    const expected = currentShift.total_expected_cash ?? (currentShift.starting_cash + (currentShift.cash_sales || 0));
                    setEndingCashInput(String(expected));
                  }
                  setShowEndShiftModal(true);
                }}
                className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors px-2 py-1 rounded-md border border-amber-500/20 flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer"
                title="Close Register / End Shift"
              >
                <Store className="w-3.5 h-3.5" /> End Shift
              </button>
            )}
            {currentRole === "cashier" ? (
              <button 
                onClick={handleLogout} 
                className="text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1 font-bold text-[10px] uppercase group cursor-pointer border border-red-500/20"
                title="Logout from POS"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded-md hover:bg-muted border border-border/50 flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer"
                title="Back to Sales / Dashboard"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
          </div>
        </div>

        {cartItems.length > 0 && (
          <div className="p-3 bg-muted/30 border-b border-border/50 flex justify-between items-center group">
            <div className="flex items-center gap-1 ml-2">
              <input type="checkbox" id="partial-toggle" checked={isPartialPayment} onChange={(e) => setIsPartialPayment(e.target.checked)} className="w-4 h-4 text-zinc-950 rounded focus:ring-zinc-950 accent-zinc-900 border-border/50" />
              <label htmlFor="partial-toggle" className="text-xs font-bold text-muted-foreground cursor-pointer uppercase tracking-tighter">Partial Payment Mode</label>
            </div>
            <button onClick={clearCart} className="text-xs text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded uppercase mr-2 tracking-widest">CLEAR CART</button>
          </div>
        )}

        <div className="p-3 gap-2 bg-card border-b border-border/50 flex flex-col">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Customer</label>
              <input type="text" placeholder="Walk In customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border border-border/60 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 transition-all text-foreground" />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Contact</label>
              <input type="text" placeholder="09..." value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="w-full border border-border/60 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 transition-all text-foreground" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/20 p-2 min-h-[140px]">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 py-6">
              <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
              <p className="font-bold text-[10px] uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {cartItems.map((item) => (
                <div key={item.cart_id} className="bg-card p-2.5 rounded-xl border border-border/50 flex items-center justify-between group shadow-xs">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-foreground text-xs uppercase truncate">{item.product?.product_name}</div>
                    {item.mechanic_name && (
                      <div className="text-[10px] text-muted-foreground italic font-medium">Mechanic: {item.mechanic_name}</div>
                    )}
                    <div className="text-[9px] text-muted-foreground font-mono uppercase mt-0.5 tracking-tight">{item.product?.sku}</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center bg-muted/50 border border-border/50 rounded-full p-0.5">
                      <button onClick={() => updateQty(item.cart_id, -1)} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground font-bold">-</button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => setQty(item.cart_id, e.target.value)}
                        className="w-8 bg-transparent text-center text-xs font-mono font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button onClick={() => updateQty(item.cart_id, 1)} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground font-bold">+</button>
                    </div>
                    <div className="font-mono font-bold text-foreground text-xs w-18 text-right">₱ {fmt(getPosPrice(item.product, item.custom_price) * item.quantity)}</div>
                    <button onClick={() => removeFromCart(item.cart_id)} className="text-gray-300 hover:text-red-500 transition-all p-1 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-3.5 py-2.5 bg-card border-t border-border/50 space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            <span>Subtotal</span>
            <span className="font-mono">₱ {fmt(grandTotal - taxAmount)}</span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
            <span className="font-mono">₱ {fmt(taxAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-foreground pt-1 border-t border-border/50">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Grand Total</span>
            <span className="text-xl font-bold font-mono">₱ {fmt(grandTotal)}</span>
          </div>
        </div>

        <div className="border-t border-border/50 bg-card p-3">
          {isPartialPayment ? (
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <div className="space-y-0.5 min-w-0">
                <label className="text-[9px] font-bold text-muted-foreground uppercase">Cash Portion</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono font-bold select-none">₱</span>
                  <input
                    type="text"
                    value={formatNumberWithCommas(partialCash)}
                    onChange={(e) => handlePartialCashChange(e.target.value)}
                    onFocus={() => setNumpadTarget("partialCash")}
                    placeholder="0.00"
                    maxLength={14}
                    className={cn(
                      "w-full bg-muted/20 border-2 rounded-xl py-1.5 pl-6 pr-2.5 text-xs font-mono font-bold outline-none transition-all text-foreground truncate",
                      numpadTarget === "partialCash" ? "border-zinc-950 dark:border-zinc-50" : "border-border/50"
                    )}
                  />
                </div>
              </div>
              <div className="space-y-0.5 min-w-0">
                <label className="text-[9px] font-bold text-muted-foreground uppercase">E-Wallet Portion</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono font-bold select-none">₱</span>
                  <input
                    type="text"
                    value={formatNumberWithCommas(partialEWallet)}
                    onChange={(e) => handlePartialEWalletChange(e.target.value)}
                    onFocus={() => setNumpadTarget("partialEWallet")}
                    placeholder="0.00"
                    maxLength={14}
                    className={cn(
                      "w-full bg-muted/20 border-2 rounded-xl py-1.5 pl-6 pr-2.5 text-xs font-mono font-bold outline-none transition-all text-foreground truncate",
                      numpadTarget === "partialEWallet" ? "border-zinc-950 dark:border-zinc-50" : "border-border/50"
                    )}
                  />
                </div>
              </div>
            </div>
          ) : paymentMethod === "Cash" ? (
            <div className="flex gap-2.5 mb-2.5 items-end">
              <div className="flex-1 min-w-0">
                <label className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5 block">Amount Tendered</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold select-none">₱</span>
                  <input
                    type="text"
                    value={formatNumberWithCommas(cashInput)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, "");
                      if (val === "" || /^\d{0,9}(\.\d{0,2})?$/.test(val)) setCashInput(val);
                    }}
                    onFocus={() => setNumpadTarget("cash")}
                    placeholder="0.00"
                    maxLength={14}
                    className={cn(
                      "w-full bg-muted/20 border-2 rounded-xl py-2 pl-8 pr-2.5 text-lg font-mono font-bold outline-none transition-all text-foreground truncate",
                      numpadTarget === "cash" ? "border-zinc-950 dark:border-zinc-50" : "border-border/50"
                    )}
                  />
                </div>
              </div>
              <div className="w-32 flex-shrink-0 min-w-0">
                <label className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5 block">Change</label>
                <div
                  className={cn(
                    "py-2 px-2 rounded-xl text-center font-mono font-bold text-base h-[46px] border border-border/50 flex items-center justify-center overflow-hidden",
                    change >= 0 && cashFloat > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500 border-emerald-500/30'
                      : 'bg-muted/30 text-muted-foreground'
                  )}
                  title={`₱ ${fmt(Math.max(0, change))}`}
                >
                  <span className="truncate block max-w-full">
                    ₱ {fmt(Math.max(0, change))}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {!isPartialPayment && (
            <div className="flex gap-1.5 mb-2.5">
              {enabledPaymentMethods.map((mappedMethod) => (
                <button
                  key={mappedMethod}
                  type="button"
                  onClick={() => setPaymentMethod(mappedMethod)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border font-bold text-[10px] tracking-widest transition-all uppercase cursor-pointer",
                    paymentMethod === mappedMethod
                      ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                      : "border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {mappedMethod}
                </button>
              ))}
            </div>
          )}

          {paymentMethod === "Cash" && !isPartialPayment && (
            <div className="grid grid-cols-4 gap-1 mb-2">
              <button
                type="button"
                onClick={() => setCashInput(grandTotal > 0 ? grandTotal.toFixed(2) : "")}
                className="py-1 px-1 text-[10px] font-bold uppercase rounded-lg border border-border/50 bg-muted/30 hover:bg-muted text-foreground transition-all cursor-pointer font-mono tracking-tight"
                title="Exact Amount"
              >
                Exact
              </button>
              {[100, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCashInput(String(preset))}
                  className="py-1 px-1 text-[10px] font-bold uppercase rounded-lg border border-border/50 bg-muted/30 hover:bg-muted text-foreground transition-all cursor-pointer font-mono"
                >
                  ₱{preset}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-1 mb-2.5">
            {['7', '8', '9', 'CLR', '4', '5', '6', 'DEL', '1', '2', '3', '.', '0', '00'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleNumpad(btn === 'CLR' ? 'CANCEL' : btn === 'DEL' ? 'DELETE' : btn)}
                className={cn(
                  "py-1.5 rounded-lg border-b-2 active:border-b-0 active:translate-y-0.5 transition-all font-bold text-base font-mono cursor-pointer",
                  btn === 'CLR' || btn === 'DEL'
                    ? 'bg-red-50 dark:bg-red-950/10 text-red-500 border-red-100 dark:border-red-900/30 hover:bg-red-100/50'
                    : 'bg-card text-foreground border-border/50 hover:bg-muted/50 shadow-xs',
                  btn === '0' ? 'col-span-2' : ''
                )}
              >
                {btn}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleHoldOrder}
              disabled={cartItems.length === 0}
              className="px-3 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
              title="Set aside this order for another customer"
            >
              <PauseCircle className="w-4 h-4" />
              Hold Order
            </button>
            <button 
              onClick={handleProceedClick} 
              disabled={!canAddSale || processing || cartItems.length === 0 || (paymentMethod === "Cash" && !isPartialPayment && !sufficient)} 
              className={cn(
                "flex-1 py-3 font-bold text-base rounded-xl shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer",
                !canAddSale
                  ? "bg-muted text-muted-foreground border border-border cursor-not-allowed"
                  : "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              )}
              title={!canAddSale ? "View-only mode (Requires 'Add' permission on POS Terminal to process sales)" : undefined}
            >
              {!canAddSale ? "VIEW ONLY" : processing ? "PROCESSING..." : "PROCEED"}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-xl w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
          <DialogHeader className="border-b border-border/50 pb-3 mb-3">
            <div className="flex justify-between items-center pr-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight">
                    Review Transaction
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Modify items, quantities, or confirm payment details
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Modal scrollable content */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-1">
            {/* Customer Details Banner */}
            <div className="bg-muted/30 border border-border/50 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Customer</span>
                <span className="font-semibold text-foreground truncate block">{customerName || "Walk In Customer"}</span>
              </div>
              {contactNumber && (
                <div>
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase">Contact</span>
                  <span className="font-semibold text-foreground font-mono block">{contactNumber}</span>
                </div>
              )}
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Payment Mode</span>
                <span className={cn(
                  "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5",
                  isPartialPayment ? "text-purple-600 dark:text-purple-400 bg-purple-500/10" :
                    paymentMethod === "Cash" ? "text-zinc-700 dark:text-zinc-300 bg-zinc-500/10" :
                      paymentMethod === "GCash" ? "text-blue-600 dark:text-blue-400 bg-blue-500/10" : "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10"
                )}>
                  {isPartialPayment ? "Split / Partial" : paymentMethod}
                </span>
              </div>
            </div>

            {/* Order Items with Cart Controls */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Order Items ({cartItems.length})
                </h3>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {cartItems.reduce((acc, i) => acc + i.quantity, 0)} total units
                </span>
              </div>

              {cartItems.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                  <p className="text-xs font-semibold">No items in cart</p>
                </div>
              ) : (
                <div className="border border-border/50 rounded-xl divide-y divide-border/50 overflow-hidden bg-card max-h-[220px] overflow-y-auto">
                  {cartItems.map((item, idx) => {
                    const price = getPosPrice(item.product, item.custom_price);
                    const total = price * item.quantity;
                    return (
                      <div key={item.cart_id} className="p-2.5 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors">
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="font-bold text-foreground uppercase truncate">
                            {idx + 1}. {item.product.product_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">
                            {item.product.sku} {item.mechanic_name ? `• Mechanic: ${item.mechanic_name}` : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Qty +/- Controls */}
                          <div className="flex items-center bg-muted/50 border border-border/50 rounded-full p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQty(item.cart_id, -1)}
                              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground font-bold transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => setQty(item.cart_id, e.target.value)}
                              className="w-8 bg-transparent text-center text-xs font-mono font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateQty(item.cart_id, 1)}
                              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground font-bold transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="font-mono font-bold text-foreground text-xs w-20 text-right">
                            ₱ {fmt(total)}
                          </div>

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.cart_id)}
                            className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-500/10 cursor-pointer"
                            title="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Financial Overview Card */}
            <div className="bg-muted/20 border border-border/50 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-foreground">₱ {fmt(grandTotal - taxAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span className="font-mono font-semibold text-foreground">₱ {fmt(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-dashed border-border/50 pt-1.5 text-foreground">
                <span>Grand Total</span>
                <span className="text-lg font-mono font-extrabold text-foreground">₱ {fmt(grandTotal)}</span>
              </div>

              {isPartialPayment ? (
                <div className="border-t border-dashed border-border/50 pt-2 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Cash Paid</span>
                    <span className="font-bold text-foreground">₱ {fmt(parseFloat(partialCash) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>E-Wallet Paid</span>
                    <span className="font-bold text-foreground">₱ {fmt(parseFloat(partialEWallet) || 0)}</span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-dashed border-border/50 pt-2 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Amount Tendered</span>
                    <span className="font-bold text-foreground">
                      {paymentMethod === "Cash" ? `₱ ${fmt(cashFloat)}` : `₱ ${fmt(grandTotal)}`}
                    </span>
                  </div>
                  {paymentMethod === "Cash" && (
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-muted-foreground uppercase text-[10px] font-sans font-bold">Change</span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-lg font-bold text-sm",
                        change >= 0 && cashFloat > 0 ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-muted text-muted-foreground"
                      )}>
                        ₱ {fmt(Math.max(0, change))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-border/50 pt-3 mt-3 flex gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              Cancel & Edit
            </button>
            <button
              onClick={handleConfirmSale}
              disabled={processing || cartItems.length === 0 || (paymentMethod === "Cash" && !isPartialPayment && !sufficient)}
              className="flex-1 py-2.5 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 font-bold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {processing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm & Complete"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showServiceModal} onOpenChange={(open) => {
        if (!open) {
          setShowServiceModal(false);
          setSelectedService(null);
        }
      }}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
              Service Details
            </DialogTitle>
            <p className="text-xs text-muted-foreground font-medium uppercase mt-1">
              Configure mechanic and custom pricing for {selectedService?.product_name}
            </p>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Mechanic Name</label>
              <select
                value={mechanicName}
                onChange={(e) => setMechanicName(e.target.value)}
                className="w-full border border-border/60 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
              >
                <option value="">Select Mechanic</option>
                {mechanicsList.filter(m => m.status === 'Active').map(m => (
                  <option key={m.mechanic_id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Negotiated Price (₱)</label>
              <input
                type="number"
                placeholder="0.00"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                className="w-full border border-border/60 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all font-mono"
              />
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 mt-4 flex gap-3">
            <button
              onClick={() => {
                setShowServiceModal(false);
                setSelectedService(null);
              }}
              className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmService}
              className="flex-1 py-2.5 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 font-bold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-95"
            >
              Add Service
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* START SHIFT / STARTING CASH MODAL */}
      <Dialog open={showStartingCashModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col shadow-2xl [&>button]:hidden">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight">
                  Start Shift
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Enter the starting cash placed in the drawer
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                Starting Cash (₱) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-muted-foreground">₱</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0.00"
                  value={startingCashInput}
                  onChange={(e) => setStartingCashInput(e.target.value)}
                  className="w-full border border-border/60 rounded-xl pl-8 pr-4 py-3 text-base font-bold outline-none focus:border-emerald-500 bg-muted/20 hover:bg-muted/40 text-foreground transition-all font-mono"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick preset buttons */}
            <div>
              <label className="block text-[9px] font-bold text-muted-foreground uppercase mb-1.5">
                Quick Add Presets
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[200, 500, 1000, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const current = parseFloat(startingCashInput) || 0;
                      setStartingCashInput(String(current + preset));
                    }}
                    className="py-2 px-2 bg-muted/40 hover:bg-muted text-foreground text-xs font-bold rounded-lg border border-border/50 transition-all active:scale-95 font-mono"
                  >
                    +₱{preset}
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => setStartingCashInput("")}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase"
                >
                  Clear Amount
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                Shift Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Received change from morning shift"
                value={startingCashNotes}
                onChange={(e) => setStartingCashNotes(e.target.value)}
                className="w-full border border-border/60 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
              />
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 mt-4 flex gap-3">
            {currentRole === "cashier" ? (
              <button
                onClick={handleLogout}
                className="py-2.5 px-4 bg-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center gap-1.5 border border-border"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button
              onClick={handleStartShift}
              disabled={startingShiftLoading || startingCashInput === ""}
              className="flex-1 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {startingShiftLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Starting...
                </>
              ) : (
                "Open Register & Start Shift"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* END SHIFT MODAL */}
      <Dialog open={showEndShiftModal} onOpenChange={setShowEndShiftModal}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col shadow-2xl">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight">
                  End Shift & Close Register
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Review drawer totals and close your active shift
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-1">
            {/* Shift Breakdown Box */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Cashier</span>
                <span className="font-bold text-foreground">{currentShift?.cashier_name || currentUser.full_name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Starting Cash</span>
                <span className="font-mono font-bold text-foreground">₱{fmt(currentShift?.starting_cash || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Today's Cash Sales</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+₱{fmt(currentShift?.cash_sales || 0)}</span>
              </div>
              <div className="border-t border-dashed border-border/60 pt-2 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Total Expected Cash</span>
                <span className="font-mono text-base font-extrabold text-foreground">₱{fmt(currentShift?.total_expected_cash || 0)}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase">
                  Actual Cash Counted (₱)
                </label>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Auto-calculated
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-muted-foreground">₱</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={String(currentShift?.total_expected_cash || 0)}
                  value={endingCashInput}
                  onChange={(e) => setEndingCashInput(e.target.value)}
                  className="w-full border border-border/60 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all font-mono"
                />
              </div>

              {/* Variance Indicator */}
              {(() => {
                const expected = currentShift?.total_expected_cash || 0;
                const actual = endingCashInput !== "" ? parseFloat(endingCashInput) : expected;
                const diff = (actual || 0) - expected;
                if (Math.abs(diff) < 0.01) {
                  return (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                      ✓ Register balanced (₱0.00 variance)
                    </p>
                  );
                } else if (diff > 0) {
                  return (
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-1.5 flex items-center gap-1">
                      ▲ Cash Over: +₱{fmt(diff)}
                    </p>
                  );
                } else {
                  return (
                    <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
                      ▼ Cash Shortage: -₱{fmt(Math.abs(diff))}
                    </p>
                  );
                }
              })()}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                End Shift Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Remitted to manager"
                value={endShiftNotes}
                onChange={(e) => setEndShiftNotes(e.target.value)}
                className="w-full border border-border/60 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-zinc-400 bg-muted/20 hover:bg-muted/40 text-foreground transition-all"
              />
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 mt-4 flex gap-3">
            <button
              onClick={() => setShowEndShiftModal(false)}
              className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleEndShift}
              disabled={endingShiftLoading}
              className="flex-1 py-2.5 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 font-bold text-xs uppercase tracking-widest rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {endingShiftLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Closing...
                </>
              ) : (
                "Confirm & End Shift"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* HELD ORDERS MODAL */}
      <Dialog open={showHeldOrdersModal} onOpenChange={setShowHeldOrdersModal}>
        <DialogContent className="max-w-lg w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col max-h-[85vh] shadow-2xl">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight">
                  Held Transactions ({heldOrders.length})
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Resume a set-aside transaction or discard it
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {heldOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <PauseCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-semibold">No held transactions</p>
              </div>
            ) : (
              heldOrders.map((order) => (
                <div key={order.id} className="p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-all space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-foreground uppercase">{order.customerName}</div>
                      {order.contactNumber && (
                        <div className="text-xs text-muted-foreground font-mono">{order.contactNumber}</div>
                      )}
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(order.heldAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })} • {order.cartItems.length} item{order.cartItems.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold font-mono text-foreground">₱ {fmt(order.totalAmount)}</div>
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {order.paymentMethod}
                      </span>
                    </div>
                  </div>

                  {/* Items mini preview */}
                  <div className="text-xs text-muted-foreground border-t border-border/40 pt-2 line-clamp-2 font-mono">
                    {order.cartItems.map((item) => `${item.quantity}x ${item.product.product_name}`).join(", ")}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    <button
                      onClick={() => handleDiscardHeldOrder(order.id)}
                      className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/30 uppercase transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Discard
                    </button>
                    <button
                      onClick={() => handleResumeHeldOrder(order.id)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume Order
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border/50 pt-4 mt-4 flex justify-end">
            <button
              onClick={() => setShowHeldOrdersModal(false)}
              className="py-2.5 px-6 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Modal using Dialog to handle nested modal focus */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="max-w-sm w-full p-6 rounded-2xl border border-border/80 bg-card text-foreground shadow-2xl space-y-4 z-[120] [&>button]:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Confirm Logout</DialogTitle>
              <p className="text-xs text-muted-foreground">Are you sure you want to log out?</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You will be signed out of the POS terminal. Make sure to end your shift if your cash register drawer is closing.
          </p>
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-border/70 hover:bg-muted text-foreground transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmLogout}
              className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Log Out
            </button>
          </div>
        </DialogContent>
      </Dialog>
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
