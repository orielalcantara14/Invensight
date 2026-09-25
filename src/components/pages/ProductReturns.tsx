import { Plus, Eye, CheckCircle, XCircle, Package, X, Archive, Trash2, Download } from "lucide-react";
import { exportToExcel } from "@/utils/export";
import { ExportPreviewModal } from "@/components/modals/ExportPreviewModal";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, type ProductReturn, type ProductReturnItem, type Supplier, type Product } from "@/services/api";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ProtectedAction } from "@/components/ProtectedAction";

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
  const [trashTarget, setTrashTarget] = useState<{ id: number; displayId: string } | null>(null);
  const [trashing, setTrashing] = useState(false);
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
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-650 dark:text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Rejected
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

  const handleMoveToTrash = (returnId: number) => {
    setTrashTarget({ id: returnId, displayId: formatReturnId(returnId) });
  };

  const confirmTrashReturn = async () => {
    if (!trashTarget) return;
    setTrashing(true);
    try {
      await api.moveReturnToTrash(trashTarget.id);
      toast.success("Supplier return moved to Deleted Folder");
      setTrashTarget(null);
      await fetchAll();
    } catch (error: any) {
      toast.error(error?.message || "Failed to move supplier return to Deleted Folder");
    } finally {
      setTrashing(false);
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Supplier Returns</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Allocate damaged/defective items for return to supplier</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 rounded-lg transition-colors border border-border/50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <ProtectedAction module="Archive" action="View">
            <Link
              to="/archive?stage=Archived&tab=product-returns"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
            >
              <Archive className="w-4 h-4" />
              Archive
            </Link>
          </ProtectedAction>
          <ProtectedAction module="Archive" action="Delete">
            <Link
              to="/archive?stage=Deleted&tab=product-returns"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Trash
            </Link>
          </ProtectedAction>
          <ProtectedAction module="Supplier Returns" action="Add">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Return
            </button>
          </ProtectedAction>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-xs border border-border/55">
        <div className="p-5 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Return Requests</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Return ID
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Quantity
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-32 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/40 bg-card">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-xs italic">
                    Loading returns...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">No returns available</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Create a return to allocate damaged items</p>
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((r) => (
                  <tr key={r.return_id} className="group hover:bg-muted/20 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-foreground font-mono">
                      {formatReturnId(r.return_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-foreground">
                      {r.supplier_name || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground font-mono font-semibold">
                      {r.total_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewReturn(r.return_id)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {r.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(r.return_id)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-950 dark:hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors"
                              title="Approve and Remove"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReject(r.return_id)}
                              className="p-1.5 text-red-600 hover:text-red-950 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                              title="Reject and Restore"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <ProtectedAction module="Supplier Returns" action="Delete">
                          <button
                            onClick={() => handleArchiveReturn(r.return_id)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction module="Supplier Returns" action="Delete">
                          <button
                            onClick={() => handleMoveToTrash(r.return_id)}
                            className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            title="Move to Trash"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
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
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Create Supplier Return</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                        <div className="flex-1 min-w-0">
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
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Return Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

      {/* Move to Trash Confirm Modal */}
      {trashTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card bg-background rounded-2xl shadow-2xl max-w-md w-full border border-border border-border overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground text-foreground">Move Return to Deleted Folder</h3>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">30-day retention countdown</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-muted-foreground dark:text-gray-300">
                Are you sure you want to move supplier return{" "}
                <span className="font-semibold text-foreground text-foreground">"{trashTarget.displayId}"</span> to the Deleted Folder?
              </p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/70 mt-2">
                This return request will remain in the Deleted Folder for 30 days before permanent deletion.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setTrashTarget(null)}
                disabled={trashing}
                className="px-4 py-2 text-sm font-medium text-muted-foreground dark:text-gray-300 border border-border dark:border-gray-600 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmTrashReturn}
                disabled={trashing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {trashing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Moving...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Move to Trash
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

