import { X, Printer } from "lucide-react";
import type { SaleDetail } from "@/types";

interface ViewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SaleDetail | null;
  loading: boolean;
}

export function ViewInvoiceModal({ isOpen, onClose, invoice, loading }: ViewInvoiceModalProps) {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print:absolute print:inset-0 print:bg-white print:p-0 print:block"
      onClick={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] print:hidden" />
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-none print:max-h-full print:overflow-visible">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Invoice #{String(invoice.invoice_id).padStart(6, "0")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 print:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          {/* Shop Branding Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 mb-1">JonBrix</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Motorcycle Parts & Accessories</p>
            <div className="w-full border-b border-dashed border-gray-300 my-4" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{invoice.customer_info}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="font-medium">{invoice.payment_method}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                invoice.payment_status === "Paid" ? "bg-green-100 text-green-800" :
                invoice.payment_status === "Refunded" ? "bg-blue-100 text-blue-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {invoice.payment_status}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm">{item.product_name}</td>
                    <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-right">₱{item.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">₱{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>₱{(invoice.total_amount - invoice.tax_amount - invoice.service_charge).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax (3%)</span>
                <span>₱{invoice.tax_amount.toFixed(2)}</span>
              </div>
              {invoice.service_charge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Service Charge</span>
                  <span>₱{invoice.service_charge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>₱{invoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cash Given</span>
                <span>₱{invoice.cash_given.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Change</span>
                <span className="font-medium">₱{invoice.change_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" />
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
