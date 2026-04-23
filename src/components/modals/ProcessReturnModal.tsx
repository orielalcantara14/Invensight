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
    unit_price: number;
    max_quantity: number;
    returns: Array<{
        quantity: number;
        status: "Good" | "Defective" | "Damaged";
    }>;
    selected: boolean;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [rmaNumber, setRmaNumber] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);

  useEffect(() => {
    if (invoice) {
      setItems(invoice.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: item.unit_price,
        max_quantity: item.quantity,
        returns: [{ quantity: item.quantity, status: "Good" }],
        selected: true,
      })));
      setReturnType("Refund");
      setReason("");
    }
  }, [invoice]);

  useEffect(() => {
    if (returnType === "Refund") {
      const total = items.reduce((acc, item) => {
        if (!item.selected) return acc;
        const itemTotal = item.returns.reduce((sum, r) => sum + r.quantity, 0);
        return acc + (item.unit_price * itemTotal);
      }, 0);
      setRefundAmount(total);
    } else {
      setRefundAmount(0);
    }
  }, [items, returnType]);

  const handleSubmit = async () => {
    if (!invoice) return;
    
    const selectedItems = items.filter(i => i.selected);
    const returnItems: any[] = [];

    for (const item of selectedItems) {
      const totalReturn = item.returns.reduce((sum, r) => sum + r.quantity, 0);
      if (totalReturn === 0) continue;
      if (totalReturn > item.max_quantity) {
        toast.error(`Total return for ${item.product_name} (${totalReturn}) exceeds purchased quantity (${item.max_quantity})`);
        return;
      }

      for (const ret of item.returns) {
        if (ret.quantity <= 0) continue;
        returnItems.push({
          product_id: item.product_id,
          quantity: ret.quantity,
          is_defective: ret.status === "Defective",
          is_damaged: ret.status === "Damaged",
        });
      }
    }

    if (returnItems.length === 0) {
      toast.error("Please specify quantities to return");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateCustomerReturnPayload = {
        sale_id: invoice.invoice_id,
        return_type: returnType,
        reason,
        items: returnItems
      };

      const res = await api.createCustomerReturn(payload);
      toast.success(`Product return processed as ${returnType}`);
      setRmaNumber(res.rma_number);
      onSuccess();
      setShowReceipt(true);

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
        items={items.filter(i => i.selected).flatMap(item => 
          item.returns.map(ret => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: ret.quantity,
            is_defective: ret.status === "Defective",
            is_damaged: ret.status === "Damaged"
          }))
        )}
        refundAmount={refundAmount}
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
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider px-1">Return Configuration</h3>
            <div className="space-y-4">
              {items.map((item, idx) => {
                const totalReturnQty = item.returns.reduce((sum, r) => sum + r.quantity, 0);
                const isOver = totalReturnQty > item.max_quantity;

                return (
                  <div key={idx} className={`border rounded-2xl p-4 transition-all ${
                    item.selected ? "bg-card border-border shadow-sm" : "bg-muted/30 border-dashed border-border opacity-60"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].selected = e.target.checked;
                            setItems(newItems);
                          }}
                          className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="font-bold text-foreground text-sm leading-tight">{item.product_name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-1">
                            PURCHASED: {item.max_quantity} Units • 
                            <span className={isOver ? "text-red-600 font-bold ml-1" : "text-primary font-bold ml-1"}>
                              RETURNING: {totalReturnQty} Units
                            </span>
                          </p>
                        </div>
                      </div>
                      
                      {item.selected && (
                        <button
                          onClick={() => {
                            const newItems = [...items];
                            newItems[idx].returns.push({ quantity: 1, status: "Defective" });
                            setItems(newItems);
                          }}
                          className="text-[11px] font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-colors"
                        >
                          + Add Status Row
                        </button>
                      )}
                    </div>

                    {item.selected && (
                      <div className="space-y-2">
                        {item.returns.map((ret, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200">
                            <input
                              type="number"
                              min="1"
                              max={item.max_quantity}
                              value={ret.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 0);
                                const newItems = [...items];
                                newItems[idx].returns[rIdx].quantity = val;
                                setItems(newItems);
                              }}
                              className="w-20 px-3 py-2 bg-muted/50 border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                            />
                            
                            <select
                              value={ret.status}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].returns[rIdx].status = e.target.value as any;
                                setItems(newItems);
                              }}
                              className={`flex-1 px-3 py-2 border rounded-xl text-xs font-bold focus:ring-2 outline-none appearance-none cursor-pointer ${
                                ret.status === "Good" ? "bg-green-50 border-green-200 text-green-700 focus:ring-green-500" :
                                ret.status === "Defective" ? "bg-red-50 border-red-200 text-red-700 focus:ring-red-500" :
                                "bg-orange-50 border-orange-200 text-orange-700 focus:ring-orange-500"
                              }`}
                            >
                              <option value="Good">Good Condition (Restockable)</option>
                              <option value="Defective">Defective (Non-Sellable)</option>
                              <option value="Damaged">Damaged (Physical Damage)</option>
                            </select>

                            {item.returns.length > 1 && (
                              <button
                                onClick={() => {
                                  const newItems = [...items];
                                  newItems[idx].returns.splice(rIdx, 1);
                                  setItems(newItems);
                                }}
                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Type */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setReturnType("Exchange")}
              className={`flex flex-col items-center p-5 rounded-2xl border-2 transition-all group ${
                returnType === "Exchange" 
                ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                : "border-border hover:border-primary/30 bg-card"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${
                returnType === "Exchange" ? "bg-primary text-white" : "bg-muted text-muted-foreground/50"
              }`}>
                <Check className="w-6 h-6" />
              </div>
              <span className={`font-bold text-sm ${returnType === "Exchange" ? "text-primary" : "text-muted-foreground"}`}>Product Exchange</span>
              <span className="text-[10px] text-center text-muted-foreground mt-1 opacity-70">Replace item with a new unit</span>
            </button>

            <button
              onClick={() => setReturnType("Refund")}
              className={`flex flex-col items-center p-5 rounded-2xl border-2 transition-all group ${
                returnType === "Refund" 
                ? "border-green-600 bg-green-50 ring-4 ring-green-600/10" 
                : "border-border hover:border-green-600/30 bg-card"
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${
                returnType === "Refund" ? "bg-green-600 text-white" : "bg-muted text-muted-foreground/50"
              }`}>
                <Check className="w-6 h-6" />
              </div>
              <span className={`font-bold text-sm ${returnType === "Refund" ? "text-green-700" : "text-muted-foreground"}`}>Cash Refund</span>
              <span className="text-[10px] text-center text-muted-foreground mt-1 opacity-70">Return payment to customer</span>
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

        <div className="p-6 border-t border-border flex items-center justify-between bg-muted/50">
          <div className="flex flex-col">
            {returnType === "Refund" && (
               <>
                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Refund</span>
                 <span className="text-xl font-black text-green-600">₱{refundAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
               </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-muted-foreground font-bold hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                returnType === "Refund" ? "bg-green-600 hover:bg-green-700 shadow-green-200" : "bg-primary hover:bg-primary/90 shadow-blue-200"
              }`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {returnType === "Refund" ? "Confirm Refund" : "Process Exchange"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
