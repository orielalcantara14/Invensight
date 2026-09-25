import { X, Printer, Wrench } from "lucide-react";
import type { SaleDetail } from "@/types";
import { printElementById } from "@/utils/print";

interface ViewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SaleDetail | null;
  loading: boolean;
}

export function ViewInvoiceModal({ isOpen, onClose, invoice, loading }: ViewInvoiceModalProps) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      onClose();
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
      <div 
        className="relative bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border/60 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Invoice #{String(invoice.invoice_id).padStart(6, "0")}
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-muted-foreground/70 hover:text-muted-foreground cursor-pointer p-1 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div id="invoice-printable-content" className="p-4 sm:p-6 overflow-y-auto flex-1 bg-card text-foreground">
          {/* Shop Branding Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-foreground mb-1">
              {localStorage.getItem("shop_name") || "JonBrix"}
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
              {localStorage.getItem("shop_tagline") || "Motorcycle Parts & Accessories"}
            </p>
            <div className="w-full border-b border-dashed border-border my-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{invoice.customer_info}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-medium">{invoice.payment_method}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                invoice.payment_status === "Paid" ? "bg-green-100 text-green-800" :
                invoice.payment_status === "Refunded" ? "bg-blue-100 text-blue-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {invoice.payment_status}
              </span>
            </div>
          </div>

          {/* Transaction Type Indicator */}
          {(() => {
            const hasService = invoice.items.some(i => i.is_service);
            const hasProduct = invoice.items.some(i => !i.is_service);
            const type = hasService && hasProduct ? "Service & Sale" : hasService ? "Service Only" : "Sales Only";
            const mechanics = Array.from(new Set(invoice.items.filter(i => i.is_service && i.mechanic_name).map(i => i.mechanic_name)));
            if (!hasService) return null;
            return (
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
                  <Wrench className="w-4 h-4" />
                  {type}
                </div>
                {mechanics.length > 0 && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Mechanic: {mechanics.join(", ")}
                  </p>
                )}
              </div>
            );
          })()}

          <div className="border-t border-border pt-4 mb-4">
            <h3 className="font-semibold text-foreground mb-3">Items</h3>
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm">
                      <div>{item.product_name}</div>
                      {item.is_service && item.mechanic_name && (
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5 flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Mechanic: {item.mechanic_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-right">₱{item.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">₱{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₱{(invoice.total_amount - invoice.tax_amount - invoice.service_charge).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (3%)</span>
                <span>₱{invoice.tax_amount.toFixed(2)}</span>
              </div>
              {invoice.service_charge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span>₱{invoice.service_charge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>Total</span>
                <span>₱{invoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cash Given</span>
                <span>₱{invoice.cash_given.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Change</span>
                <span className="font-medium">₱{invoice.change_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          >
            Close
          </button>
          <button 
            onClick={() => printElementById("invoice-printable-content", `Invoice #${String(invoice.invoice_id).padStart(6, "0")}`)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Printer className="w-4 h-4" />
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
