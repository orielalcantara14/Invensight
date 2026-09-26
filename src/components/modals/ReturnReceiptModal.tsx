import { X, Printer, CheckCircle2, RefreshCcw } from "lucide-react";
import type { SaleDetail } from "@/types";
import { format } from "date-fns";
import { printElementById } from "@/utils/print";

interface ReturnReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SaleDetail | null;
  rmaNumber: string;
  returnType: "Refund" | "Exchange";
  reason: string;
  items: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    is_defective: boolean;
    is_damaged: boolean;
  }>;
  refundAmount?: number;
}

export function ReturnReceiptModal({
  isOpen,
  onClose,
  invoice,
  rmaNumber,
  returnType,
  reason,
  items,
  refundAmount
}: ReturnReceiptModalProps) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    printElementById("return-receipt-printable", `${returnType} Slip - ${rmaNumber}`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card sticky top-0 z-10">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            {returnType === "Exchange" ? <RefreshCcw className="w-5 h-5 text-primary" /> : <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {returnType === "Exchange" ? "Exchange Slip" : "Return Receipt"}
          </h2>
          <button onClick={onClose} className="p-2 text-muted-foreground/70 hover:text-muted-foreground rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div id="return-receipt-printable" className="p-4 sm:p-8 overflow-y-auto font-sans text-sm bg-card text-foreground">
          {/* Shop branding */}
          <div className="text-center mb-10">
            <div className="inline-block bg-black text-white px-4 py-2 rounded-xl mb-4">
               <h1 className="text-2xl font-black tracking-tighter uppercase">JonBrix</h1>
            </div>
            <p className="text-xs font-black text-foreground uppercase tracking-widest border-y border-border py-2">Official {returnType} Slip</p>
          </div>

          <div className="grid grid-cols-2 gap-y-4 mb-10">
            <div className="col-span-1">
              <p className="text-[10px] text-muted-foreground/70 font-black uppercase tracking-widest">RMA Number</p>
              <p className="text-sm font-black text-red-600">{rmaNumber}</p>
            </div>
            <div className="col-span-1 text-right">
              <p className="text-[10px] text-muted-foreground/70 font-black uppercase tracking-widest">Date Issued</p>
              <p className="text-sm font-bold text-foreground">{format(new Date(), "MMMM dd, yyyy")}</p>
            </div>
            <div className="col-span-1">
              <p className="text-[10px] text-muted-foreground/70 font-black uppercase tracking-widest">Type</p>
              <p className={`text-sm font-black ${returnType === "Exchange" ? "text-primary" : "text-green-600"}`}>{returnType.toUpperCase()}</p>
            </div>
            <div className="col-span-1 text-right">
              <p className="text-[10px] text-muted-foreground/70 font-black uppercase tracking-widest">Orig. Invoice</p>
              <p className="text-sm font-bold text-foreground text-primary">#INV-{String(invoice.invoice_id).padStart(6, "0")}</p>
            </div>
          </div>

          <div className="mb-10 p-4 bg-muted/50 rounded-xl border border-border">
             <p className="text-[10px] text-muted-foreground/70 font-black uppercase tracking-widest mb-1">Customer Info</p>
             <p className="text-sm font-bold text-foreground">{invoice.customer_info}</p>
          </div>

          <div className="space-y-4 mb-10">
            <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-black rounded-full" />
               Items Processed
            </h3>
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-4 p-3 bg-card border border-border rounded-lg shadow-sm">
                  <div className="flex-1">
                    <p className="font-black text-foreground text-xs">{item.product_name}</p>
                    <div className="flex gap-2 mt-1">
                      {item.is_defective && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Defective</span>}
                      {item.is_damaged && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase">Damaged</span>}
                      {(!item.is_defective && !item.is_damaged) && <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-black uppercase">Good Condition</span>}
                    </div>
                  </div>
                  <span className="font-black text-foreground bg-muted px-2 py-1 rounded text-xs">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-10">
            <p className="text-[10px] text-muted-foreground/70 font-black uppercase tracking-widest mb-2">Internal Reason / Notes</p>
            <div className="p-4 bg-primary/10/30 border border-blue-100/50 rounded-xl italic text-muted-foreground text-xs leading-relaxed">
              "{reason || "No specific reason logged"}"
            </div>
          </div>

          {returnType === "Refund" && refundAmount !== undefined && (
            <div className="border-t-2 border-black pt-6 mt-10">
                <div className="flex justify-between items-center">
                    <p className="text-sm font-black text-foreground uppercase tracking-widest">Total Refund Amount</p>
                    <p className="text-xl font-black text-green-600">₱{refundAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-right italic">*Refunded via Original Payment Method</p>
            </div>
          )}

          <div className="mt-12 text-center border-t border-dashed border-border pt-8">
            <p className="text-[10px] text-muted-foreground/70 font-black uppercase tracking-[0.2em] mb-2">Official Documentation</p>
            <p className="text-[9px] text-gray-300 italic">Please keep this slip for your warranty records. Generated by JonBrix InvenSight CMS.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/50 print:hidden">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-muted-foreground font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-8 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
