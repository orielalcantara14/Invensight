import React, { useState, useEffect } from "react";
import { api, type MarkOrderReceivedPayload } from "@/services/api";
import { toast } from "sonner";
import { CheckCircle2, PackageCheck, PackageX, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types";

interface ReceiveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: PurchaseOrder | null;
  initialNotReceivedMode?: boolean;
}

const COMMON_REASONS = [
  "Supplier out of stock",
  "Order cancelled by supplier",
  "Courier delivery failed / lost",
  "Wrong items delivered (rejected)",
  "Supplier unresponsive",
];

export function ReceiveOrderModal({
  isOpen,
  onClose,
  onSuccess,
  order,
  initialNotReceivedMode = false,
}: ReceiveOrderModalProps) {
  const [receiptNumber, setReceiptNumber] = useState("");
  const [notes, setNotes] = useState(order?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isNotReceivedSuccess, setIsNotReceivedSuccess] = useState(false);
  const [isNotReceivedMode, setIsNotReceivedMode] = useState(initialNotReceivedMode);
  const [notReceivedReason, setNotReceivedReason] = useState("");
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});
  const [itemDamages, setItemDamages] = useState<Record<number, number>>({});

  useEffect(() => {
    if (isOpen && order) {
      setReceiptNumber("");
      setNotes(order.notes || "");
      setIsSuccess(false);
      setIsNotReceivedSuccess(false);
      setIsSubmitting(false);
      setIsNotReceivedMode(!!initialNotReceivedMode);
      setNotReceivedReason("");

      const initialReceived: Record<number, number> = {};
      const initialDamages: Record<number, number> = {};

      (order.items || []).forEach((item) => {
        initialReceived[item.product_id] = item.quantity;
        initialDamages[item.product_id] = 0;
      });

      setReceivedQtys(initialReceived);
      setItemDamages(initialDamages);
    }
  }, [isOpen, order?.order_id]);

  if (!isOpen || !order) return null;

  const handleReceivedQtyChange = (productId: number, val: string) => {
    const num = parseInt(val) || 0;
    if (num < 0) return;
    setReceivedQtys((prev) => ({ ...prev, [productId]: num }));
  };

  const handleDamageChange = (productId: number, val: string, maxBaseUnits: number) => {
    const num = parseInt(val) || 0;
    if (num < 0) return;
    if (num > maxBaseUnits) {
      toast.error(`Damage count cannot exceed total stock units (${maxBaseUnits})`);
      return;
    }
    setItemDamages((prev) => ({ ...prev, [productId]: num }));
  };

  const getItemConversionRate = (item: PurchaseOrderItem) => {
    if (item.conversion_rate && item.conversion_rate > 0) {
      return item.conversion_rate;
    }
    if (item.conversion) {
      const match = item.conversion.match(/(\d+)/);
      if (match) return parseInt(match[1]) || 1;
    }
    return (item.purchase_unit || "").toUpperCase() === "BOX" ? 10 : 1;
  };

  const totalInventoryToAdd = (order.items || []).reduce((sum, item) => {
    const recv = receivedQtys[item.product_id] !== undefined ? receivedQtys[item.product_id] : item.quantity;
    const rate = getItemConversionRate(item);
    const dmg = itemDamages[item.product_id] || 0;
    const net = Math.max(0, (recv * rate) - dmg);
    return sum + net;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumber.trim()) {
      toast.error("Receipt number is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: MarkOrderReceivedPayload = {
        receipt_number: receiptNumber.trim(),
        notes: notes.trim() || undefined,
        items: (order.items || []).map((item) => ({
          product_id: item.product_id,
          received_quantity: receivedQtys[item.product_id] !== undefined ? receivedQtys[item.product_id] : item.quantity,
          damage_count: itemDamages[item.product_id] || 0,
          damage_unit: item.unit_of_measurement || "PCS",
        })),
      };

      await api.markOrderAsReceived(order.order_id, payload);
      setIsSuccess(true);
      toast.success("Order marked as received and stock updated");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (error: any) {
      toast.error(error.message || "Failed to receive order");
      setIsSubmitting(false);
    }
  };

  const handleNotReceivedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notReceivedReason.trim()) {
      toast.error("Please provide a note or reason why this order was not received");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.markOrderAsNotReceived(order.order_id, {
        notes: notReceivedReason.trim(),
      });
      setIsNotReceivedSuccess(true);
      toast.success("Purchase order marked as Not Received");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (error: any) {
      toast.error(error.message || "Failed to update order status");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
      <div className="bg-card rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 border border-border/40">
        {/* SUCCESS SCREENS */}
        {isSuccess ? (
          <div className="p-12 text-center flex flex-col items-center justify-center my-auto">
            <div className="w-24 h-24 bg-green-50 dark:bg-green-950/40 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-3xl font-black text-foreground mb-3 tracking-tight">Order Received!</h2>
            <p className="text-muted-foreground font-medium text-sm max-w-xs">
              Inventory has been successfully updated with the received delivery stock.
            </p>
          </div>
        ) : isNotReceivedSuccess ? (
          <div className="p-12 text-center flex flex-col items-center justify-center my-auto">
            <div className="w-24 h-24 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <PackageX className="w-12 h-12 text-rose-500" />
            </div>
            <h2 className="text-3xl font-black text-foreground mb-3 tracking-tight">Marked as Not Received</h2>
            <p className="text-muted-foreground font-medium text-sm max-w-xs">
              The order status has been updated to Not Received and the delivery notice cleared.
            </p>
          </div>
        ) : isNotReceivedMode ? (
          /* DID NOT RECEIVE MODE FORM */
          <form onSubmit={handleNotReceivedSubmit} className="flex flex-col h-full overflow-hidden">
            <div className="p-4 sm:p-8 pb-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-[1.5rem] flex items-center justify-center shadow-inner shrink-0">
                  <PackageX className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Did Not Receive Delivery</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                    <p className="text-[10px] font-black text-muted-foreground/80 uppercase tracking-widest">
                      {order.order_id} • {order.supplier_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Alert notice */}
              <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-rose-900 dark:text-rose-200 leading-relaxed">
                  Marking this purchase order as <strong>Not Received</strong> will clear it from the delivery notices. No inventory will be modified.
                </p>
              </div>

              {/* Quick suggestions */}
              <div>
                <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-2">
                  Quick Reason Selection
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setNotReceivedReason(reason)}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        notReceivedReason === reason
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/80 border-border/60"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Note / Reason */}
              <div>
                <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-2">
                  Reason / User Note *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain why this delivery was not received from the supplier..."
                  value={notReceivedReason}
                  onChange={(e) => setNotReceivedReason(e.target.value)}
                  className="w-full bg-card border border-border p-4 rounded-2xl font-medium text-foreground text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  This explanation will be logged in the audit trail and displayed on the purchase order record.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-muted/30 flex items-center justify-between gap-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setIsNotReceivedMode(false)}
                className="px-4 py-3 rounded-2xl font-bold text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Receive
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-2xl font-black text-xs text-muted-foreground/80 uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !notReceivedReason.trim()}
                  className="px-7 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PackageX className="w-4 h-4" />
                  )}
                  {isSubmitting ? "Updating..." : "Confirm Not Received"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* STANDARD RECEIVE ORDER FORM */
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            {/* Modal Body with smooth scrolling */}
            <div className="p-4 sm:p-8 pb-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-[1.5rem] flex items-center justify-center shadow-inner shrink-0">
                  <PackageCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Receive Order</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <p className="text-[10px] font-black text-muted-foreground/80 uppercase tracking-widest">
                      {order.order_id} • {order.supplier_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Receipt Number Input */}
              <div>
                <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-2.5">
                  Receipt Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter invoice/receipt number..."
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full bg-card border border-border p-4 rounded-2xl font-bold text-foreground text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Order Items Cards */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
                  Items & Delivery Inspection
                </label>

                <div className="space-y-3">
                  {(order.items || []).map((item) => {
                    const rate = getItemConversionRate(item);
                    const currentRecv = receivedQtys[item.product_id] !== undefined ? receivedQtys[item.product_id] : item.quantity;
                    const maxBaseUnits = currentRecv * rate;
                    const unitLabel = item.purchase_unit || "BOX";
                    const packSizeLabel = item.conversion || `${rate} PCS / ${unitLabel}`;

                    return (
                      <div
                        key={item.product_id}
                        className="bg-muted/40 border border-border/60 p-4 rounded-3xl space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-black text-foreground text-sm leading-snug">
                              {item.product_name}
                            </h4>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                              Pack Size: <span className="font-mono text-foreground font-bold">{packSizeLabel}</span>
                            </p>
                          </div>
                          <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs rounded-xl shrink-0">
                            {item.quantity} {unitLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
                          <div>
                            <span className="block text-[9px] font-black text-muted-foreground/70 uppercase tracking-wider mb-1">
                              Received ({unitLabel})
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={currentRecv}
                              onChange={(e) => handleReceivedQtyChange(item.product_id, e.target.value)}
                              className="w-full bg-card border border-border py-2.5 px-3 rounded-2xl font-black text-foreground font-mono text-center text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <span className="block text-[9px] font-black text-red-500/80 uppercase tracking-wider mb-1">
                              Damage (PCS)
                            </span>
                            <input
                              type="number"
                              min="0"
                              max={maxBaseUnits}
                              value={itemDamages[item.product_id] || 0}
                              onChange={(e) => handleDamageChange(item.product_id, e.target.value, maxBaseUnits)}
                              className="w-full bg-card border border-border py-2.5 px-3 rounded-2xl font-black text-red-500 font-mono text-center text-sm focus:ring-2 focus:ring-red-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Inventory to Add banner */}
              <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 p-4 rounded-3xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="block text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
                    Inventory to Add
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Auto-converted stock pieces
                  </span>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {totalInventoryToAdd} PCS
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.2em] mb-2">
                  Delivery Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-card border border-border p-3.5 rounded-2xl font-medium text-foreground text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-muted/30 flex items-center justify-between gap-3 border-t border-border/40">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3.5 rounded-2xl font-black text-xs text-muted-foreground/80 uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2.5">
                {/* Did Not Receive Button */}
                <button
                  type="button"
                  onClick={() => setIsNotReceivedMode(true)}
                  className="px-5 py-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider border border-rose-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  title="Mark this delivery as not received"
                >
                  <PackageX className="w-4 h-4" />
                  Did Not Receive
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PackageCheck className="w-4 h-4" />
                  )}
                  {isSubmitting ? "Processing..." : "Confirm Receipt"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
