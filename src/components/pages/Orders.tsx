import { Search, Plus, Package, Eye, Trash2, CheckCircle, X, ChevronDown, Archive, Download } from "lucide-react";
import { exportToExcel } from "@/utils/export";
import { ExportPreviewModal } from "@/components/modals/ExportPreviewModal";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { toast } from "sonner";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types";
import { ProductReturns } from "./ProductReturns";
import { CustomerReturns } from "./CustomerReturns";
import { ProtectedAction } from "@/components/ProtectedAction";

interface OrderItemInput {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number | null;
}

interface SupplierOption {
  supplier_id: number;
  supplier_name: string;
  status?: string;
}

interface ProductOption {
  product_id: number;
  product_name: string;
  reorder_level?: number;
  unit_price?: number;
  supplier_id?: number;
}

export function Orders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "returns" | "customer_returns">("orders");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [customerReturnsCount, setCustomerReturnsCount] = useState(0);

  const [archiveTarget, setArchiveTarget] = useState<{ id: string; displayId: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [newOrder, setNewOrder] = useState({
    supplier_id: 0,
    expected_delivery: "",
    notes: "",
    items: [] as OrderItemInput[],
  });

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, suppliersRes, productsRes, returnsRes] = await Promise.all([
        api.getPurchaseOrders(dateFrom || undefined, dateTo || undefined),
        api.getSuppliers(),
        api.getProducts(),
        api.getCustomerReturns(),
      ]);
      setOrders(ordersRes);
      setSuppliers(suppliersRes);
      setProducts(productsRes.map(p => ({
        product_id: p.product_id,
        product_name: p.product_name,
        reorder_level: p.reorder_level ?? undefined,
        unit_price: p.unit_price ?? undefined,
        supplier_id: p.supplier_id ?? undefined
      })));
      setCustomerReturnsCount(returnsRes.length);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const filteredOrders = orders.filter(
    (order) =>
      order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const orderIdDisplayMap = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((order, index) => {
      map.set(order.order_id, `PO-${String(index + 1).padStart(6, "0")}`);
    });
    return map;
  }, [orders]);

  const formatOrderId = (orderId: string) => orderIdDisplayMap.get(orderId) || orderId;

  const addOrderItem = () => {
    setNewOrder((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: 0, product_name: "", quantity: 1, unit_price: null }],
    }));
  };

  const removeOrderItem = (index: number) => {
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateOrderItem = (index: number, field: keyof OrderItemInput, value: any) => {
    setNewOrder((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      if (field === "product_id") {
        const product = products.find((p) => p.product_id === value);
        if (product) {
          updatedItems[index].product_name = product.product_name;
        }
      }
      return { ...prev, items: updatedItems };
    });
  };

  const handleCreateOrder = async () => {
    if (!newOrder.supplier_id) {
      toast.error("Please select a supplier");
      return;
    }
    if (!newOrder.expected_delivery) {
      toast.error("Please select an expected delivery date");
      return;
    }
    if (newOrder.items.length === 0) {
      toast.error("Please add at least one product");
      return;
    }
    const selectedSupplier = suppliers.find((s) => s.supplier_id === newOrder.supplier_id);
    if (selectedSupplier && (selectedSupplier.status || "").toLowerCase() !== "active") {
      toast.error("This supplier is currently inactive.");
      return;
    }
    for (const item of newOrder.items) {
      if (!item.product_id) {
        toast.error("Please select a product for all items");
        return;
      }
      if (item.quantity <= 0) {
        toast.error("Quantity must be greater than 0");
        return;
      }
      const product = products.find((p) => p.product_id === item.product_id);
      if (product) {
        const reorderLevel = product.reorder_level ?? 5;
        if (item.quantity < reorderLevel) {
          toast.error(`Order quantity for ${product.product_name} must be at least ${reorderLevel} (reorder level)`);
          return;
        }
        if (item.unit_price !== null && product.unit_price !== undefined) {
          if (Math.abs(item.unit_price - product.unit_price) > 0.01) {
            toast.error(`Unit price for ${product.product_name} must be ${product.unit_price}`);
            return;
          }
        }
      }
    }

    try {
      const payload = {
        supplier_id: newOrder.supplier_id,
        expected_delivery: newOrder.expected_delivery,
        items: newOrder.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price ?? undefined,
        })),
        notes: newOrder.notes || undefined,
      };

      const result = await api.createPurchaseOrder(payload);
      toast.success(`Purchase order ${result.order_id} created successfully`);
      setShowCreateModal(false);
      setNewOrder({ supplier_id: 0, expected_delivery: "", notes: "", items: [] });
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create purchase order");
    }
  };

  const handleViewOrder = async (orderId: string) => {
    try {
      const order = await api.getPurchaseOrder(orderId);
      setSelectedOrder(order);
      setShowViewModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load order details");
    }
  };

  const handleMarkAsReceived = async (orderId: string) => {
    try {
      await api.markOrderAsReceived(orderId);
      toast.success("Order marked as received");
      setShowViewModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark order as received");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to move this pending order to the Archive?")) return;
    try {
      await api.deletePurchaseOrder(orderId);
      toast.success("Order moved to Archive successfully");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to move order to Archive");
    }
  };

  const handleArchiveOrder = (orderId: string) => {
    const displayId = formatOrderId(orderId);
    setArchiveTarget({ id: orderId, displayId });
  };

  const confirmArchiveOrder = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.archivePurchaseOrder(archiveTarget.id);
      toast.success("Order archived successfully");
      setArchiveTarget(null);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to archive order");
    } finally {
      setArchiving(false);
    }
  };

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Received":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const receivedCount = orders.filter((o) => o.status === "Received").length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders and Return</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage supplier purchase orders</p>
          </div>
          <div className="flex items-center gap-3">
            <ProtectedAction module="Archive" action="View">
              <Link
                to="/archive?stage=Archived&tab=orders"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
              >
                <Archive className="w-4 h-4" />
                Archive
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Archive" action="Delete">
              <Link
                to="/archive?stage=Deleted&tab=orders"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Trash
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Orders" action="Add">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Order
              </button>
            </ProtectedAction>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Orders</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Received Orders</div>
          <div className="text-2xl font-bold text-green-600">{receivedCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer Returns</div>
          <div className="text-2xl font-bold text-purple-600">{customerReturnsCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            setActiveTab("orders");
            setShowCreateModal(false);
            setShowViewModal(false);
            setSelectedOrder(null);
          }}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            activeTab === "orders"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          Order List
        </button>
        <button
          onClick={() => {
            setActiveTab("returns");
            setShowCreateModal(false);
            setShowViewModal(false);
            setSelectedOrder(null);
          }}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            activeTab === "returns"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          Supplier Returns
        </button>
        <button
          onClick={() => {
            setActiveTab("customer_returns");
            setShowCreateModal(false);
            setShowViewModal(false);
            setSelectedOrder(null);
          }}
          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            activeTab === "customer_returns"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          Customer Returns
        </button>
      </div>

      {activeTab === "orders" && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Orders</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
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
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export Orders
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, supplier, or status..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left">
                  {/* Header checkbox removed */}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expected Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No orders available</p>
                    <p className="text-sm text-gray-400 mt-1">Create a new order to start tracking purchases</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Row selection handled in Export Wizard */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatOrderId(order.order_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.supplier_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.expected_delivery || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.total_items}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewOrder(order.order_id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {order.status === "Pending" && (
                          <button
                            onClick={() => handleDeleteOrder(order.order_id)}
                            className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                            title="Archive Order"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        {(order.status === "Received" || order.status === "Cancelled") && (
                          <button
                            onClick={() => handleArchiveOrder(order.order_id)}
                            className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                            title="Archive Order"
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

        {filteredOrders.length > 0 && (
          <OrdersStyleTablePagination
            itemCount={filteredOrders.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>
      )}

      {activeTab === "returns" && <ProductReturns />}
      {activeTab === "customer_returns" && <CustomerReturns />}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Purchase Order</h2>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Supplier *
                  </label>
                  <select
                    value={newOrder.supplier_id}
                    onChange={(e) => setNewOrder((prev) => ({ ...prev, supplier_id: Number(e.target.value) }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Select Supplier</option>
                    {suppliers
                      .filter((s) => (s.status || "").toLowerCase() === "active")
                      .map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={newOrder.expected_delivery}
                    onChange={(e) => setNewOrder((prev) => ({ ...prev, expected_delivery: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Order Items *
                  </label>
                  <button
                    onClick={addOrderItem}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    + Add Item
                  </button>
                </div>

                {newOrder.items.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    Click "Add Item" to add products to this order
                  </p>
                )}

                <div className="space-y-3">
                  {newOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateOrderItem(index, "product_id", Number(e.target.value))}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                        >
                          <option value={0}>Select Product</option>
                          {products
                            .filter((p) => p.supplier_id === newOrder.supplier_id)
                            .map((p) => (
                              <option key={p.product_id} value={p.product_id}>
                                {p.product_name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, "quantity", Number(e.target.value))}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price || ""}
                          onChange={(e) => updateOrderItem(index, "unit_price", e.target.value ? Number(e.target.value) : null)}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                          placeholder="Unit Price"
                        />
                      </div>
                      <button
                        onClick={() => removeOrderItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order Details</h2>
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
                  <label className="text-sm text-gray-500 dark:text-gray-400">Order ID</label>
                  <p className="font-medium text-gray-900 dark:text-white">{formatOrderId(selectedOrder.order_id)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Supplier</label>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.supplier_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Expected Delivery</label>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedOrder.expected_delivery || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Created Date</label>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString() : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Received Date</label>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedOrder.received_at ? new Date(selectedOrder.received_at).toLocaleDateString() : "-"}
                  </p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Notes</label>
                  <p className="text-gray-900 dark:text-white mt-1">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Order Items
                </label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                          Product
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                          Quantity
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                          Unit Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedOrder.items?.map((item: PurchaseOrderItem) => (
                        <tr key={item.item_id}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.product_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {item.unit_price ? `₱${item.unit_price.toFixed(2)}` : "-"}
                          </td>
                        </tr>
                      ))}
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
              {selectedOrder.status === "Pending" && (
                <button
                  onClick={() => handleMarkAsReceived(selectedOrder.order_id)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Received
                </button>
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Archive Order</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">This can be restored later</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to archive order{" "}
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
                onClick={confirmArchiveOrder}
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
                    Archive Order
                  </>
                )}               </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Preview Modal */}
      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Orders"
        filename={`InvenSight_Orders_${new Date().toISOString().split('T')[0]}`}
        data={orders.map(o => ({
          id: o.order_id,
          "Order ID": formatOrderId(o.order_id),
          "Supplier": o.supplier_name,
          "Status": o.status,
          "Created At": o.created_at, // Field for date filtering
          "Expected Delivery": o.expected_delivery || "-",
          "Total Items": o.total_items,
          "Notes": o.notes || "-"
        }))}
      />
    </div>
  );
}

