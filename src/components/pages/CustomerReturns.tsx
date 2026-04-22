import { Search, Eye, Package, X, RotateCcw, Truck, Download } from "lucide-react";
import { ExportPreviewModal } from "@/components/modals/ExportPreviewModal";
import { useEffect, useState } from "react";
import { api, type CustomerReturn, type CustomerReturnItem } from "@/services/api";
import { toast } from "sonner";
import { ViewInvoiceModal } from "@/components/modals/ViewInvoiceModal";
import type { SaleDetail } from "@/types";

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
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Returned to Supplier": return "bg-blue-100 text-blue-800";
      case "Completed": return "bg-green-100 text-green-800";
      default: return "bg-muted text-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Customer Product Returns</h2>
          <p className="text-muted-foreground mt-1">Manage product returns and exchanges from customers</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border shadow-sm">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
              className="bg-transparent border-none text-sm focus:ring-0"
            />
            <span className="text-muted-foreground/70">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="bg-transparent border-none text-sm focus:ring-0"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Customer Returns
          </button>
          <div className="relative w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
             <input 
               type="text" 
               placeholder="Search RMA or Customer..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
             />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
            <tr>
                {/* Header checkbox removed */}
              <th className="px-6 py-4 text-left">RMA Number</th>
              <th className="px-6 py-4 text-left">Invoice</th>
              <th className="px-6 py-4 text-left">Customer</th>
              <th className="px-6 py-4 text-left">Return Date</th>
              <th className="px-6 py-4 text-left">Type</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
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
                    <tr key={r.return_id} className="hover:bg-muted/50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* Row selection handled in Export Wizard */}
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">{r.rma_number}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleViewInvoice(r.sale_id)}
                          className="text-foreground font-medium hover:underline flex items-center gap-1"
                        >
                          INV-{String(r.sale_id).padStart(6, "0")}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                         <div className="font-medium text-foreground">{r.customer_name}</div>
                         {r.contact_number && <div className="text-xs text-muted-foreground">{r.contact_number}</div>}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(r.return_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            r.return_type === 'Refund' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                            {r.return_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => { setSelectedReturn(r); setShowViewModal(true); }}
                          className="p-2 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>

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
              <div className="relative bg-card rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-border flex items-center justify-between">
                      <h2 className="text-lg font-bold text-foreground">Return Details - {selectedReturn.rma_number}</h2>
                      <button onClick={() => setShowViewModal(false)}><X className="w-5 h-5 text-muted-foreground/70" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
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
                          <div className="border border-border rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
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
                  <div className="p-6 border-t border-border bg-muted/50 flex justify-end gap-3 font-semibold">
                      <button onClick={() => setShowViewModal(false)} className="px-5 py-2.5 text-muted-foreground hover:bg-gray-200 rounded-lg transition-colors">Close</button>
                      {selectedReturn.status === "Pending" && selectedReturn.items.some(i => i.is_defective || i.is_damaged) && (
                          <button 
                            onClick={() => handleReturnToSupplier(selectedReturn.return_id)}
                            className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 shadow-lg shadow-orange-100 transition-all font-bold"
                          >
                            <Truck className="w-4 h-4" />
                            Return to Supplier
                          </button>
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
