import { Plus, Eye, CheckCircle, XCircle, Package, X, Archive, Trash2, Download } from "lucide-react";
import { exportToExcel } from "@/utils/export";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ProductReturn, type ProductReturnItem, type Supplier, type Product } from "@/services/api";
import { toast } from "sonner";

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
        return "bg-gray-100 text-gray-800";
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

  const handleExport = () => {
    if (returns.length === 0) {
      toast.error("No data to export");
      return;
    }
    setExporting(true);
    try {
      const { exportToExcel } = require("@/utils/export");
      const data = returns.map((r) => ({
        "Return ID": formatReturnId(r.return_id),
        "Supplier": r.supplier_name || "N/A",
        "Status": r.status,
        "Created At": r.created_at ? new Date(r.created_at).toLocaleString() : "N/A",
        "Reason": r.reason || "N/A",
        "Total Quantity": r.total_quantity,
      }));
      exportToExcel(data, `Supplier_Returns_${new Date().toISOString().split('T')[0]}`);
      toast.success("Data exported to Excel");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Supplier Returns</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Allocate damaged/defective items for return to supplier</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent border-none text-sm focus:ring-0 dark:text-white"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent border-none text-sm focus:ring-0 dark:text-white"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export"}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Return
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Return Requests</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Return ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading returns...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No returns available</p>
                    <p className="text-sm text-gray-400 mt-1">Create a return to allocate damaged items</p>
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((r) => (
                  <tr key={r.return_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatReturnId(r.return_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {r.supplier_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400">entries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                >
                  {"<"}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded border text-sm ${
                      page === currentPage
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Supplier Return</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier *</label>
                  <select
                    value={newReturn.supplier_id}
                    onChange={(e) => setNewReturn((prev) => ({ ...prev, supplier_id: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                  <input
                    value={newReturn.reason}
                    onChange={(e) => setNewReturn((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Damaged / Defective / Wrong item..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Return Items *</label>
                  <button onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                    + Add Item
                  </button>
                </div>

                {newReturn.items.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    Click "Add Item" to add products to this return
                  </p>
                ) : (
                  <div className="space-y-3">
                    {newReturn.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, "product_id", Number(e.target.value))}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                          >
                            <option value={0}>Select Product</option>
                            {products
                              .filter((p) => p.supplier_id === newReturn.supplier_id)
                              .map((p) => (
                                <option key={p.product_id} value={p.product_id}>
                                  {p.product_name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
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

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button onClick={handleCreateReturn} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Allocate Return
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Return Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Return ID</label>
                  <p className="font-medium text-gray-900 dark:text-white">{formatReturnId(selectedReturn.return_id)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedReturn.status)}`}>
                      {selectedReturn.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Supplier</label>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedReturn.supplier_name || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Created Date</label>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedReturn.created_at ? new Date(selectedReturn.created_at).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>

              {selectedReturn.reason && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Reason</label>
                  <p className="text-gray-900 dark:text-white mt-1">{selectedReturn.reason}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Items</label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(selectedReturn.items || []).map((it: ProductReturnItem) => (
                        <tr key={it.item_id}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{it.product_name || `#${it.product_id}`}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{it.quantity}</td>
                        </tr>
                      ))}
                      {(selectedReturn.items || []).length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-sm text-gray-500">
                            No items
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Archive Return Request</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Moves items to Archive module</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to archive return request{" "}
                <span className="font-semibold text-gray-900 dark:text-white">"{archiveTarget.displayId}"</span>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                It will be moved to the Archive module and can be fully restored at any time.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
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
    </div>
  );
}

