import { X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import type { SaleDetail } from "@/types";
import { api, CreateCustomerReturnPayload } from "@/services/api";
import { toast } from "sonner";
import { ReturnReceiptModal } from "./ReturnReceiptModal";

interface ProcessReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SaleDetail | null;
  onSuccess: () => void;
}

export function ProcessReturnModal({ isOpen, onClose, invoice, onSuccess }: ProcessReturnModalProps) {
  const [returnType, setReturnType] = useState<"Refund" | "Exchange">("Refund");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    selected: boolean;
    is_defective: boolean;
    is_damaged: boolean;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [rmaNumber, setRmaNumber] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (invoice) {
        // By default, select all items but allow unselecting
      setItems(invoice.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        selected: true,
        is_defective: false,
        is_damaged: false,
      })));
      setReturnType("Refund");
      setReason("");
    }
  }, [invoice]);

  const handleSubmit = async () => {
    if (!invoice) return;
    const selectedItems = items.filter(i => i.selected);
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateCustomerReturnPayload = {
        sale_id: invoice.invoice_id,
        return_type: returnType,
        reason,
        items: selectedItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          is_defective: i.is_defective,
          is_damaged: i.is_damaged,
        }))
      };

      const res = await api.createCustomerReturn(payload);
      toast.success(`Product return processed as ${returnType}`);
      setRmaNumber(res.rma_number);
      onSuccess();
      setShowReceipt(true);
      // We don't call onClose() yet, we wait for receipt to be closed or we handle it in render

    } catch (error: any) {
      toast.error(error.message || "Failed to process return");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !invoice) return null;

  if (showReceipt && rmaNumber) {
    return (
      <ReturnReceiptModal
        isOpen={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          onClose();
        }}
        invoice={invoice}
        rmaNumber={rmaNumber}
        returnType={returnType}
        reason={reason}
        items={items.filter(i => i.selected)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* ... existing modal structure ... */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-border flex items-center justify-between bg-card sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-foreground">Process Product Return</h2>
            <p className="text-sm text-muted-foreground mt-1">Invoice #{String(invoice.invoice_id).padStart(6, "0")}</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground/70 hover:text-muted-foreground rounded-full hover:bg-muted transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Items Section */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Select Items to Return</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Product</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Defective</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Damage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <tr key={idx} className={item.selected ? "bg-primary/10/30" : "opacity-50"}>
                      <td className="px-4 py-3 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].selected = e.target.checked;
                            setItems(newItems);
                          }}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="font-medium text-foreground">{item.product_name}</p>
                          <p className="text-[11px] text-muted-foreground">QTY: {item.quantity}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.is_defective}
                          disabled={!item.selected}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].is_defective = e.target.checked;
                            setItems(newItems);
                          }}
                          className="w-4 h-4 rounded border-border text-red-600 focus:ring-red-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.is_damaged}
                          disabled={!item.selected}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].is_damaged = e.target.checked;
                            setItems(newItems);
                          }}
                          className="w-4 h-4 rounded border-border text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Type */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setReturnType("Exchange")}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                returnType === "Exchange" 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-border bg-card"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                returnType === "Exchange" ? "bg-primary text-white" : "bg-muted text-muted-foreground/70"
              }`}>
                <Check className="w-6 h-6" />
              </div>
              <span className={`font-semibold ${returnType === "Exchange" ? "text-blue-900" : "text-muted-foreground"}`}>Exchange</span>
              <span className="text-[10px] text-center text-muted-foreground mt-1">Replace with new product</span>
            </button>

            <button
              onClick={() => setReturnType("Refund")}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                returnType === "Refund" 
                ? "border-primary bg-primary/10" 
                : "border-border hover:border-border bg-card"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                returnType === "Refund" ? "bg-primary text-white" : "bg-muted text-muted-foreground/70"
              }`}>
                <Check className="w-6 h-6" />
              </div>
              <span className={`font-semibold ${returnType === "Refund" ? "text-blue-900" : "text-muted-foreground"}`}>Cash Refund</span>
              <span className="text-[10px] text-center text-muted-foreground mt-1">Refund original payment</span>
            </button>
          </div>

          {/* Reason Section */}
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Return Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a detailed reason for the return..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm"
            />
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-muted-foreground font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            {returnType === "Refund" ? "Refund" : "Process Exchange"}
          </button>
        </div>
      </div>
    </div>
  );
}
