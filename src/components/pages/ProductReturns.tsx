import { Plus, Eye, CheckCircle, XCircle, Package, X, Archive, Trash2, Download } from "lucide-react";
import { exportToExcel } from "@/utils/export";
import { ExportPreviewModal } from "@/components/modals/ExportPreviewModal";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type ProductReturn, type ProductReturnItem, type Supplier, type Product } from "@/services/api";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface ReturnItemDraft {
  product_id: number;
  product_name: string;
  quantity: number;
}

export function ProductReturns() {
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<{ id: number; displayId: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [newReturn, setNewReturn] = useState<{
    supplier_id: number;
    reason: string;
    items: ReturnItemDraft[];
  }>({
    supplier_id: 0,
    reason: "",
    items: [],
  });

  const formatReturnId = (id: number) => `PR-${String(id).padStart(6, "0")}`;

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [returnsRes, suppliersRes, productsRes] = await Promise.all([
        api.getProductReturns(dateFrom || undefined, dateTo || undefined),
        api.getSuppliers(),
        api.getProducts(),
      ]);
      setReturns(returnsRes);
      setSuppliers(suppliersRes);
      setProducts(productsRes);
    } catch (error) {
      console.error("Failed to load supplier returns:", error);
      toast.error("Failed to load supplier returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(returns.length / itemsPerPage));
  const paginatedReturns = returns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const addItem = () => {
    setNewReturn((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: 0, product_name: "", quantity: 1 }],
    }));
  };

  const removeItem = (index: number) => {
    setNewReturn((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: keyof ReturnItemDraft, value: number | string) => {
    setNewReturn((prev) => {
      const updated = [...prev.items];
      const nextItem = { ...updated[index], [field]: value } as ReturnItemDraft;

      if (field === "product_id") {
        const product = products.find((p) => p.product_id === value);
        nextItem.product_name = product?.product_name ?? "";
      }

      updated[index] = nextItem;
      return { ...prev, items: updated };
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-muted text-foreground";
    }
  };

  const handleCreateReturn = async () => {
    if (!newReturn.supplier_id) {
      toast.error("Please select a supplier");
      return;
    }
    if (newReturn.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    for (const item of newReturn.items) {
      if (!item.product_id) {
        toast.error("Please select a product for all return items");
        return;
      }
      if (item.quantity <= 0) {
        toast.error("Return quantity must be greater than 0");
        return;
      }
    }

    try {
      const payload = {
        supplier_id: newReturn.supplier_id,
        reason: newReturn.reason || undefined,
        items: newReturn.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };
      const res = await api.createProductReturn(payload);
      if (!res.ok) throw new Error("Failed to create return");

      toast.success("Supplier return created successfully");
      setShowCreateModal(false);
      setNewReturn({ supplier_id: 0, reason: "", items: [] });
      await fetchAll();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create supplier return");
    }
  };

  const handleViewReturn = async (returnId: number) => {
    try {
      const detail = await api.getProductReturn(returnId);
      setSelectedReturn(detail);
      setShowViewModal(true);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load return details");
    }
  };

  const handleApprove = async (returnId: number) => {
    try {
      await api.approveProductReturn(returnId);
      toast.success("Return approved and removed from physical stock");
      setShowViewModal(false);
      await fetchAll();
    } catch (error: any) {
      toast.error(error?.message || "Failed to approve return");
    }
  };

  const handleReject = async (returnId: number) => {
    try {
      await api.rejectProductReturn(returnId);
      toast.success("Return rejected and allocation restored");
      setShowViewModal(false);
      await fetchAll();
    } catch (error: any) {
      toast.error(error?.message || "Failed to reject return");
    }
  };

  const handleArchiveReturn = (returnId: number) => {
    setArchiveTarget({ id: returnId, displayId: formatReturnId(returnId) });
  };

  const confirmArchiveReturn = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.archiveProductReturn(archiveTarget.id);
      toast.success("Return request moved to Archive successfully");
      setArchiveTarget(null);
      await fetchAll();
    } catch (error: any) {
      toast.error(error?.message || "Failed to archive return");
    } finally {
      setArchiving(false);
    }
  };



  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground text-foreground">Supplier Returns</h2>
          <p className="text-muted-foreground dark:text-muted-foreground/70 mt-1">Allocate damaged/defective items for return to supplier</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card bg-card p-2 rounded-lg border border-border border-border shadow-sm">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
              className="bg-transparent border-none text-sm focus:ring-0 text-foreground"
            />
            <span className="text-muted-foreground/70">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="bg-transparent border-none text-sm focus:ring-0 text-foreground"
            />
          </div>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Supplier Returns
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Return
          </button>
        </div>
      </div>

      <div className="bg-card bg-card rounded-lg shadow border border-border border-border">
        <div className="p-6 border-b border-border border-border">
          <h3 className="text-lg font-semibold text-foreground text-foreground">Return Requests</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 dark:bg-gray-700 border-b border-border dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left">
                  {/* Header checkbox removed */}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">
                  Return ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">
                  Total Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground dark:text-muted-foreground/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-card bg-card divide-y divide-border dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Loading returns...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-muted-foreground font-medium">No returns available</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Create a return to allocate damaged items</p>
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((r) => (
                  <tr key={r.return_id} className="hover:bg-muted/50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Row selection handled in Export Wizard */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground text-foreground">
                      {formatReturnId(r.return_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground text-foreground">
                      {r.supplier_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground/70">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground/70">
                      {r.total_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewReturn(r.return_id)}
                          className="text-primary hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {r.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(r.return_id)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Approve and Remove"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(r.return_id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Reject and Restore"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(r.status === "Approved" || r.status === "Rejected") && (
                          <button
                            onClick={() => handleArchiveReturn(r.return_id)}
                            className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                            title="Archive Return"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {returns.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground dark:text-muted-foreground/70">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-border dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-card dark:bg-gray-700 text-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
              <span className="text-sm text-muted-foreground dark:text-muted-foreground/70">entries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground dark:text-muted-foreground/70">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-border dark:border-gray-600 disabled:opacity-50 hover:bg-muted dark:hover:bg-gray-700 text-muted-foreground dark:text-gray-300 text-sm"
                >
                  {"<"}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded border text-sm ${
                      page === currentPage
                        ? "bg-primary text-white border-primary"
                        : "border-border dark:border-gray-600 hover:bg-muted dark:hover:bg-gray-700 text-muted-foreground dark:text-gray-300"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-border dark:border-gray-600 disabled:opacity-50 hover:bg-muted dark:hover:bg-gray-700 text-muted-foreground dark:text-gray-300 text-sm"
                >
                  {">"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border border-border">
              <h2 className="text-xl font-bold text-foreground text-foreground">Create Supplier Return</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground/70 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1">Supplier *</label>
                  <select
                    value={newReturn.supplier_id}
                    onChange={(e) => setNewReturn((prev) => ({ ...prev, supplier_id: Number(e.target.value) }))}
                    className="w-full border border-border dark:border-gray-600 rounded-lg px-3 py-2 bg-card dark:bg-gray-700 text-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={0}>Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1">Reason</label>
                  <input
                    value={newReturn.reason}
                    onChange={(e) => setNewReturn((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Damaged / Defective / Wrong item..."
                    className="w-full border border-border dark:border-gray-600 rounded-lg px-3 py-2 bg-card dark:bg-gray-700 text-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-muted-foreground dark:text-gray-300">Return Items *</label>
                  <button onClick={addItem} className="text-sm text-primary hover:text-blue-800 dark:text-blue-400">
                    + Add Item
                  </button>
                </div>

                {newReturn.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground/70 py-4 text-center">
                    Click "Add Item" to add products to this return
                  </p>
                ) : (
                  <div className="space-y-3">
                    {newReturn.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <SearchableSelect
                            value={item.product_id}
                            onValueChange={(val) => updateItem(index, "product_id", val)}
                            options={products
                              .filter((p) => p.supplier_id === newReturn.supplier_id)
                              .map((p) => ({
                                value: p.product_id,
                                label: p.product_name,
                              }))}
                            placeholder="Select Product"
                          />
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateItem(index, "quantity", val === "" ? "" : Number(val));
                            }}
                            className="w-full border border-border dark:border-gray-600 rounded px-2 py-1 text-sm bg-card dark:bg-gray-600 text-foreground text-foreground"
                            placeholder="Qty"
                          />
                        </div>
                        <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700" title="Remove item">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border border-border">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-muted-foreground dark:text-gray-300 border border-border dark:border-gray-600 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button onClick={handleCreateReturn} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                Allocate Return
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border border-border">
              <h2 className="text-xl font-bold text-foreground text-foreground">Return Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-muted-foreground hover:text-muted-foreground dark:text-muted-foreground/70 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground dark:text-muted-foreground/70">Return ID</label>
                  <p className="font-medium text-foreground text-foreground">{formatReturnId(selectedReturn.return_id)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground dark:text-muted-foreground/70">Status</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedReturn.status)}`}>
                      {selectedReturn.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground dark:text-muted-foreground/70">Supplier</label>
                  <p className="font-medium text-foreground text-foreground">{selectedReturn.supplier_name || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground dark:text-muted-foreground/70">Created Date</label>
                  <p className="font-medium text-foreground text-foreground">
                    {selectedReturn.created_at ? new Date(selectedReturn.created_at).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>

              {selectedReturn.reason && (
                <div>
                  <label className="text-sm text-muted-foreground dark:text-muted-foreground/70">Reason</label>
                  <p className="text-foreground text-foreground mt-1">{selectedReturn.reason}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground dark:text-gray-300 mb-2 block">Items</label>
                <div className="border border-border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/70">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground/70">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-gray-700">
                      {(selectedReturn.items || []).map((it: ProductReturnItem) => (
                        <tr key={it.item_id}>
                          <td className="px-4 py-2 text-sm text-foreground text-foreground">{it.product_name || `#${it.product_id}`}</td>
                          <td className="px-4 py-2 text-sm text-foreground text-foreground">{it.quantity}</td>
                        </tr>
                      ))}
                      {(selectedReturn.items || []).length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No items
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border border-border">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-muted-foreground dark:text-gray-300 border border-border dark:border-gray-600 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              {selectedReturn.status === "Pending" && (
                <>
                  <button
                    onClick={() => handleApprove(selectedReturn.return_id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedReturn.return_id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Archive Confirm Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card bg-background rounded-2xl shadow-2xl max-w-md w-full border border-border border-border overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground text-foreground">Archive Return Request</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Moves items to Archive module</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-muted-foreground dark:text-gray-300">
                Are you sure you want to archive return request{" "}
                <span className="font-semibold text-foreground text-foreground">"{archiveTarget.displayId}"</span>?
              </p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/70 mt-2">
                It will be moved to the Archive module and can be fully restored at any time.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="px-4 py-2 text-sm font-medium text-muted-foreground dark:text-gray-300 border border-border dark:border-gray-600 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveReturn}
                disabled={archiving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {archiving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Archive Return
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Export Preview Modal */}
      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Supplier Returns"
        filename={`InvenSight_SupplierReturns_${new Date().toISOString().split('T')[0]}`}
        data={returns.map(r => ({
          id: r.return_id,
          "Return ID": formatReturnId(r.return_id),
          "Supplier": r.supplier_name || "N/A",
          "Status": r.status,
          "Created At": r.created_at, // Field for date filtering
          "Reason": r.reason || "N/A",
          "Total Quantity": r.total_quantity
        }))}
      />
    </div>
  );
}

