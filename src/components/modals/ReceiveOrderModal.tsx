import React, { useState } from "react";
import { BaseModal } from "./BaseModal";
import { api, type MarkOrderReceivedPayload } from "@/services/api";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, X } from "lucide-react";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types";

interface ReceiveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: PurchaseOrder | null;
}

export function ReceiveOrderModal({
  isOpen,
  onClose,
  onSuccess,
  order,
}: ReceiveOrderModalProps) {
  const [receiptNumber, setReceiptNumber] = useState("");
  const [notes, setNotes] = useState(order?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemDamages, setItemDamages] = useState<Record<number, number>>({});

  if (!order) return null;

  const handleDamageChange = (productId: number, val: string, max: number) => {
    const num = parseInt(val) || 0;
    if (num < 0) return;
    if (num > max) {
      toast.error(`Damage count cannot exceed ordered quantity (${max})`);
      return;
    }
    setItemDamages((prev) => ({ ...prev, [productId]: num }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumber.trim()) {
      toast.error("Receipt number is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: MarkOrderReceivedPayload = {
        receipt_number: receiptNumber,
        notes: notes,
        items: (order.items || []).map((item) => ({
          product_id: item.product_id,
          damage_count: itemDamages[item.product_id] || 0,
        })),
      };

      await api.markOrderAsReceived(order.order_id, payload);
      toast.success("Order marked as received and stock updated");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to receive order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Receive Purchase Order">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-primary/10 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold">Receiving Order {order.order_id}</p>
            <p>Please enter the supplier's receipt number and report any damaged items found during delivery.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1">
              Receipt Number *
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-card dark:bg-gray-700 text-foreground text-foreground outline-none"
              placeholder="Enter receipt/invoice number..."
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground dark:text-gray-300 mb-2">
            Items and Damage Count
          </label>
          <div className="border border-border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 bg-card">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Product</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Ordered</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase w-32">Damage Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-gray-700">
                {(order.items || []).map((item) => (
                  <tr key={item.product_id}>
                    <td className="px-4 py-3 text-foreground text-foreground font-medium">{item.product_name}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground dark:text-muted-foreground/70">{item.quantity}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        className="w-full px-2 py-1 border border-border dark:border-gray-600 rounded focus:ring-1 focus:ring-red-500 text-right bg-card dark:bg-gray-700 text-foreground text-foreground"
                        value={itemDamages[item.product_id] || 0}
                        onChange={(e) => handleDamageChange(item.product_id, e.target.value, item.quantity)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-card dark:bg-gray-700 text-foreground text-foreground outline-none"
            rows={3}
            placeholder="Add any specific observations about the delivery..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-border dark:border-gray-600 text-muted-foreground dark:text-gray-300 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirm Receipt
              </>
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
