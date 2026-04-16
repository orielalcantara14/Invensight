import { Mail, Phone, MapPin, Package, ShoppingCart, X } from "lucide-react";
import type { Supplier } from "@/services/api";

interface SupplierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export function SupplierDetailsModal({ isOpen, onClose, supplier }: SupplierDetailsModalProps) {
  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card bg-background rounded-2xl shadow-2xl max-w-xl w-full border border-border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border dark:border-gray-800 bg-muted/50/50 bg-background/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <Package className="w-5 h-5 text-primary dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground text-foreground">{supplier.supplier_name}</h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">Supplier Details & Catalog</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground/70 hover:text-muted-foreground dark:hover:text-gray-200 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Stats Bar */}
          <div className="grid grid-cols-1">
            <div className="p-4 bg-primary/10/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-primary dark:text-blue-400" />
                <span className="text-xs font-bold text-primary/90 dark:text-blue-300 uppercase tracking-wider">Total Orders</span>
              </div>
              <div className="text-2xl font-black text-foreground text-foreground">
                {supplier.total_orders || 0}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-muted-foreground/70 uppercase tracking-[0.2em]">Contact Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground/70" />
                <div>
                  <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">Email Address</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-300 font-medium">{supplier.email || "No email provided"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground/70" />
                <div>
                  <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">Contact Number</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-300 font-medium">{supplier.contact_number || "No number provided"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 md:col-span-2">
                <MapPin className="w-4 h-4 text-muted-foreground/70 mt-1" />
                <div>
                  <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-wider">Physical Address</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-300 font-medium leading-relaxed">
                    {supplier.address || "No address provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Products List */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-muted-foreground/70 uppercase tracking-[0.2em]">Supplier Products</h4>
            <div className="flex flex-wrap gap-2">
              {supplier.product_supplied ? (
                supplier.product_supplied.split(',').map((p, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-muted/50 bg-card text-muted-foreground dark:text-gray-300 border border-border border-border rounded-xl text-xs font-bold shadow-sm"
                  >
                    {p.trim()}
                  </span>
                ))
              ) : (
                <div className="w-full p-8 bg-muted/50/50 bg-background/50 rounded-2xl border border-dashed border-border dark:border-gray-800 text-center">
                  <p className="text-sm text-muted-foreground/70 italic font-medium">No products registered for this supplier</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 dark:bg-card text-white dark:text-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
