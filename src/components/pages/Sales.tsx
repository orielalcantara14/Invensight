import { Search, Download, ShoppingBag, Eye, Monitor, PhilippinePeso, CheckCircle, XCircle, ShoppingCart, RotateCcw, Upload, Wrench, FileSpreadsheet, Banknote, Store, Clock, User as UserIcon, Edit3, Plus, FileText, Receipt, PowerOff } from "lucide-react";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { ProtectedAction } from "@/components/ProtectedAction";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router";
import type { SaleRecord, SaleDetail } from "@/types";
import { api, API_URL, type PosShift } from "@/services/api";
import { cn } from "@/lib/utils";
import { ViewInvoiceModal } from "@/components/modals/ViewInvoiceModal";
import { ProcessReturnModal } from "@/components/modals/ProcessReturnModal";
import { ReturnReceiptModal } from "@/components/modals/ReturnReceiptModal";
import { ExportPreviewModal } from "../modals/ExportPreviewModal";
import { ImportSalesModal } from "../modals/ImportSalesModal";
import { ShiftTransactionsModal } from "@/components/modals/ShiftTransactionsModal";
import { exportToExcel } from "@/utils/export";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSession } from "@/auth/session";
type ViewMode = "daily" | "semiannual" | "annual";

export function Sales() {
  const [session, setSession] = useState(getSession());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setSession(getSession());
    };
    window.addEventListener("invensight_profile_updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("invensight_profile_updated", handleProfileUpdate);
    };
  }, []);

  const isRootAdmin = !!session?.is_root_admin || (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo";
  const posPermissions = session?.permissions?.["POS Terminal"] || session?.permissions?.["pos terminal"] || session?.permissions?.["POS"] || [];
  const hasPosPermission = posPermissions.some((a) => ["view", "add", "access"].includes(a.toLowerCase()));
  const canAccessPosTerminal = isRootAdmin || hasPosPermission;

  const [salesRecords, setSalesRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SaleDetail | null>(null);
  const [returnInvoice, setReturnInvoice] = useState<SaleDetail | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("All");
  const [returnDetails, setReturnDetails] = useState<any | null>(null);
  const [showReturnReceipt, setShowReturnReceipt] = useState(false);
  const [salesStats, setSalesStats] = useState<{
    total_revenue: number;
    total_transactions: number;
    completed_sales: number;
    failed_payments: number;
    refunded_sales: number;
    total_profit: number;
    sales_performance: Array<{ label: string; revenue: number; profit: number; transactions: number }>;
  } | null>(null);
  const [view, setView] = useState<ViewMode>("semiannual");
  const [chartLoading, setChartLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [activeSalesTab, setActiveSalesTab] = useState<"invoices" | "shifts">("invoices");
  const [shifts, setShifts] = useState<PosShift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftStatusFilter, setShiftStatusFilter] = useState<string>("All");
  const [shiftDateFrom, setShiftDateFrom] = useState<string>("");
  const [shiftDateTo, setShiftDateTo] = useState<string>("");
  const [shiftPage, setShiftPage] = useState(1);
  const [shiftItemsPerPage, setShiftItemsPerPage] = useState(5);
  const [editingShiftNotes, setEditingShiftNotes] = useState<PosShift | null>(null);
  const [viewingShiftTransactions, setViewingShiftTransactions] = useState<PosShift | null>(null);
  const [startNotesDraft, setStartNotesDraft] = useState<string>("");
  const [endNotesDraft, setEndNotesDraft] = useState<string>("");
  const [savingShiftNotes, setSavingShiftNotes] = useState(false);

  // Force close open shift state
  const [forceCloseShift, setForceCloseShift] = useState<PosShift | null>(null);
  const [forceCloseActualCash, setForceCloseActualCash] = useState<string>("");
  const [forceCloseNote, setForceCloseNote] = useState<string>("");
  const [forceCloseSubmitting, setForceCloseSubmitting] = useState<boolean>(false);

  const handleOpenForceCloseShift = (shift: PosShift) => {
    setForceCloseShift(shift);
    const expected = Number(shift.total_expected_cash || 0);
    setForceCloseActualCash(expected.toFixed(2));
    const adminName = session?.full_name || session?.username || "Admin";
    setForceCloseNote(`Cashier forgot to end shift; counted and closed by ${adminName}`);
  };

  const handleConfirmForceCloseShift = async () => {
    if (!forceCloseShift) return;
    const endingCashNum = parseFloat(forceCloseActualCash);
    if (isNaN(endingCashNum) || endingCashNum < 0) {
      toast.error("Please enter a valid actual cash amount");
      return;
    }

    setForceCloseSubmitting(true);
    try {
      await api.endShift(forceCloseShift.shift_id, endingCashNum, forceCloseNote.trim());
      toast.success(`Shift #${forceCloseShift.shift_id} closed successfully`);
      setForceCloseShift(null);
      fetchShifts();
    } catch (err: any) {
      toast.error(err.message || "Failed to close shift");
    } finally {
      setForceCloseSubmitting(false);
    }
  };

  const handleOpenEditShiftNotes = (shift: PosShift) => {
    setEditingShiftNotes(shift);
    setStartNotesDraft(shift.start_notes || (!shift.end_notes ? (shift.notes || "") : ""));
    setEndNotesDraft(shift.end_notes || "");
  };

  const handleSaveShiftNotes = async () => {
    if (!editingShiftNotes) return;
    setSavingShiftNotes(true);
    try {
      const res = await api.updateShiftNotes(editingShiftNotes.shift_id, {
        start_notes: startNotesDraft.trim() || null,
        end_notes: endNotesDraft.trim() || null,
      });
      toast.success(`Notes for shift #${editingShiftNotes.shift_id} updated`);
      setShifts((prev) =>
        prev.map((s) =>
          s.shift_id === editingShiftNotes.shift_id
            ? {
                ...s,
                notes: res.notes,
                start_notes: res.start_notes,
                end_notes: res.end_notes,
              }
            : s
        )
      );
      setEditingShiftNotes(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update shift notes");
    } finally {
      setSavingShiftNotes(false);
    }
  };

  const fetchShifts = useCallback(async () => {
    setShiftsLoading(true);
    try {
      const data = await api.getAllShifts();
      setShifts(data || []);
    } catch {
      toast.error("Failed to load cash drawer shift records");
    } finally {
      setShiftsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSalesTab === "shifts") {
      fetchShifts();
    }
  }, [activeSalesTab, fetchShifts]);

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (shiftStatusFilter === "OPEN") {
        if (s.status !== "OPEN") return false;
      } else if (shiftStatusFilter === "CLOSED") {
        if (s.status !== "CLOSED") return false;
      } else if (shiftStatusFilter === "BALANCED") {
        if (s.status !== "CLOSED") return false;
        const diff = Number(s.ending_cash ?? 0) - Number(s.total_expected_cash ?? 0);
        if (Math.abs(diff) > 0.01) return false;
      } else if (shiftStatusFilter === "OVER") {
        if (s.status !== "CLOSED") return false;
        const diff = Number(s.ending_cash ?? 0) - Number(s.total_expected_cash ?? 0);
        if (diff <= 0.01) return false;
      } else if (shiftStatusFilter === "SHORT") {
        if (s.status !== "CLOSED") return false;
        const diff = Number(s.ending_cash ?? 0) - Number(s.total_expected_cash ?? 0);
        if (diff >= -0.01) return false;
      } else if (shiftStatusFilter === "DISCREPANCY") {
        if (s.status !== "CLOSED") return false;
        const diff = Number(s.ending_cash ?? 0) - Number(s.total_expected_cash ?? 0);
        if (Math.abs(diff) <= 0.01) return false;
      }

      if (shiftDateFrom || shiftDateTo) {
        const opened = new Date(s.opened_at);
        if (shiftDateFrom) {
          const from = new Date(shiftDateFrom);
          from.setHours(0, 0, 0, 0);
          if (opened < from) return false;
        }
        if (shiftDateTo) {
          const to = new Date(shiftDateTo);
          to.setHours(23, 59, 59, 999);
          if (opened > to) return false;
        }
      }
      return true;
    });
  }, [shifts, shiftStatusFilter, shiftDateFrom, shiftDateTo]);

  const activeOpenShiftsCount = useMemo(() => shifts.filter(s => s.status === "OPEN").length, [shifts]);
  const totalStartingCashInShifts = useMemo(() => filteredShifts.reduce((sum, s) => sum + (Number(s.starting_cash) || 0), 0), [filteredShifts]);
  const totalCashSalesInShifts = useMemo(() => filteredShifts.reduce((sum, s) => sum + (Number(s.cash_sales) || 0), 0), [filteredShifts]);
  const totalExpectedInShifts = useMemo(() => filteredShifts.reduce((sum, s) => sum + (Number(s.total_expected_cash) || 0), 0), [filteredShifts]);

  useEffect(() => {
    setShiftPage(1);
  }, [shiftStatusFilter, shiftDateFrom, shiftDateTo]);

  const shiftStartIndex = (shiftPage - 1) * shiftItemsPerPage;
  const shiftEndIndex = shiftStartIndex + shiftItemsPerPage;
  const paginatedShifts = filteredShifts.slice(shiftStartIndex, shiftEndIndex);

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleImportSuccess = async () => {
    setLoading(true);
    const resSales = await api.getSales(dateFrom || undefined, dateTo || undefined);
    setSalesRecords(resSales.sales);
    fetchSalesStats(view);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, paymentMethodFilter, transactionTypeFilter]);

  const fetchSalesStats = useCallback((viewMode: ViewMode) => {
    setChartLoading(true);
    api.getDashboardStats(viewMode)
      .then(res => {
        setSalesStats({
          total_revenue: res.total_revenue,
          total_transactions: res.total_transactions,
          completed_sales: res.completed_sales,
          failed_payments: res.failed_payments,
          refunded_sales: res.refunded_sales || 0,
          total_profit: res.total_profit || 0,
          sales_performance: res.sales_performance,
        });
      })
      .catch(err => {
        console.error("Failed to fetch sales stats:", err);
      })
      .finally(() => {
        setChartLoading(false);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getSales(dateFrom || undefined, dateTo || undefined)
      .then((res) => {
        setSalesRecords(res.sales);
      })
      .catch((err) => {
        console.error("Failed to fetch sales:", err);
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchSalesStats(view);
  }, [view, fetchSalesStats]);

  const formatPeso = (value: number) => {
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const kpis = [
    {
      label: "Total Revenue",
      value: salesStats ? formatPeso(salesStats.total_revenue) : "₱0.00",
      icon: PhilippinePeso,
      iconColor: "text-blue-500 dark:text-blue-400",
    },
    {
      label: "Total Transactions",
      value: salesStats ? salesStats.total_transactions.toLocaleString() : "0",
      icon: ShoppingCart,
      iconColor: "text-indigo-500 dark:text-indigo-400",
    },
    {
      label: "Total Profit",
      value: salesStats ? formatPeso(salesStats.total_profit) : "₱0.00",
      icon: PhilippinePeso,
      iconColor: "text-emerald-500 dark:text-emerald-400",
    },
    {
      label: "Completed Sales",
      value: salesStats ? salesStats.completed_sales.toLocaleString() : "0",
      icon: CheckCircle,
      iconColor: "text-teal-500 dark:text-teal-400",
    },
    {
      label: "Refunded Sales",
      value: salesStats ? salesStats.refunded_sales.toLocaleString() : "0",
      icon: RotateCcw,
      iconColor: "text-amber-500 dark:text-amber-400",
    },
  ];

  const handleViewInvoice = async (invoiceId: number) => {
    setLoadingInvoice(true);
    try {
      const sale = salesRecords.find(r => r.invoice_id === invoiceId);
      if (sale && (sale.payment_status === "Refunded" || sale.payment_status === "Exchanged")) {
        const ret = await api.getCustomerReturnBySaleId(invoiceId);
        setReturnDetails(ret);
        setShowReturnReceipt(true);
        // We also fetch the invoice detail just in case we want to show it combined
        const detail = await api.getSale(invoiceId);
        setSelectedInvoice(detail);
      } else {
        const detail = await api.getSale(invoiceId);
        setSelectedInvoice(detail);
      }
    } catch (err) {
      console.error("Failed to fetch sale/return details:", err);
      toast.error("Could not load receipt details");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleProcessReturn = async (invoiceId: number) => {
    setLoadingInvoice(true);
    try {
      const detail = await api.getSale(invoiceId);
      setReturnInvoice(detail);
    } catch (err) {
      console.error("Failed to fetch sale details:", err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleReturnSuccess = () => {
    api.getSales()
      .then((res) => {
        setSalesRecords(res.sales);
      });
  };

  const getTransactionType = (record: SaleRecord): "Service Only" | "Service & Sale" | "Sales Only" => {
    const hasService = record.items.some(i => i.is_service);
    const hasProduct = record.items.some(i => !i.is_service);
    if (hasService && hasProduct) return "Service & Sale";
    if (hasService) return "Service Only";
    return "Sales Only";
  };

  const filteredRecords = salesRecords.filter((record) => {
    const rawTerm = searchTerm.trim().toLowerCase();
    
    let matchesSearch = true;
    if (rawTerm) {
      const invoiceNumber = `INV-${String(record.invoice_id).padStart(6, "0")}`;
      const customer = (record.customer_info || "").toLowerCase();
      const contact = (record.contact_number || "").toLowerCase();

      const subTerms = rawTerm.includes(",")
        ? rawTerm.split(",").map(t => t.trim()).filter(Boolean)
        : [rawTerm];

      const recordMatchesTerm = (term: string) => {
        const words = term.split(/\s+/).filter(Boolean);

        // 1. Match invoice number, ID, customer name, contact
        if (invoiceNumber.toLowerCase().includes(term) || String(record.invoice_id).includes(term)) return true;
        if (customer.includes(term) || contact.includes(term)) return true;
        if (words.length > 1 && words.every(w => customer.includes(w) || contact.includes(w))) return true;

        // 2. Match sold items (product name, mechanic)
        return (record.items || []).some((item) => {
          const prodName = (item.product_name || "").toLowerCase();
          const mechName = (item.mechanic_name || "").toLowerCase();
          
          if (prodName.includes(term) || mechName.includes(term)) return true;
          if (words.length > 1 && words.every(w => prodName.includes(w) || mechName.includes(w))) return true;
          
          return false;
        });
      };

      matchesSearch = subTerms.every(term => recordMatchesTerm(term));
    }

    const recordDate = new Date(record.invoice_date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    const matchesDateFrom = !fromDate || recordDate >= fromDate;
    const matchesDateTo = !toDate || recordDate <= toDate;

    const matchesPaymentMethod = paymentMethodFilter === "All" || 
      (paymentMethodFilter === "Cash" && record.payment_method === "Cash") ||
      (paymentMethodFilter === "Cashless" && record.payment_method !== "Cash");

    const matchesStatus = statusFilter === "All" || record.payment_status === statusFilter;

    const matchesTransactionType = transactionTypeFilter === "All" || getTransactionType(record) === transactionTypeFilter;

    return matchesSearch && matchesDateFrom && matchesDateTo && matchesPaymentMethod && matchesStatus && matchesTransactionType;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  const handleExport = () => {
    const data = filteredRecords.map(r => ({
      "Invoice Number": `INV-${String(r.invoice_id).padStart(6, "0")}`,
      "Date": new Date(r.invoice_date).toLocaleString(),
      "Customer": r.customer_info,
      "Contact": r.contact_number || "",
      "Items Count": r.items.length,
      "Total Amount": r.total_amount,
      "Payment Method": r.payment_method,
      "Status": r.payment_status
    }));
    exportToExcel(data, "Sales_Export");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sales Management</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Track product sales with complete invoice details</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <a
              href={`${API_URL}/api/sales/import-template`}
              download
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-semibold rounded-full shadow-sm transition-all cursor-pointer border border-transparent"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              Template
            </a>

            <button
              onClick={handleImportClick}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-full shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 border border-transparent"
            >
              <Upload className="w-4 h-4 text-white" />
              Import CSV
            </button>

            {canAccessPosTerminal && (
              <Link
                to="/pos"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer text-xs sm:text-sm font-semibold"
              >
                <Monitor className="w-4 h-4 text-white" />
                POS Terminal
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex border-b border-border/60 mb-8 gap-8">
        <button
          onClick={() => setActiveSalesTab("invoices")}
          className={cn(
            "pb-3.5 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2",
            activeSalesTab === "invoices"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="w-4 h-4" />
          Sales Transactions
        </button>
        <button
          onClick={() => setActiveSalesTab("shifts")}
          className={cn(
            "pb-3.5 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2",
            activeSalesTab === "shifts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Banknote className="w-4 h-4" />
          Cashier Logs
          {activeOpenShiftsCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
              {activeOpenShiftsCount} Active
            </span>
          )}
        </button>
      </div>

      {activeSalesTab === "shifts" ? (
        <div className="space-y-8">
          {/* Shift KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-card p-4 sm:p-5 rounded-xl border border-border/50 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Total Starting Cash</span>
                <Banknote className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-semibold tracking-tight font-mono text-foreground">₱{totalStartingCashInShifts.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>

            <div className="bg-card p-4 sm:p-5 rounded-xl border border-border/50 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Total Cash Sales</span>
                <PhilippinePeso className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-semibold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">₱{totalCashSalesInShifts.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>

            <div className="bg-card p-4 sm:p-5 rounded-xl border border-border/50 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Total Expected Cash</span>
                <PhilippinePeso className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-semibold tracking-tight font-mono text-foreground">₱{totalExpectedInShifts.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* Shifts Table */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-border/40 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Cashier Logs</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Full audit of cashier starting cash, cash collections, and drawer totals</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <DateRangePicker
                  dateFrom={shiftDateFrom}
                  dateTo={shiftDateTo}
                  onDateChange={(from, to) => {
                    setShiftDateFrom(from);
                    setShiftDateTo(to);
                  }}
                  placeholder="Filter shift dates"
                />
                <select
                  value={shiftStatusFilter}
                  onChange={(e) => setShiftStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all cursor-pointer"
                >
                  <option value="All">All Records</option>
                  <option value="DISCREPANCY">With Discrepancy</option>
                  <option value="OVER">Over (Extra Cash)</option>
                  <option value="SHORT">Short (Missing Cash)</option>
                  <option value="BALANCED">Balanced (Exact)</option>
                </select>
                <button
                  onClick={fetchShifts}
                  disabled={shiftsLoading}
                  className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-border/40">
                  <tr>
                    <th className="px-3.5 py-3 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Cashier</th>
                    <th className="px-3.5 py-3 text-right text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Starting Cash</th>
                    <th className="px-3.5 py-3 text-right text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Cash Sales</th>
                    <th className="px-3.5 py-3 text-right text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Total Expected</th>
                    <th className="px-3.5 py-3 text-right text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Actual Count</th>
                    <th className="px-3.5 py-3 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Shift Notes</th>
                    <th className="px-3.5 py-3 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Shift Opened</th>
                    <th className="px-3.5 py-3 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Shift Closed</th>
                    <th className="px-3.5 py-3 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {shiftsLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">Loading shift logs...</td>
                    </tr>
                  ) : filteredShifts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                        <Store className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-sm">No cash drawer shifts recorded yet</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedShifts.map((shift) => (
                      <tr key={shift.shift_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
                                {(shift.cashier_name || "U").charAt(0)}
                              </div>
                              {shift.status === "OPEN" && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" title="Open shift" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate max-w-[140px]">{shift.cashier_name || shift.username}</div>
                              <div className="text-[9px] text-muted-foreground uppercase">{shift.role || "Cashier"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-right text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                          ₱{Number(shift.starting_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +₱{Number(shift.cash_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-right text-xs font-mono font-extrabold text-foreground">
                          ₱{Number(shift.total_expected_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-right text-xs font-mono">
                          {shift.ending_cash !== null && shift.ending_cash !== undefined ? (
                            <div>
                              <span className="font-bold text-foreground block">
                                ₱{Number(shift.ending_cash).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </span>
                              {(() => {
                                const diff = Number(shift.ending_cash) - Number(shift.total_expected_cash || 0);
                                if (Math.abs(diff) < 0.01) {
                                  return <span className="text-[10px] font-semibold text-muted-foreground block">Exact (₱0.00)</span>;
                                } else if (diff > 0) {
                                  return <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">+₱{diff.toLocaleString("en-US", { minimumFractionDigits: 2 })} Over</span>;
                                } else {
                                  return <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block">-₱{Math.abs(diff).toLocaleString("en-US", { minimumFractionDigits: 2 })} Short</span>;
                                }
                              })()}
                            </div>
                          ) : (
                            <span className="font-bold text-muted-foreground">—</span>
                          )}
                        </td>
                        {/* Shift Notes Column */}
                        <td className="px-3.5 py-3 max-w-[210px]">
                          {shift.start_notes || shift.end_notes || shift.notes ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEditShiftNotes(shift)}
                              title={`Click to edit notes (Start: ${shift.start_notes || "—"} | End: ${shift.end_notes || "—"})`}
                              className="group text-left w-full flex flex-col gap-0.5 px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/20 transition-all cursor-pointer"
                            >
                              {shift.start_notes && (
                                <span className="truncate text-[11px] font-medium flex items-center gap-1">
                                  <span className="text-[8px] font-bold uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-1 py-0.2 rounded">Start</span>
                                  <span className="truncate">{shift.start_notes}</span>
                                </span>
                              )}
                              {shift.end_notes && (
                                <span className="truncate text-[11px] font-medium flex items-center gap-1">
                                  <span className="text-[8px] font-bold uppercase text-amber-700 dark:text-amber-300 bg-amber-500/25 px-1 py-0.2 rounded">End</span>
                                  <span className="truncate">{shift.end_notes}</span>
                                </span>
                              )}
                              {!shift.start_notes && !shift.end_notes && shift.notes && (
                                <span className="truncate text-[11px] font-medium">
                                  💬 {shift.notes}
                                </span>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEditShiftNotes(shift)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-dashed border-border/70 transition-all cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              Add note
                            </button>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-[11px] font-mono text-muted-foreground">
                          {new Date(shift.opened_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-[11px] font-mono text-muted-foreground">
                          {shift.closed_at ? new Date(shift.closed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingShiftTransactions(shift)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-all border border-border/80 cursor-pointer shadow-xs"
                              title="View all transactions in this shift"
                            >
                              <Receipt className="w-3.5 h-3.5 text-primary" />
                              Transactions
                            </button>

                            {shift.status === "OPEN" && (
                              <button
                                type="button"
                                onClick={() => handleOpenForceCloseShift(shift)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-all border border-amber-500/30 cursor-pointer shadow-xs"
                                title="Close forgotten shift"
                              >
                                <PowerOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                Close Shift
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!shiftsLoading && filteredShifts.length > 0 && (
              <OrdersStyleTablePagination
                itemCount={filteredShifts.length}
                currentPage={shiftPage}
                itemsPerPage={shiftItemsPerPage}
                onPageChange={(page) => setShiftPage(page)}
                onItemsPerPageChange={(val) => {
                  setShiftItemsPerPage(val);
                  setShiftPage(1);
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-card p-4 sm:p-5 rounded-xl border border-border/50 shadow-xs transition-all hover:border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{kpi.label}</span>
                  <kpi.icon className={cn("w-4 h-4", kpi.iconColor)} />
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground font-mono">{kpi.value}</div>
              </div>
            ))}
          </div>

      {/* Sales Performance Chart */}
      <div className="bg-card p-6 rounded-lg shadow-sm border border-border mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Sales Performance</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("daily")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                view === "daily"
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setView("semiannual")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                view === "semiannual"
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Semiannual
            </button>
            <button
              onClick={() => setView("annual")}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                view === "annual"
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Annual
            </button>
          </div>
        </div>
        <div className="h-[300px]">
          {chartLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
              <p className="text-muted-foreground text-sm">Loading sales data...</p>
              </div>
            </div>
          ) : salesStats && salesStats.sales_performance.length > 0 ? (
            view === "daily" ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesStats.sales_performance} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    dy={8}
                    minTickGap={28}
                  />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} domain={[0, "auto"]} tickFormatter={(value) => value < 0 ? `-₱${Math.abs(value).toLocaleString()}` : `₱${value.toLocaleString()}`} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dx={10}
                    allowDecimals={false}
                    domain={[0, "auto"]}
                    tickFormatter={(v) => String(Math.round(Number(v)))}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) =>
                      name === "Revenue"
                        ? [formatPeso(value), name]
                        : [String(Math.round(Number(value))), name]
                    }
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="transactions"
                    name="Transactions"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesStats.sales_performance} barCategoryGap="24%" barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} interval={0} angle={view === "monthly" ? -28 : 0} textAnchor={view === "monthly" ? "end" : "middle"} height={view === "monthly" ? 56 : 32} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} domain={[0, "auto"]} tickFormatter={(value) => value < 0 ? `-₱${Math.abs(value).toLocaleString()}` : `₱${value.toLocaleString()}`} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dx={10}
                    allowDecimals={false}
                    domain={[0, "auto"]}
                    tickFormatter={(v) => String(Math.round(Number(v)))}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) =>
                      name === "Revenue"
                        ? [formatPeso(value), name]
                        : [String(Math.round(Number(value))), name]
                    }
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="transactions"
                    name="Transactions"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/70">
              <div className="text-center">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-foreground">No sales data available</p>
                <p className="text-sm text-muted-foreground mt-1">Start making sales through POS Terminal to see performance</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-border/40">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search invoices, items, or customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
              />
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="px-3 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all"
              >
                <option value="All">All Payment Methods</option>
                <option value="Cash">Cash</option>
                <option value="Cashless">Cashless</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Refunded">Refunded</option>
                <option value="Exchanged">Exchanged</option>
              </select>
              <select
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all"
              >
                <option value="All">All Types</option>
                <option value="Service Only">Service Only</option>
                <option value="Service & Sale">Service & Sale</option>
                <option value="Sales Only">Sales Only</option>
              </select>
              <ProtectedAction module="Sales" action="Export">
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </ProtectedAction>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-border/40">
              <tr>
                <th className="px-6 py-3.5 text-left">
                  {/* Empty spacing */}
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Date
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Customer
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Type
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Items
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Total
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Payment
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-3.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">No sales transactions available</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Create a new sale from the POS terminal to get started</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr key={record.invoice_id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Spacing alignment */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                      {new Date(record.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {record.customer_info}
                      </div>
                      {record.contact_number && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{record.contact_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const type = getTransactionType(record);
                        const isService = type === "Service Only" || type === "Service & Sale";
                        return (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded uppercase tracking-wider">
                            {isService ? <Wrench className="w-2.5 h-2.5" /> : <ShoppingCart className="w-2.5 h-2.5" />}
                            {type}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        {record.items.length} item{record.items.length !== 1 ? "s" : ""}
                      </div>
                      {(() => {
                        const mechanics = Array.from(new Set(record.items.filter(i => i.is_service && i.mechanic_name).map(i => i.mechanic_name)));
                        if (mechanics.length === 0) return null;
                        return (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-500 font-medium mt-0.5 flex items-center gap-1">
                            <Wrench className="w-2.5 h-2.5" />
                            {mechanics.join(", ")}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      ₱{record.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      {record.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-sm text-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          record.payment_status === "Paid" ? "bg-emerald-500" :
                          record.payment_status === "Refunded" ? "bg-red-500 animate-pulse" :
                          record.payment_status === "Exchanged" ? "bg-blue-500" :
                          "bg-amber-500"
                        }`} />
                        {record.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewInvoice(record.invoice_id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all border border-border"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        {record.payment_status !== "Refunded" && record.payment_status !== "Exchanged" && !(record.items && record.items.length > 0 && record.items.every(i => i.is_service)) && (
                          <button
                            onClick={() => handleProcessReturn(record.invoice_id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-all border border-amber-250 dark:border-amber-900/50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <OrdersStyleTablePagination
            itemCount={filteredRecords.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>
      </>
      )}

      <ViewInvoiceModal
        isOpen={!!selectedInvoice && !showReturnReceipt}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        loading={loadingInvoice}
      />

      {returnDetails && (
        <ReturnReceiptModal
          isOpen={showReturnReceipt}
          onClose={() => {
            setShowReturnReceipt(false);
            setReturnDetails(null);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          rmaNumber={returnDetails.rma_number}
          returnType={returnDetails.return_type}
          reason={returnDetails.reason}
          items={returnDetails.items}
          refundAmount={returnDetails.refund_amount}
        />
      )}

      <ProcessReturnModal
        isOpen={!!returnInvoice}
        onClose={() => setReturnInvoice(null)}
        invoice={returnInvoice}
        onSuccess={handleReturnSuccess}
      />

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Sales Transactions"
        filename={`InvenSight_Sales_${new Date().toISOString().split('T')[0]}`}
        data={salesRecords.map(r => ({
          id: r.invoice_id,
          "Invoice": `INV-${String(r.invoice_id).padStart(6, "0")}`,
          "Invoice Date": r.invoice_date, // Field for date filtering
          "Customer": r.customer_info,
          "Total": r.total_amount,
          "Paid Via": r.payment_method,
          "Status": r.payment_status
        }))}
      />

      <ImportSalesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      <ShiftTransactionsModal
        isOpen={!!viewingShiftTransactions}
        onClose={() => setViewingShiftTransactions(null)}
        shift={viewingShiftTransactions}
      />

      {/* EDIT SHIFT NOTES MODAL */}
      <Dialog open={!!editingShiftNotes} onOpenChange={(open) => { if (!open) setEditingShiftNotes(null); }}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col shadow-2xl">
          <DialogHeader className="border-b border-border/50 pb-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Cashier Shift Notes
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Shift #{editingShiftNotes?.shift_id} • {editingShiftNotes?.cashier_name || editingShiftNotes?.username}
                </p>
              </div>
            </div>
          </DialogHeader>

          {editingShiftNotes && (
            <div className="space-y-4 my-1">
              <div className="grid grid-cols-3 gap-2 bg-muted/20 p-3 rounded-xl border border-border/50 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Starting Cash</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    ₱{Number(editingShiftNotes.starting_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Cash Sales</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +₱{Number(editingShiftNotes.cash_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Expected</span>
                  <span className="font-mono font-extrabold text-foreground">
                    ₱{Number(editingShiftNotes.total_expected_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Start Shift Notes */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                    Start Shift
                  </span>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Opening Notes (e.g. Ambag / Cashier Starting Contribution)
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={startNotesDraft}
                  onChange={(e) => setStartNotesDraft(e.target.value)}
                  placeholder="e.g. Cashier contributed ₱500 to initial starting cash fund..."
                  className="w-full text-xs p-2.5 rounded-xl border border-border/60 bg-muted/20 outline-none focus:border-primary text-foreground transition-all leading-relaxed"
                />
              </div>

              {/* End Shift Notes */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300 bg-amber-500/25 px-1.5 py-0.5 rounded">
                    End Shift
                  </span>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Closing Notes & Drawer Discrepancies
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={endNotesDraft}
                  onChange={(e) => setEndNotesDraft(e.target.value)}
                  placeholder="e.g. Turn-over to next shift / Remitted cash to manager / Discrepancy details..."
                  className="w-full text-xs p-2.5 rounded-xl border border-border/60 bg-muted/20 outline-none focus:border-primary text-foreground transition-all leading-relaxed"
                />
              </div>
            </div>
          )}

          <div className="border-t border-border/50 pt-4 mt-3 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditingShiftNotes(null)}
              disabled={savingShiftNotes}
              className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveShiftNotes}
              disabled={savingShiftNotes}
              className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {savingShiftNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Force Close Shift Modal */}
      <Dialog open={!!forceCloseShift} onOpenChange={(open) => !open && setForceCloseShift(null)}>
        <DialogContent className="max-w-md p-6 bg-card border-border/60 rounded-2xl shadow-2xl">
          <DialogHeader className="mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <PowerOff className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Close Cashier Shift
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Manual shift closure for cashiers who forgot to end shift
                </p>
              </div>
            </div>
          </DialogHeader>

          {forceCloseShift && (
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Cashier:</span>
                  <span className="font-bold text-foreground">
                    {forceCloseShift.cashier_name || forceCloseShift.username}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Shift Opened:</span>
                  <span className="font-mono text-foreground">
                    {new Date(forceCloseShift.opened_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                  <span className="text-muted-foreground font-medium">Starting Cash:</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    ₱{Number(forceCloseShift.starting_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Cash Collections:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    +₱{Number(forceCloseShift.cash_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                  <span className="font-bold text-foreground">Total Expected Cash:</span>
                  <span className="font-mono font-extrabold text-foreground text-sm">
                    ₱{Number(forceCloseShift.total_expected_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Actual Cash Count Input */}
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wide mb-1.5">
                  Actual Cash Count (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={forceCloseActualCash}
                    onChange={(e) => setForceCloseActualCash(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold rounded-xl border border-border/60 bg-muted/20 outline-none focus:border-primary text-foreground transition-all"
                    placeholder="0.00"
                  />
                </div>
                {/* Real-time Diff indicator */}
                {(() => {
                  const actual = parseFloat(forceCloseActualCash) || 0;
                  const expected = Number(forceCloseShift.total_expected_cash || 0);
                  const diff = actual - expected;
                  if (Math.abs(diff) < 0.01) {
                    return <p className="text-[11px] font-medium text-muted-foreground mt-1">Exact match with drawer expected amount (₱0.00)</p>;
                  } else if (diff > 0) {
                    return <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">+₱{diff.toLocaleString("en-US", { minimumFractionDigits: 2 })} Over (Excess cash)</p>;
                  } else {
                    return <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">-₱{Math.abs(diff).toLocaleString("en-US", { minimumFractionDigits: 2 })} Short (Missing cash)</p>;
                  }
                })()}
              </div>

              {/* Note Input */}
              <div>
                <label className="block text-[11px] font-bold text-foreground uppercase tracking-wide mb-1.5">
                  Closing Note / Reason
                </label>
                <textarea
                  rows={2}
                  value={forceCloseNote}
                  onChange={(e) => setForceCloseNote(e.target.value)}
                  placeholder="e.g. Cashier forgot to end shift; counted and closed by Admin"
                  className="w-full text-xs p-2.5 rounded-xl border border-border/60 bg-muted/20 outline-none focus:border-primary text-foreground transition-all leading-relaxed"
                />
              </div>
            </div>
          )}

          <div className="border-t border-border/50 pt-4 mt-4 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setForceCloseShift(null)}
              disabled={forceCloseSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg hover:bg-muted text-muted-foreground transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmForceCloseShift}
              disabled={forceCloseSubmitting}
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {forceCloseSubmitting ? "Closing Shift..." : "Confirm & Close Shift"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
