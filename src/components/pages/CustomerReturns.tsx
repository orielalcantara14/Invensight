import { Search, Eye, Package, X, RotateCcw, Truck, Download } from "lucide-react";
import { ExportPreviewModal } from "@/components/modals/ExportPreviewModal";
import { useEffect, useState } from "react";
import { api, type CustomerReturn, type CustomerReturnItem } from "@/services/api";
import { toast } from "sonner";
import { ViewInvoiceModal } from "@/components/modals/ViewInvoiceModal";
import type { SaleDetail } from "@/types";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ProtectedAction } from "@/components/ProtectedAction";

export function CustomerReturns() {
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<CustomerReturn | null>(null);
  
  const [selectedInvoice, setSelectedInvoice] = useState<SaleDetail | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomerReturns(dateFrom || undefined, dateTo || undefined);
      setReturns(res);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [dateFrom, dateTo]);

  const handleViewInvoice = async (invoiceId: number) => {
    setLoadingInvoice(true);
    try {
      const detail = await api.getSale(invoiceId);
      setSelectedInvoice(detail);
    } catch (err: any) {
      toast.error("Failed to load invoice details");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleReturnToSupplier = async (returnId: number) => {
    try {
      await api.markCustomerReturnToSupplier(returnId);
      toast.success("Items marked as returned to supplier");
      await fetchReturns();
      setShowViewModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to process supplier return");
    }
  };

  const handleMarkAsLoss = async (returnId: number) => {
    try {
      await api.markCustomerReturnAsLoss(returnId);
      toast.success("Items marked as loss");
      await fetchReturns();
      setShowViewModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to process loss");
    }
  };

  const filteredReturns = returns.filter(r => 
    r.rma_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.customer_name && r.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    String(r.sale_id).includes(searchTerm)
  );

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(filteredReturns.length / itemsPerPage));
  const paginatedReturns = filteredReturns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        );
      case "Returned to Supplier":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Returned to Supplier
          </span>
        );
      case "Loss":
      case "Marked as Loss":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Loss (Scrapped)
          </span>
        );
      case "Success":
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Success
          </span>
        );
      case "Success (Not Sellable Item)":
      case "Completed (Non-Sellable Item)":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Success (not sellable item)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Customer Product Returns</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage product returns and exchanges from customers</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <div className="relative w-full sm:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
             <input 
                type="text" 
                placeholder="Search RMA or Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-border bg-card rounded-lg focus:ring-1 focus:ring-zinc-400 outline-none transition-all"
             />
          </div>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
          <ProtectedAction module="Customer Returns" action="Export">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 rounded-lg transition-colors border border-border/50 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </ProtectedAction>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-xs border border-border/55 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">RMA Number</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">Return Date</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-[10px] font-bold text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider w-32 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {loading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground/70">Loading returns...</td></tr>
              ) : paginatedReturns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-muted-foreground font-medium">No customer returns found</p>
                    </td>
                  </tr>
              ) : (
                  paginatedReturns.map((r) => (
                      <tr key={r.return_id} className="group hover:bg-muted/20 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-foreground font-mono">{r.rma_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono">
                          <button 
                            onClick={() => handleViewInvoice(r.sale_id)}
                            className="text-foreground hover:underline flex items-center gap-1 font-mono"
                          >
                            INV-{String(r.sale_id).padStart(6, "0")}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-foreground">
                           <div className="font-semibold text-foreground">{r.customer_name}</div>
                           {r.contact_number && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{r.contact_number}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">{new Date(r.return_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.return_type === 'Refund' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
                          }`}>
                              {r.return_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(r.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => { setSelectedReturn(r); setShowViewModal(true); }}
                              className="p-1 rounded text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-muted transition-all"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {filteredReturns.length > itemsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50 bg-muted/50/30">
            <p className="text-sm text-muted-foreground">Showing {paginatedReturns.length} of {filteredReturns.length} returns</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-border rounded-md bg-card disabled:opacity-50 text-sm"
              >
                Previous
              </button>
              <button 
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages}
                 className="px-3 py-1 border border-border rounded-md bg-card disabled:opacity-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {showViewModal && selectedReturn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
              <div className="relative bg-card rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
                      <h2 className="text-base sm:text-lg font-bold text-foreground truncate pr-2">Return Details - {selectedReturn.rma_number}</h2>
                      <button onClick={() => setShowViewModal(false)}><X className="w-5 h-5 text-muted-foreground/70" /></button>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                          <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="text-muted-foreground text-[11px] uppercase font-bold tracking-tight mb-1">Reason</p>
                              <p className="font-medium text-muted-foreground">{selectedReturn.reason || "No reason provided"}</p>
                          </div>
                          <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="text-muted-foreground text-[11px] uppercase font-bold tracking-tight mb-1">Status</p>
                              <p className="font-medium text-muted-foreground">{selectedReturn.status}</p>
                          </div>
                      </div>
                      <div>
                          <p className="text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wide">Returned Items</p>
                          <div className="border border-border rounded-lg overflow-x-auto">
                              <table className="w-full text-xs min-w-[280px]">
                                  <thead className="bg-muted/50 font-medium text-muted-foreground border-b border-border">
                                      <tr>
                                          <th className="px-3 py-2 text-left">Product</th>
                                          <th className="px-3 py-2 text-center">Qty</th>
                                          <th className="px-3 py-2 text-center">Condition</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border text-muted-foreground">
                                      {selectedReturn.items.map((item, idx) => (
                                          <tr key={idx} className="hover:bg-muted/50">
                                              <td className="px-3 py-2 font-medium">{item.product_name}</td>
                                              <td className="px-3 py-2 text-center">{item.quantity}</td>
                                              <td className="px-3 py-2 text-center">
                                                  <div className="flex flex-col gap-0.5">
                                                      {item.is_defective && <span className="text-red-600 font-bold">● Defective</span>}
                                                      {item.is_damaged && <span className="text-orange-600 font-bold">● Damaged</span>}
                                                      {!item.is_defective && !item.is_damaged && <span className="text-green-600 font-bold">✓ Good Condition</span>}
                                                  </div>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 sm:p-6 border-t border-border bg-muted/50 flex flex-wrap justify-end gap-2 sm:gap-3 font-semibold">
                      <button onClick={() => setShowViewModal(false)} className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm text-muted-foreground hover:bg-gray-200 rounded-lg transition-colors">Close</button>
                      {selectedReturn.items.some(i => i.is_defective || i.is_damaged) && selectedReturn.status !== "Returned to Supplier" && selectedReturn.status !== "Loss" && selectedReturn.status !== "Marked as Loss" && (
                        <>
                          <button 
                            onClick={() => handleMarkAsLoss(selectedReturn.return_id)}
                            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700 flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-red-100 transition-all font-bold"
                          >
                            <X className="w-4 h-4" />
                            Loss
                          </button>
                          <button 
                            onClick={() => handleReturnToSupplier(selectedReturn.return_id)}
                            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-orange-600 text-white text-xs sm:text-sm rounded-lg hover:bg-orange-700 flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-orange-100 transition-all font-bold"
                          >
                            <Truck className="w-4 h-4" />
                            Return to Supplier
                          </button>
                        </>
                      )}
                  </div>
              </div>
          </div>
      )}

      <ViewInvoiceModal 
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        loading={loadingInvoice}
      />

      {/* Export Preview Modal */}
      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Customer Returns"
        filename={`InvenSight_CustomerReturns_${new Date().toISOString().split('T')[0]}`}
        data={returns.map(r => ({
          id: r.return_id,
          "RMA Number": r.rma_number,
          "Invoice": `INV-${String(r.sale_id).padStart(6, "0")}`,
          "Customer": r.customer_name || "N/A",
          "Return Date": r.return_date, // Field for date filtering
          "Type": r.return_type,
          "Status": r.status,
          "Reason": r.reason || "N/A"
        }))}
      />
    </div>
  );
}
