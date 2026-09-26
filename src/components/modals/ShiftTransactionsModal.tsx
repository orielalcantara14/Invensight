import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type ShiftTransactionsResponse, type ShiftTransaction, type PosShift } from "@/services/api";
import type { SaleDetail } from "@/types";
import { 
  Receipt, 
  Search, 
  Eye, 
  Banknote, 
  PhilippinePeso, 
  CreditCard, 
  Clock, 
  User, 
  FileText, 
  X,
  Printer,
  ShoppingBag,
  ArrowLeft,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { printHtmlContent, printElementById } from "@/utils/print";
import { toast } from "sonner";

interface ShiftTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: PosShift | null;
}

export function ShiftTransactionsModal({
  isOpen,
  onClose,
  shift,
}: ShiftTransactionsModalProps) {
  const [data, setData] = useState<ShiftTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");

  const [selectedInvoice, setSelectedInvoice] = useState<SaleDetail | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<number | null>(null);

  const handleOpenInvoice = async (invoiceId: number) => {
    setLoadingInvoiceId(invoiceId);
    try {
      const detail = await api.getSale(invoiceId);
      setSelectedInvoice(detail);
    } catch (err) {
      console.error("Failed to load invoice receipt", err);
      toast.error("Failed to load invoice receipt");
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedInvoice) return;
    printElementById(
      "shift-invoice-printable-content",
      `Invoice #${String(selectedInvoice.invoice_id).padStart(6, "0")}`
    );
  };

  useEffect(() => {
    if (isOpen && shift) {
      setLoading(true);
      api.getShiftTransactions(shift.shift_id)
        .then((res) => {
          setData(res);
        })
        .catch((err) => {
          console.error("Failed to load shift transactions", err);
          toast.error("Failed to load shift transactions");
        })
        .finally(() => setLoading(false));
    } else {
      setData(null);
      setSearchTerm("");
      setPaymentFilter("All");
      setSelectedInvoice(null);
      setLoadingInvoiceId(null);
    }
  }, [isOpen, shift]);

  const activeShift = data?.shift || shift;

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    return data.transactions.filter((tx) => {
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const invNum = `INV-${String(tx.invoice_id).padStart(5, "0")}`.toLowerCase();
        const cust = (tx.customer_info || "").toLowerCase();
        const contact = (tx.contact_number || "").toLowerCase();
        const hasItemMatch = tx.items.some(i => i.product_name.toLowerCase().includes(term));
        if (!invNum.includes(term) && !cust.includes(term) && !contact.includes(term) && !hasItemMatch) {
          return false;
        }
      }

      if (paymentFilter !== "All") {
        if (paymentFilter === "Cash" && tx.payment_method.toLowerCase() !== "cash") return false;
        if (paymentFilter === "Cashless" && tx.payment_method.toLowerCase() === "cash") return false;
      }

      return true;
    });
  }, [data, searchTerm, paymentFilter]);

  const discrepancy = useMemo(() => {
    if (!activeShift || activeShift.ending_cash === null || activeShift.ending_cash === undefined) return null;
    return Number(activeShift.ending_cash) - Number(activeShift.total_expected_cash || 0);
  }, [activeShift]);

  const handlePrintAudit = () => {
    if (!data || !activeShift) return;

    const rowsHtml = (data.transactions || []).map((t) => {
      const itemsList = t.items.map(i => `${i.quantity}x ${i.product_name}`).join(", ");
      return `
        <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
          <td style="padding: 6px 8px; font-family: monospace; font-weight: bold;">INV-${String(t.invoice_id).padStart(5, "0")}</td>
          <td style="padding: 6px 8px;">${new Date(t.transaction_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td style="padding: 6px 8px;">${t.customer_info || "Walk-in"}</td>
          <td style="padding: 6px 8px; color: #4b5563;">${itemsList || "—"}</td>
          <td style="padding: 6px 8px; text-align: center;"><span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${t.payment_method}</span></td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-family: monospace;">₱${Number(t.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join("");

    const printContent = `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #111827;">
        <div style="border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase;">CASHIER SHIFT AUDIT REPORT</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Shift #${activeShift.shift_id} • Cashier: <strong>${activeShift.cashier_name || activeShift.username}</strong></p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 16px; font-size: 11px;">
          <div><span style="color: #6b7280; display: block; font-size: 9px; text-transform: uppercase;">Shift Opened:</span><strong>${new Date(activeShift.opened_at).toLocaleString()}</strong></div>
          <div><span style="color: #6b7280; display: block; font-size: 9px; text-transform: uppercase;">Shift Closed:</span><strong>${activeShift.closed_at ? new Date(activeShift.closed_at).toLocaleString() : 'STILL OPEN'}</strong></div>
          <div><span style="color: #6b7280; display: block; font-size: 9px; text-transform: uppercase;">Starting Cash:</span><strong>₱${Number(activeShift.starting_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>
          <div><span style="color: #6b7280; display: block; font-size: 9px; text-transform: uppercase;">Total Expected:</span><strong>₱${Number(activeShift.total_expected_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>
          <div><span style="color: #6b7280; display: block; font-size: 9px; text-transform: uppercase;">Cash Sales:</span><strong>₱${Number(data.summary?.cash_sales || activeShift.cash_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>
          <div><span style="color: #6b7280; display: block; font-size: 9px; text-transform: uppercase;">Cashless Sales:</span><strong>₱${Number(data.summary?.cashless_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>
          <div><span style="color: #6b7280; display: block; font-size: 9px; text-transform: uppercase;">Actual Cash Count:</span><strong>${activeShift.ending_cash !== null && activeShift.ending_cash !== undefined ? `₱${Number(activeShift.ending_cash).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : '—'}</strong></div>
          <div><span style="color: #6b7280; display: block; font-size: 9px; text-transform: uppercase;">Discrepancy:</span><strong>${discrepancy !== null ? (discrepancy >= 0 ? `+₱${discrepancy.toFixed(2)} Over` : `-₱${Math.abs(discrepancy).toFixed(2)} Short`) : '—'}</strong></div>
        </div>

        ${activeShift.start_notes || activeShift.end_notes ? `
          <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 10px; border-radius: 6px; margin-bottom: 16px; font-size: 11px;">
            ${activeShift.start_notes ? `<div><strong>Start Notes:</strong> ${activeShift.start_notes}</div>` : ''}
            ${activeShift.end_notes ? `<div style="margin-top: 4px;"><strong>End Notes:</strong> ${activeShift.end_notes}</div>` : ''}
          </div>
        ` : ''}

        <h3 style="font-size: 13px; font-weight: bold; text-transform: uppercase; margin: 16px 0 8px 0;">Shift Sales Transactions (${data.transactions.length})</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 10px; text-transform: uppercase;">
              <th style="padding: 6px 8px;">Invoice #</th>
              <th style="padding: 6px 8px;">Time</th>
              <th style="padding: 6px 8px;">Customer</th>
              <th style="padding: 6px 8px;">Items Sold</th>
              <th style="padding: 6px 8px; text-align: center;">Payment</th>
              <th style="padding: 6px 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 16px; color: #9ca3af;">No transactions during this shift</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    printHtmlContent(
      printContent,
      `Shift_Audit_#${activeShift.shift_id}_${activeShift.cashier_name || 'Cashier'}`
    );
  };

  if (!isOpen || !shift) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl w-full p-0 rounded-2xl border border-border/60 bg-card text-foreground flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* ================= IF VIEWING AN INVOICE RECEIPT ================= */}
        {selectedInvoice ? (
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            {/* Invoice Top Navigation Header */}
            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background hover:bg-muted text-xs font-semibold text-foreground border border-border shadow-xs transition-all cursor-pointer"
                  title="Return to Shift Transactions"
                >
                  <ArrowLeft className="w-4 h-4 text-primary" />
                  <span>Back to Transactions</span>
                </button>
                <div className="h-4 w-px bg-border/60" />
                <h2 className="text-base font-bold text-foreground font-mono">
                  Invoice #{String(selectedInvoice.invoice_id).padStart(6, "0")}
                </h2>
                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  selectedInvoice.payment_status === "Paid" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                  selectedInvoice.payment_status === "Refunded" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}>
                  {selectedInvoice.payment_status}
                </span>
              </div>

              {/* Reserved spacing so it doesn't collide with Dialog close X */}
              <div className="w-8" />
            </div>

            {/* Printable Receipt Body */}
            <div id="shift-invoice-printable-content" className="p-6 overflow-y-auto flex-1 bg-card text-foreground custom-scrollbar">
              {/* Shop Branding Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black tracking-tighter text-foreground mb-1">JonBrix</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Motorcycle Parts & Accessories</p>
                <div className="w-full border-b border-dashed border-border my-4" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 bg-muted/10 p-4 rounded-xl border border-border/40 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Date</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Customer</p>
                  <p className="font-semibold text-foreground mt-0.5 break-words">
                    {selectedInvoice.customer_info || "Walk In customer"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Payment Method</p>
                  <p className="font-semibold text-foreground mt-0.5">{selectedInvoice.payment_method}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Cashier</p>
                  <p className="font-semibold text-foreground mt-0.5 break-words">
                    {selectedInvoice.cashier_name || activeShift?.cashier_name || activeShift?.username || "Cashier"}
                  </p>
                </div>
              </div>

              {/* Transaction Type Indicator (Service / Sale) */}
              {(() => {
                const hasService = selectedInvoice.items.some(i => i.is_service);
                const hasProduct = selectedInvoice.items.some(i => !i.is_service);
                const type = hasService && hasProduct ? "Service & Sale" : hasService ? "Service Only" : "Sales Only";
                const mechanics = Array.from(new Set(selectedInvoice.items.filter(i => i.is_service && i.mechanic_name).map(i => i.mechanic_name)));
                if (!hasService) return null;
                return (
                  <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <Wrench className="w-3.5 h-3.5" />
                      {type}
                    </div>
                    {mechanics.length > 0 && (
                      <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">
                        Mechanic: {mechanics.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="border border-border/50 rounded-xl overflow-hidden mb-4 bg-card shadow-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-b border-border/40">
                    <tr>
                      <th className="px-4 py-2.5">Product</th>
                      <th className="px-4 py-2.5 text-right w-20">Qty</th>
                      <th className="px-4 py-2.5 text-right w-28">Price</th>
                      <th className="px-4 py-2.5 text-right w-32">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-xs">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-foreground">{item.product_name}</div>
                          {item.is_service && item.mechanic_name && (
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-0.5 flex items-center gap-1">
                              <Wrench className="w-2.5 h-2.5" />
                              Mechanic: {item.mechanic_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono">₱{Number(item.unit_price).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">₱{Number(item.subtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border/60 bg-muted/20 text-xs">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-muted-foreground font-medium">Subtotal</td>
                      <td className="px-4 py-2 text-right font-mono text-foreground font-semibold">
                        ₱{(selectedInvoice.total_amount - selectedInvoice.tax_amount - selectedInvoice.service_charge).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-1.5 text-right text-muted-foreground font-medium">Tax (3%)</td>
                      <td className="px-4 py-1.5 text-right font-mono text-foreground">
                        ₱{Number(selectedInvoice.tax_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    {selectedInvoice.service_charge > 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-1.5 text-right text-muted-foreground font-medium">Service Charge</td>
                        <td className="px-4 py-1.5 text-right font-mono text-foreground">
                          ₱{Number(selectedInvoice.service_charge).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-border/40 font-bold bg-muted/40">
                      <td colSpan={3} className="px-4 py-2.5 text-right text-foreground text-sm font-extrabold uppercase">Total Amount</td>
                      <td className="px-4 py-2.5 text-right font-mono text-primary text-base font-extrabold">
                        ₱{Number(selectedInvoice.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-1.5 text-right text-muted-foreground font-medium">Cash Given</td>
                      <td className="px-4 py-1.5 text-right font-mono text-foreground">
                        ₱{Number(selectedInvoice.cash_given).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-muted-foreground font-medium">Change</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-foreground">
                        ₱{Number(selectedInvoice.change_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="px-6 py-3.5 border-t border-border/50 bg-muted/20 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Official Receipt for <strong className="text-foreground">{selectedInvoice.customer_info || "Walk In customer"}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Invoice
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-background hover:bg-muted text-muted-foreground border border-border transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= MAIN SHIFT TRANSACTIONS VIEW ================= */
          <>
            {/* Header */}
            <div className="p-6 border-b border-border/50 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-xl font-bold text-foreground">
                        Cashier Shift Transactions
                      </DialogTitle>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                        activeShift?.status === "OPEN"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse"
                          : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                      }`}>
                        {activeShift?.status || "CLOSED"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <User className="w-3 h-3 text-primary" />
                        {activeShift?.cashier_name || activeShift?.username}
                      </span>
                      <span>•</span>
                      <span>Shift #{activeShift?.shift_id}</span>
                      <span>•</span>
                      <span className="font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                        {" → "}
                        {activeShift.closed_at
                          ? new Date(activeShift.closed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })
                          : "Present (Active)"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pr-6">
                  <button
                    type="button"
                    onClick={handlePrintAudit}
                    disabled={loading || !data}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    title="Print Shift Audit"
                  >
                    <Printer className="w-4 h-4 text-zinc-300" />
                    <span>Print Shift Audit</span>
                  </button>
                </div>
              </div>

              {/* Quick Shift Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/40 text-xs">
                <div className="bg-background/80 p-3 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Starting Cash</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                    ₱{Number(activeShift.starting_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-background/80 p-3 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Cash Sales Collected</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    +₱{Number(data?.summary?.cash_sales ?? activeShift.cash_sales ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-background/80 p-3 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expected Cash in Drawer</span>
                  <span className="font-mono font-extrabold text-foreground text-sm">
                    ₱{Number(activeShift.total_expected_cash || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-background/80 p-3 rounded-xl border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Actual Count & Variance</span>
                  {activeShift.ending_cash !== null && activeShift.ending_cash !== undefined ? (
                    <div>
                      <span className="font-mono font-bold text-foreground text-sm">
                        ₱{Number(activeShift.ending_cash).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                      {discrepancy !== null && (
                        Math.abs(discrepancy) < 0.01 ? (
                          <span className="text-[10px] font-bold text-muted-foreground block">Exact (₱0.00)</span>
                        ) : discrepancy > 0 ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">+₱{discrepancy.toLocaleString("en-US", { minimumFractionDigits: 2 })} Over</span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block">-₱{Math.abs(discrepancy).toLocaleString("en-US", { minimumFractionDigits: 2 })} Short</span>
                        )
                      )}
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-muted-foreground text-sm italic">Shift in progress...</span>
                  )}
                </div>
              </div>

              {/* Shift Notes Banner */}
              {(activeShift.start_notes || activeShift.end_notes || activeShift.notes) && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {activeShift.start_notes && (
                        <p className="text-amber-950 dark:text-amber-200">
                          <strong className="text-emerald-700 dark:text-emerald-400">Opening Note:</strong> {activeShift.start_notes}
                        </p>
                      )}
                      {activeShift.end_notes && (
                        <p className="text-amber-950 dark:text-amber-200">
                          <strong className="text-amber-700 dark:text-amber-400">Closing Note:</strong> {activeShift.end_notes}
                        </p>
                      )}
                      {!activeShift.start_notes && !activeShift.end_notes && activeShift.notes && (
                        <p className="text-amber-950 dark:text-amber-200">
                          <strong>Note:</strong> {activeShift.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Controls & Summary */}
            <div className="p-4 border-b border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/10">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search invoice, customer, item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border/60 rounded-lg outline-none focus:border-primary text-foreground transition-all placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-background border border-border/60 rounded-lg outline-none focus:border-primary text-foreground transition-all cursor-pointer"
                >
                  <option value="All">All Payment Methods</option>
                  <option value="Cash">Cash Only</option>
                  <option value="Cashless">Cashless Only</option>
                </select>
                <span className="text-xs font-semibold text-muted-foreground font-mono">
                  {filteredTransactions.length} {filteredTransactions.length === 1 ? 'sale' : 'sales'}
                </span>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              {loading ? (
                <div className="py-16 text-center text-muted-foreground text-xs italic">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading cashier transactions...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-sm text-foreground">No transactions found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {searchTerm || paymentFilter !== "All" ? "Try adjusting your search filter" : "No sales were recorded during this shift timeframe"}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-muted/40 backdrop-blur-xs border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items Sold</th>
                      <th className="px-4 py-3 text-center">Payment</th>
                      <th className="px-4 py-3 text-right">Total Amount</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-xs">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.invoice_id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3 font-mono font-bold text-foreground whitespace-nowrap">
                          INV-{String(tx.invoice_id).padStart(5, "0")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(tx.transaction_timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-foreground block">{tx.customer_info || "Walk-in Customer"}</span>
                          {tx.contact_number && <span className="text-[10px] text-muted-foreground font-mono">{tx.contact_number}</span>}
                        </td>
                        <td className="px-4 py-3 max-w-[240px]">
                          <div className="truncate text-muted-foreground text-[11px]" title={tx.items.map(i => `${i.quantity}x ${i.product_name}`).join(", ")}>
                            {tx.items.length > 0 ? (
                              tx.items.map((i, idx) => (
                                <span key={idx} className="inline-block mr-1.5">
                                  <span className="font-semibold text-foreground">{i.quantity}x</span> {i.product_name}
                                  {idx < tx.items.length - 1 ? "," : ""}
                                </span>
                              ))
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.payment_method.toLowerCase() === "cash"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          }`}>
                            {tx.payment_method.toLowerCase() === "cash" ? <Banknote className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
                            {tx.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          ₱{Number(tx.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenInvoice(tx.invoice_id)}
                            disabled={loadingInvoiceId === tx.invoice_id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer border border-primary/20 disabled:opacity-50"
                            title="View Full Invoice Receipt"
                          >
                            {loadingInvoiceId === tx.invoice_id ? (
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>
                  Total Sales: <strong className="text-foreground font-mono font-bold">₱{Number(data?.summary?.total_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                </span>
                <span>
                  Cash: <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">₱{Number(data?.summary?.cash_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                </span>
                <span>
                  Cashless: <strong className="text-purple-600 dark:text-purple-400 font-mono font-bold">₱{Number(data?.summary?.cashless_sales || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
