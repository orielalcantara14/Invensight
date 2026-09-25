import { Search, Plus, Package, Eye, Trash2, CheckCircle, X, ChevronDown, Archive, Download, RefreshCw, AlertCircle, ArrowRight, History, PackageX } from "lucide-react";
import { exportToExcel } from "@/utils/export";
import { ExportPreviewModal } from "@/components/modals/ExportPreviewModal";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { api } from "@/services/api";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { toast } from "sonner";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types";
import { ProductReturns } from "./ProductReturns";
import { CustomerReturns } from "./CustomerReturns";
import { ProtectedAction } from "@/components/ProtectedAction";
import { ReceiveOrderModal } from "@/components/modals/ReceiveOrderModal";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";

const formatOrderId = (id?: string | null) => id || "-";

interface OrderItemInput {
  product_id: number;
  product_name: string;
  quantity: number | string;
  purchase_unit: string;
  conversion: string;
  conversion_rate: number;
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
  unit_of_measurement?: string;
}

export function Orders() {
  const [receiveModalNotReceivedMode, setReceiveModalNotReceivedMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
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
  const [trashTarget, setTrashTarget] = useState<{ id: string; displayId: string } | null>(null);
  const [trashing, setTrashing] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);

  // --- Replacement PO Modal State ---
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [replacementTarget, setReplacementTarget] = useState<PurchaseOrder | null>(null);
  const [replacementReason, setReplacementReason] = useState("Supplier price changed");
  const [replacementType, setReplacementType] = useState("Price Change");
  const [replacementDeliveryDate, setReplacementDeliveryDate] = useState("");
  const [replacementNotes, setReplacementNotes] = useState("");
  const [replacementItems, setReplacementItems] = useState<Array<{
    product_id: number;
    product_name: string;
    quantity: number | string;
    old_unit_price: number | null;
    new_unit_price: string;
  }>>([]);
  const [submittingReplacement, setSubmittingReplacement] = useState(false);

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
        supplier_id: p.supplier_id ?? undefined,
        unit_of_measurement: p.unit_of_measurement || "PCS",
      })));
      setCustomerReturnsCount(returnsRes.length);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        order.order_id.toLowerCase().includes(term) ||
        order.supplier_name.toLowerCase().includes(term) ||
        order.status.toLowerCase().includes(term) ||
        (order.notes && order.notes.toLowerCase().includes(term));

      const matchesStatus = !statusFilter || order.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesSupplier =
        !supplierFilter || order.supplier_name.toLowerCase() === supplierFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSupplier;
    });
  }, [orders, searchTerm, statusFilter, supplierFilter]);

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
    // Sort chronologically (oldest first) so the sequence ascends naturally (PO-000001, PO-000002, ...)
    const sortedChronological = [...orders].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeA - timeB;
    });
    sortedChronological.forEach((order, index) => {
      if (/^PO-\d{6}$/.test(order.order_id)) {
        map.set(order.order_id, order.order_id);
      } else {
        map.set(order.order_id, `PO-${String(index + 1).padStart(6, "0")}`);
      }
    });
    return map;
  }, [orders]);

  const formatOrderId = (orderId: string) => {
    if (/^PO-\d{6}$/.test(orderId)) return orderId;
    return orderIdDisplayMap.get(orderId) || orderId;
  };

  const overdueDeliveries = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return orders.filter(
      (o) =>
        o.status === "Pending" &&
        o.expected_delivery &&
        o.expected_delivery < todayStr
    );
  }, [orders]);

  const addOrderItem = () => {
    setNewOrder((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: 0,
          product_name: "",
          quantity: 1,
          purchase_unit: "BOX",
          conversion: "",
          conversion_rate: 1,
          unit_price: 0,
        },
      ],
    }));
  };

  const removeOrderItem = (index: number) => {
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const [reorderWarningDialog, setReorderWarningDialog] = useState<{
    open: boolean;
    messages: string[];
    onConfirm: () => void;
  }>({ open: false, messages: [], onConfirm: () => {} });

  const updateOrderItem = (index: number, field: keyof OrderItemInput, value: any) => {
    setNewOrder((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      if (field === "product_id") {
        const product = products.find((p) => p.product_id === value);
        if (product) {
          updatedItems[index].product_name = product.product_name;
          if (product.unit_price !== undefined) {
            updatedItems[index].unit_price = product.unit_price;
          }
        }
      } else if (field === "conversion") {
        const match = String(value).match(/(\d+)/);
        if (match) {
          updatedItems[index].conversion_rate = parseInt(match[1]) || 1;
        } else {
          updatedItems[index].conversion_rate = 1;
        }
      }
      return { ...prev, items: updatedItems };
    });
  };

  const handleCreateOrder = async (skipReorderCheck = false) => {
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

    const reorderWarnings: string[] = [];

    for (const item of newOrder.items) {
      if (!item.product_id) {
        toast.error("Please select a product for all items");
        return;
      }
      const qtyNum = Number(item.quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        toast.error("Quantity must be greater than 0");
        return;
      }
      if (item.unit_price === null || item.unit_price === undefined || Number(item.unit_price) <= 0) {
        toast.error("Please input a valid unit price");
        return;
      }
      const product = products.find((p) => p.product_id === item.product_id);
      if (product) {
        const reorderLevel = product.reorder_level ?? 10;
        if (qtyNum > reorderLevel) {
          reorderWarnings.push(`Reorder level for ${product.product_name} is set to ${reorderLevel} only.`);
        }
      }
    }

    if (reorderWarnings.length > 0 && !skipReorderCheck) {
      setReorderWarningDialog({
        open: true,
        messages: reorderWarnings,
        onConfirm: () => {
          setReorderWarningDialog((prev) => ({ ...prev, open: false }));
          handleCreateOrder(true);
        },
      });
      return;
    }

    try {
      const payload = {
        supplier_id: newOrder.supplier_id,
        expected_delivery: newOrder.expected_delivery,
        items: newOrder.items.map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity) || 1,
          unit_price: item.unit_price !== null ? Number(item.unit_price) : undefined,
          purchase_unit: item.purchase_unit || "PCS",
          conversion: item.conversion || "1 PCS / UNIT",
          conversion_rate: item.conversion_rate || 1,
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

  const handleMarkAsReceived = async (orderId: string, startInNotReceivedMode = false) => {
    try {
      const order = await api.getPurchaseOrder(orderId);
      setOrderToReceive(order);
      setReceiveModalNotReceivedMode(startInNotReceivedMode);
      setShowReceiveModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load order details for receiving");
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

  const handleMoveToTrash = (orderId: string) => {
    const displayId = formatOrderId(orderId);
    setTrashTarget({ id: orderId, displayId });
  };

  const confirmTrashOrder = async () => {
    if (!trashTarget) return;
    setTrashing(true);
    try {
      await api.deletePurchaseOrder(trashTarget.id);
      toast.success("Order moved to Deleted Folder");
      setTrashTarget(null);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to move order to Deleted Folder");
    } finally {
      setTrashing(false);
    }
  };

  const handleReturnDamagedItems = async () => {
    if (!selectedOrder || !selectedOrder.items) return;

    const damagedItems = selectedOrder.items
      .filter((item: any) => (item.damage_count || 0) > 0)
      .map((item: any) => ({
        product_id: item.product_id,
        quantity: item.damage_count,
      }));

    if (damagedItems.length === 0) {
      toast.error("No damaged items found in this order to return.");
      return;
    }

    try {
      setLoading(true);
      await api.createProductReturn({
        supplier_id: selectedOrder.supplier_id,
        reason: `Automated return for damaged items from order ${formatOrderId(selectedOrder.order_id)}`,
        items: damagedItems,
      });

      toast.success("Supplier return created for all damaged items");
      setShowViewModal(false);
      setActiveTab("returns"); // Switch to returns tab to see it
    } catch (error: any) {
      toast.error(error.message || "Failed to create supplier return");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReplacementModal = (order: PurchaseOrder) => {
    setReplacementTarget(order);
    setReplacementReason("Supplier price changed");
    setReplacementType("Price Change");
    const defDate = new Date();
    defDate.setDate(defDate.getDate() + 7);
    setReplacementDeliveryDate(order.expected_delivery || defDate.toISOString().split("T")[0]);
    setReplacementNotes(order.notes || "");
    const items = (order.items || []).map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      old_unit_price: item.unit_price,
      new_unit_price: item.unit_price !== null && item.unit_price !== undefined ? Number(item.unit_price).toFixed(2) : "",
    }));
    setReplacementItems(items);
    setShowViewModal(false);
    setShowReplacementModal(true);
  };

  const handleCreateReplacementPO = async () => {
    if (!replacementTarget) return;
    if (replacementItems.length === 0) {
      toast.error("No items found in this order.");
      return;
    }
    for (const item of replacementItems) {
      const qty = parseInt(String(item.quantity)) || 0;
      const price = parseFloat(item.new_unit_price);
      if (qty <= 0) {
        toast.error(`Quantity for ${item.product_name} must be greater than 0`);
        return;
      }
      if (isNaN(price) || price < 0) {
        toast.error(`Invalid unit price for ${item.product_name}`);
        return;
      }
    }

    setSubmittingReplacement(true);
    try {
      const res = await api.createReplacementPurchaseOrder({
        reference_order_id: replacementTarget.order_id,
        supplier_id: replacementTarget.supplier_id,
        expected_delivery: replacementDeliveryDate,
        replacement_reason: replacementReason,
        replacement_type: replacementType,
        notes: replacementNotes || undefined,
        items: replacementItems.map((i) => ({
          product_id: i.product_id,
          quantity: parseInt(String(i.quantity)) || 1,
          unit_price: parseFloat(i.new_unit_price) || 0,
        })),
      });

      toast.success(`Purchase order ${formatOrderId(replacementTarget.order_id)} voided. Replacement PO ${formatOrderId(res.order_id)} created!`);
      setShowReplacementModal(false);
      setReplacementTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create replacement purchase order");
    } finally {
      setSubmittingReplacement(false);
    }
  };

  const handleExport = () => {
    setIsExportModalOpen(true);
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
      case "Received":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Received
          </span>
        );
      case "Not Received":
      case "Did Not Receive":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Not Received
          </span>
        );
      case "Voided":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Voided
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-650 dark:text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            {status}
          </span>
        );
    }
  };

  const pendingCount = orders.filter((o) => o.status === "Pending").length;
  const receivedCount = orders.filter((o) => o.status === "Received").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Orders and Return</h1>
            <p className="text-muted-foreground mt-1">Track and manage supplier purchase orders</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Order
              </button>
            </ProtectedAction>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Orders</div>
          <div className="text-2xl font-bold text-foreground font-mono">{orders.length}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Pending Orders</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500 font-mono">{pendingCount}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Received Orders</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 font-mono">{receivedCount}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Customer Returns</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-500 font-mono">{customerReturnsCount}</div>
        </div>
      </div>

      {/* Overdue Expected Delivery Notice Banner */}
      {overdueDeliveries.length > 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Delivery Notice ({overdueDeliveries.length} order{overdueDeliveries.length > 1 ? "s" : ""} past expected delivery date)
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                These purchase orders have passed their expected arrival dates without being marked as received.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            {overdueDeliveries.slice(0, 3).map((od) => (
              <button
                key={od.order_id}
                onClick={() => {
                  handleMarkAsReceived(od.order_id);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Receive {formatOrderId(od.order_id)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border/50 mb-6 gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            setActiveTab("orders");
            setShowCreateModal(false);
            setShowViewModal(false);
            setSelectedOrder(null);
          }}
          className={`px-4 py-2 border-b-2 text-[10px] font-bold uppercase tracking-wider transition-all -mb-px ${
            activeTab === "orders"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
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
          className={`px-4 py-2 border-b-2 text-[10px] font-bold uppercase tracking-wider transition-all -mb-px ${
            activeTab === "returns"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
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
          className={`px-4 py-2 border-b-2 text-[10px] font-bold uppercase tracking-wider transition-all -mb-px ${
            activeTab === "customer_returns"
              ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Customer Returns
        </button>
      </div>

      {activeTab === "orders" && (
      <div className="bg-card rounded-lg shadow-xs border border-border/55">
        <div className="p-5 border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input
                  type="text"
                  placeholder="Search by order ID, supplier, status..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-border/60 bg-muted/20 hover:bg-muted/40 focus:bg-card rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="relative min-w-[135px]">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-border/60 bg-muted/20 hover:bg-muted/40 focus:bg-card rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground font-medium transition-all cursor-pointer appearance-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Received">Received</option>
                  <option value="Not Received">Not Received</option>
                  <option value="Voided">Voided</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>

              {/* Supplier Filter */}
              <div className="relative min-w-[150px] max-w-[200px]">
                <select
                  value={supplierFilter}
                  onChange={(e) => {
                    setSupplierFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-border/60 bg-muted/20 hover:bg-muted/40 focus:bg-card rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground font-medium transition-all cursor-pointer appearance-none truncate"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_name}>
                      {s.supplier_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>

              {(statusFilter || supplierFilter || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("");
                    setSupplierFilter("");
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-medium"
                  title="Clear all filters"
                >
                  <X className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              <DateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
              />
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 rounded-lg transition-colors border border-border/50 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Expected Delivery
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Items
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
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-xs italic">
                    Loading orders...
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">No orders available</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Create a new order to start tracking purchases</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.order_id} className="group hover:bg-muted/20 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-foreground font-mono">
                      <div className="flex flex-col gap-0.5">
                        <span className={cn(order.status === "Voided" ? "line-through text-muted-foreground" : "text-foreground font-bold")}>
                          {formatOrderId(order.order_id)}
                        </span>
                        {order.reference_po_id && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 font-sans flex-wrap">
                            ↳ Replaces {formatOrderId(order.reference_po_id)}
                            {order.origin_po_id && order.origin_po_id !== order.reference_po_id && (
                              <span className="text-muted-foreground font-normal">
                                (Origin: <span className="font-mono font-semibold text-foreground">{formatOrderId(order.origin_po_id)}</span>)
                              </span>
                            )}
                            {" • "}{order.replacement_type || "Price Change"}
                          </span>
                        )}
                        {order.replaced_by_po_id && (
                          <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1 font-sans">
                            ↳ Voided • Replaced by {formatOrderId(order.replaced_by_po_id)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground font-medium">
                      {order.supplier_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      <div className="flex flex-col gap-1">
                        <span>{order.expected_delivery || "-"}</span>
                        {order.status === "Pending" && order.expected_delivery && order.expected_delivery < new Date().toISOString().split("T")[0] && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded w-fit">
                            ● Past Due
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground font-mono font-semibold">
                      {order.total_items}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewOrder(order.order_id)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <ProtectedAction module="Orders" action="Delete">
                          <button
                            onClick={() => handleArchiveOrder(order.order_id)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction module="Orders" action="Delete">
                          <button
                            onClick={() => handleMoveToTrash(order.order_id)}
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
          <div className="bg-card rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Create Purchase Order</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Supplier *
                  </label>
                  <select
                    value={newOrder.supplier_id}
                    onChange={(e) => setNewOrder((prev) => ({ ...prev, supplier_id: Number(e.target.value) }))}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={newOrder.expected_delivery}
                    onChange={(e) => setNewOrder((prev) => ({ ...prev, expected_delivery: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-muted-foreground">
                    Order Items *
                  </label>
                  <button
                    onClick={addOrderItem}
                    className="text-sm font-semibold text-primary hover:text-blue-800 cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                {newOrder.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Click "Add Item" to add products to this order
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 bg-muted/30 rounded-t-lg">
                      <div className="flex-1 min-w-[180px]">ITEM / PRODUCT</div>
                      <div className="w-16 text-center">QTY</div>
                      <div className="w-28 text-center">PURCHASE UNIT</div>
                      <div className="w-36 text-center">CONVERSION</div>
                      <div className="w-28 text-right">UNIT PRICE</div>
                      <div className="w-28 text-right">TOTAL PRICE</div>
                      <div className="w-6"></div>
                    </div>

                    <div className="space-y-2.5">
                      {newOrder.items.map((item, index) => {
                        const rowQty = Number(item.quantity || 0);
                        const rowPrice = Number(item.unit_price || 0);
                        const rowTotal = rowQty * rowPrice;

                        return (
                          <div key={index} className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border/40">
                            <div className="flex-1 min-w-[180px]">
                              <SearchableSelect
                                value={item.product_id}
                                onValueChange={(val) => updateOrderItem(index, "product_id", val)}
                                options={products
                                  .filter((p) => !newOrder.supplier_id || p.supplier_id === newOrder.supplier_id)
                                  .map((p) => ({
                                    value: p.product_id,
                                    label: p.product_name,
                                  }))}
                                placeholder="Select Product"
                              />
                            </div>
                            <div className="w-16">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateOrderItem(index, "quantity", val === "" ? "" : Number(val));
                                }}
                                className="w-full border border-border rounded px-1.5 py-1.5 text-xs bg-card text-foreground font-medium text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Qty"
                              />
                            </div>
                            <div className="w-28">
                              <select
                                value={item.purchase_unit}
                                onChange={(e) => updateOrderItem(index, "purchase_unit", e.target.value)}
                                className="w-full border border-border rounded px-1.5 py-1.5 text-xs bg-card text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="BOX">BOX</option>
                                <option value="PCS">PCS</option>
                                <option value="SET">SET</option>
                                <option value="PACK">PACK</option>
                                <option value="ROLL">ROLL</option>
                                <option value="CAN">CAN</option>
                                <option value="BOTTLE">BOTTLE</option>
                                <option value="CASE">CASE</option>
                                <option value="TUBE">TUBE</option>
                                <option value="PAIR">PAIR</option>
                                <option value="TIN">TIN</option>
                                <option value="DRUM">DRUM</option>
                              </select>
                            </div>
                            <div className="w-36">
                              <input
                                type="text"
                                value={item.conversion || ""}
                                onChange={(e) => updateOrderItem(index, "conversion", e.target.value)}
                                className="w-full border border-border rounded px-2 py-1.5 text-xs bg-card text-foreground font-medium text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="e.g. 10 PCS / BOX"
                              />
                            </div>
                            <div className="w-28">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price !== null && item.unit_price !== undefined ? item.unit_price : ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateOrderItem(index, "unit_price", val === "" ? null : Number(val));
                                }}
                                className="w-full border border-border rounded px-2 py-1.5 text-xs bg-card text-foreground font-mono text-right focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="w-28 text-right font-mono font-bold text-xs text-foreground pr-1">
                              ₱{rowTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <button
                              onClick={() => removeOrderItem(index)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer w-6 flex justify-center"
                              title="Remove item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total Summary Footer */}
                    <div className="flex items-center justify-between mt-3 p-3 bg-muted/20 border border-border/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">
                        Total Items: <span className="font-bold text-foreground">{newOrder.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)}</span>
                      </div>
                      <div className="text-xs font-bold text-foreground">
                        Grand Total: <span className="text-sm text-blue-600 font-mono">₱{newOrder.items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Notes
                </label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Optional notes..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer font-semibold"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Order Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase">Order ID</label>
                  <p className="font-bold font-mono text-foreground">{formatOrderId(selectedOrder.order_id)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase">Status</label>
                  <p className="mt-0.5">
                    {getStatusBadge(selectedOrder.status)}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase">Supplier</label>
                  <p className="font-medium text-foreground">{selectedOrder.supplier_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase">Expected Delivery</label>
                  <p className="font-medium text-foreground">{selectedOrder.expected_delivery || "-"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase">Created Date</label>
                  <p className="font-medium text-foreground">
                    {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString() : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase">Received Date</label>
                  <p className="font-medium text-foreground">
                    {selectedOrder.received_at ? new Date(selectedOrder.received_at).toLocaleDateString() : "-"}
                  </p>
                </div>
                {selectedOrder.status === "Received" && (
                  <>
                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <label className="text-xs text-muted-foreground font-semibold uppercase">Receipt / Invoice #</label>
                      <p className="font-bold text-primary font-mono">{selectedOrder.receipt_number || "-"}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                      <label className="text-xs text-red-600 font-semibold uppercase">Total Damages</label>
                      <p className="font-bold text-red-700 dark:text-red-300 font-mono">
                        {selectedOrder.items?.reduce((sum: number, item: any) => sum + (item.damage_count || 0), 0)} PCS
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Not Received Information Card */}
              {selectedOrder.status === "Not Received" && (
                <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Non-Delivery Record
                    </span>
                    <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">
                      Not Received
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <span className="block text-[10px] text-muted-foreground font-semibold uppercase">Reason / User Note</span>
                    <p className="font-medium text-foreground bg-card/60 p-3 rounded-lg border border-border/50 text-xs leading-relaxed">
                      {selectedOrder.notes || "No specific note provided."}
                    </p>
                  </div>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 italic">
                    This purchase order was recorded as Not Received and no items were added to inventory.
                  </p>
                </div>
              )}

              {/* Void Information Card */}
              {selectedOrder.status === "Voided" && (
                <div className="bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Void Information</span>
                    <span className="text-[10px] font-bold bg-red-100 dark:bg-red-950/50 text-red-700 px-2 py-0.5 rounded-full">Voided</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] text-muted-foreground font-semibold uppercase">Reason</span>
                      <span className="font-semibold text-foreground">{selectedOrder.void_reason || selectedOrder.replacement_reason || "Supplier price changed"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground font-semibold uppercase">Voided Date</span>
                      <span className="font-semibold text-foreground">{selectedOrder.voided_at ? new Date(selectedOrder.voided_at).toLocaleDateString() : "-"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground font-semibold uppercase">Voided By</span>
                      <span className="font-semibold text-foreground">{selectedOrder.voided_by_name || "Administrator"}</span>
                    </div>
                  </div>
                  {(selectedOrder.replaced_by_po_id || (selectedOrder.forward_chain && selectedOrder.forward_chain.length > 0)) && (
                    <div className="pt-2.5 border-t border-red-200/60 dark:border-red-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-1.5 flex-wrap">
                        <span>Replaced by:</span>
                        <button
                          type="button"
                          onClick={() => handleViewOrder(selectedOrder.latest_po_id || selectedOrder.replaced_by_po_id!)}
                          className="font-bold font-mono underline hover:text-red-900 dark:hover:text-red-100 cursor-pointer"
                        >
                          {formatOrderId(selectedOrder.latest_po_id || selectedOrder.replaced_by_po_id)}
                        </button>
                        {selectedOrder.latest_po_id && selectedOrder.latest_po_id !== selectedOrder.replaced_by_po_id && (
                          <span className="text-[10px] font-sans bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded text-red-800 dark:text-red-200">
                            Latest Active Version
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleViewOrder(selectedOrder.latest_po_id || selectedOrder.replaced_by_po_id!)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs cursor-pointer w-fit"
                      >
                        View Active Replacement PO
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-red-600 italic">
                    This PO is voided and will not be used for receiving items.
                  </p>
                </div>
              )}

              {/* Stacked Replacement Lineage & Origin Trace Box */}
              {(selectedOrder.reference_po_id || (selectedOrder.origin_chain && selectedOrder.origin_chain.length > 0)) && (
                <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 dark:border-blue-900/40 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider block">
                          Replacement & Origin Lineage
                        </span>
                        <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                          {(selectedOrder.origin_chain?.length || 1) + 1} Total Versions in this PO chain
                        </span>
                      </div>
                    </div>

                    {selectedOrder.origin_po_id && (
                      <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/50 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-800 dark:text-blue-300 w-fit">
                        <span>Origin:</span>
                        <button
                          type="button"
                          onClick={() => handleViewOrder(selectedOrder.origin_po_id!)}
                          className="font-mono font-bold text-blue-700 dark:text-blue-300 underline hover:text-blue-950 dark:hover:text-blue-100 cursor-pointer"
                        >
                          {formatOrderId(selectedOrder.origin_po_id)}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Flow Breadcrumb / Progression */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs no-scrollbar">
                    {selectedOrder.origin_chain && selectedOrder.origin_chain.length > 0 ? (
                      <>
                        {selectedOrder.origin_chain.map((ancestor, idx) => (
                          <div key={ancestor.order_id} className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleViewOrder(ancestor.order_id)}
                              className="px-2.5 py-1 rounded-md bg-card hover:bg-muted text-foreground border border-border/60 text-xs font-mono font-bold shadow-2xs hover:border-blue-400 transition-all flex items-center gap-1.5 cursor-pointer"
                              title={`View ${formatOrderId(ancestor.order_id)}`}
                            >
                              <span>{formatOrderId(ancestor.order_id)}</span>
                              <span className="text-[9px] font-sans font-medium px-1 rounded bg-muted text-muted-foreground">
                                {idx === 0 ? "Origin" : `v${idx + 1}`}
                              </span>
                            </button>
                            <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          </div>
                        ))}
                        <div className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-mono font-bold shadow-2xs flex items-center gap-1.5 shrink-0">
                          <span>{formatOrderId(selectedOrder.order_id)}</span>
                          <span className="text-[9px] font-sans font-medium px-1 rounded bg-blue-700 text-blue-100">
                            Current
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleViewOrder(selectedOrder.reference_po_id!)}
                          className="px-2.5 py-1 rounded-md bg-card hover:bg-muted text-foreground border border-border/60 text-xs font-mono font-bold shadow-2xs hover:border-blue-400 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <span>{formatOrderId(selectedOrder.reference_po_id)}</span>
                          <span className="text-[9px] font-sans font-medium px-1 rounded bg-muted text-muted-foreground">
                            Origin
                          </span>
                        </button>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <div className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-mono font-bold shadow-2xs flex items-center gap-1.5 shrink-0">
                          <span>{formatOrderId(selectedOrder.order_id)}</span>
                          <span className="text-[9px] font-sans font-medium px-1 rounded bg-blue-700 text-blue-100">
                            Current
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Stacked Ancestors Cards with Scroll Container */}
                  <div className="space-y-2.5 pt-1">
                    {selectedOrder.origin_chain && selectedOrder.origin_chain.length > 0 ? (
                      <div className="max-h-[220px] overflow-y-auto pr-1.5 space-y-2.5 scrollbar-thin">
                        {selectedOrder.origin_chain.map((step, sIdx) => {
                          const isRoot = sIdx === 0;
                          return (
                            <div
                              key={step.order_id}
                              className={cn(
                                "p-3 rounded-xl bg-card border border-border/60 transition-all space-y-1.5",
                                isRoot ? "border-l-4 border-l-blue-600 shadow-2xs" : "border-l-4 border-l-amber-500"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                    {isRoot ? "Version 1 • Origin PO" : `Version ${sIdx + 1} • Replaced PO`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleViewOrder(step.order_id)}
                                    className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                  >
                                    {formatOrderId(step.order_id)}
                                  </button>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
                                  {step.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                                {step.replacement_type && (
                                  <div>
                                    <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase block">Type</span>
                                    <span className="font-semibold text-foreground">{step.replacement_type}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase block">Reason</span>
                                  <span className="font-medium text-foreground">
                                    {step.replacement_reason || step.void_reason || "Voided and replaced by subsequent order"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase block">Voided Date</span>
                                  <span className="font-mono">
                                    {step.voided_at ? new Date(step.voided_at).toLocaleDateString() : step.created_at ? new Date(step.created_at).toLocaleDateString() : "-"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-card border border-border/60 border-l-4 border-l-blue-600 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              Origin PO
                            </span>
                            <button
                              type="button"
                              onClick={() => handleViewOrder(selectedOrder.reference_po_id!)}
                              className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {formatOrderId(selectedOrder.reference_po_id)}
                            </button>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
                            Voided
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase block">Type</span>
                            <span className="font-semibold text-foreground">{selectedOrder.replacement_type || "Price / Quantity Adjustment"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase block">Reason</span>
                            <span className="font-medium text-foreground">{selectedOrder.replacement_reason || "Supplier price changed"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Current Order (Leaf / Active Version) */}
                    <div className="p-3 rounded-xl bg-blue-100/40 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-800 border-l-4 border-l-emerald-600 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                            Current Active Order
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {formatOrderId(selectedOrder.order_id)}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          {selectedOrder.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-950 dark:text-blue-200">
                        {selectedOrder.replacement_reason
                          ? `Replaces ${formatOrderId(selectedOrder.reference_po_id)} due to: ${selectedOrder.replacement_reason}`
                          : `Replaces ${formatOrderId(selectedOrder.reference_po_id)}.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Notes</label>
                  <p className="text-sm text-foreground mt-1 bg-muted/20 p-2.5 rounded-lg border border-border/50">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-foreground mb-2 block uppercase tracking-wider">
                  Order Items
                </label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase">
                          ITEM / PRODUCT
                        </th>
                        <th className="px-3 py-2.5 text-center font-bold text-muted-foreground uppercase">
                          QTY
                        </th>
                        <th className="px-3 py-2.5 text-center font-bold text-muted-foreground uppercase">
                          PURCHASE UNIT
                        </th>
                        <th className="px-3 py-2.5 text-center font-bold text-muted-foreground uppercase">
                          CONVERSION
                        </th>
                        <th className="px-3 py-2.5 text-right font-bold text-muted-foreground uppercase">
                          UNIT PRICE
                        </th>
                        <th className="px-4 py-2.5 text-right font-bold text-muted-foreground uppercase">
                          TOTAL PRICE
                        </th>
                        {selectedOrder.status === "Received" && (
                          <th className="px-3 py-2.5 text-center font-bold text-red-600 uppercase">
                            DAMAGES
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedOrder.items?.map((item: PurchaseOrderItem) => (
                        <tr key={item.item_id}>
                          <td className="px-4 py-3 font-medium text-foreground">{item.product_name}</td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-foreground">{item.quantity}</td>
                          <td className="px-3 py-3 text-center font-medium text-muted-foreground">{item.purchase_unit || "PCS"}</td>
                          <td className="px-3 py-3 text-center font-medium text-muted-foreground">{item.conversion || "1 PCS / UNIT"}</td>
                          <td className="px-3 py-3 text-right font-mono text-foreground">
                            {item.unit_price ? `₱${Number(item.unit_price).toFixed(2)}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                            {item.unit_price ? `₱${(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}` : "-"}
                          </td>
                          {selectedOrder.status === "Received" && (
                            <td className="px-3 py-3 text-center text-red-600 font-bold font-mono">
                              {item.damage_count || 0} PCS
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grand Total Bar */}
                <div className="flex items-center justify-between mt-3 p-3 bg-muted/20 border border-border/50 rounded-lg">
                  <div className="text-xs text-muted-foreground">
                    Total Quantity: <span className="font-bold text-foreground">{selectedOrder.items?.reduce((sum, it) => sum + Number(it.quantity || 0), 0)}</span>
                  </div>
                  <div className="text-xs font-bold text-foreground">
                    Grand Total: <span className="text-sm text-blue-600 font-mono">₱{selectedOrder.items?.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 border-t border-border bg-muted/10">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/50 transition-all cursor-pointer w-fit"
              >
                Close
              </button>

              <div className="flex flex-wrap items-center gap-2.5 justify-end">
                {selectedOrder.status === "Pending" && (
                  <>
                    <ProtectedAction module="Orders" action="Edit">
                      <button
                        type="button"
                        onClick={() => handleOpenReplacementModal(selectedOrder)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Create Replacement PO
                      </button>
                    </ProtectedAction>
                    <ProtectedAction module="Orders" action="Edit">
                      <button
                        type="button"
                        onClick={() => {
                          setShowViewModal(false);
                          handleMarkAsReceived(selectedOrder.order_id, true);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 border border-rose-500/25 rounded-xl shadow-xs text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                      >
                        <PackageX className="w-4 h-4" />
                        Did Not Receive
                      </button>
                    </ProtectedAction>
                    <ProtectedAction module="Orders" action="Edit">
                      <button
                        type="button"
                        onClick={() => {
                          setShowViewModal(false);
                          handleMarkAsReceived(selectedOrder.order_id, false);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark as Received
                      </button>
                    </ProtectedAction>
                  </>
                )}
                {selectedOrder.status === "Received" && selectedOrder.items?.some((i: any) => (i.damage_count || 0) > 0) && (
                  <button
                    type="button"
                    onClick={handleReturnDamagedItems}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-xs text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                  >
                    <Archive className="w-4 h-4" />
                    Return Damaged to Supplier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE REPLACEMENT PURCHASE ORDER MODAL */}
      {showReplacementModal && replacementTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-card bg-background rounded-2xl shadow-2xl max-w-2xl w-full border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">Create Replacement Purchase Order</h2>
                  <p className="text-xs text-muted-foreground">Original PO {formatOrderId(replacementTarget.order_id)} will be marked as Voided</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReplacementModal(false);
                  setReplacementTarget(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-muted/20 p-3 sm:p-4 rounded-xl border border-border/50">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Reference PO</label>
                  <p className="font-bold text-foreground font-mono text-sm">{formatOrderId(replacementTarget.order_id)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Supplier</label>
                  <p className="font-bold text-foreground text-sm truncate">{replacementTarget.supplier_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Reason for Replacement
                  </label>
                  <select
                    value={replacementReason}
                    onChange={(e) => {
                      setReplacementReason(e.target.value);
                      if (e.target.value === "Supplier Price Change") setReplacementType("Price Change");
                      else if (e.target.value === "Quantity Adjustment") setReplacementType("Quantity Adjustment");
                      else if (e.target.value.includes("Stock")) setReplacementType("Item Change");
                      else setReplacementType("Other");
                    }}
                    className="w-full border border-border/60 bg-muted/20 hover:bg-muted/40 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 text-foreground transition-all cursor-pointer"
                  >
                    <option value="Supplier price changed">Supplier Price Change</option>
                    <option value="Supplier stock availability change">Supplier Stock / Item Change</option>
                    <option value="Quantity adjustment requested">Quantity Adjustment</option>
                    <option value="Damaged / incorrect specifications">Damaged / Incorrect Specifications</option>
                    <option value="Other replacement reason">Other Reason</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={replacementDeliveryDate}
                    onChange={(e) => setReplacementDeliveryDate(e.target.value)}
                    className="w-full border border-border/60 bg-muted/20 hover:bg-muted/40 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 text-foreground transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                  Order Items & Pricing
                </label>
                <div className="border border-border rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                        <th className="px-3 py-2.5 text-center font-bold text-muted-foreground uppercase tracking-wider w-20">Qty</th>
                        <th className="px-3 py-2.5 text-right font-bold text-muted-foreground uppercase tracking-wider w-24">Old Price</th>
                        <th className="px-3 py-2.5 text-right font-bold text-muted-foreground uppercase tracking-wider w-32">New Unit Price</th>
                        <th className="px-4 py-2.5 text-right font-bold text-muted-foreground uppercase tracking-wider w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 bg-card">
                      {replacementItems.map((item, idx) => {
                        const priceNum = parseFloat(item.new_unit_price) || 0;
                        const qtyNum = parseInt(String(item.quantity)) || 0;
                        const lineTotal = priceNum * qtyNum;
                        return (
                          <tr key={item.product_id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground">{item.product_name}</td>
                            <td className="px-3 py-3 text-center">
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => {
                                  const clean = e.target.value;
                                  if (clean === "" || /^\d+$/.test(clean)) {
                                    setReplacementItems((prev) =>
                                      prev.map((it, i) => (i === idx ? { ...it, quantity: clean } : it))
                                    );
                                  }
                                }}
                                onBlur={() => {
                                  setReplacementItems((prev) =>
                                    prev.map((it, i) => {
                                      if (i !== idx) return it;
                                      const parsed = parseInt(String(it.quantity));
                                      return { ...it, quantity: isNaN(parsed) || parsed <= 0 ? 1 : parsed };
                                    })
                                  );
                                }}
                                className="w-16 text-center border border-border/60 rounded-lg py-1 px-1 text-xs font-mono font-bold bg-muted/20 outline-none focus:border-zinc-400 text-foreground"
                              />
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-muted-foreground line-through">
                              {item.old_unit_price !== null ? `₱${Number(item.old_unit_price).toFixed(2)}` : "-"}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="relative flex items-center justify-end">
                                <span className="absolute left-2 text-[10px] text-muted-foreground font-mono">₱</span>
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={item.new_unit_price}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/,/g, "");
                                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                      setReplacementItems((prev) =>
                                        prev.map((it, i) => (i === idx ? { ...it, new_unit_price: val } : it))
                                      );
                                    }
                                  }}
                                  onBlur={() => {
                                    setReplacementItems((prev) =>
                                      prev.map((it, i) => {
                                        if (i !== idx) return it;
                                        if (it.new_unit_price === "") return it;
                                        const num = parseFloat(it.new_unit_price);
                                        return { ...it, new_unit_price: isNaN(num) ? "" : num.toFixed(2) };
                                      })
                                    );
                                  }}
                                  className="w-24 pl-5 pr-2 py-1 text-right border border-border/60 rounded-lg text-xs font-mono font-bold bg-muted/20 outline-none focus:border-zinc-400 text-foreground"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                              ₱{lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t border-border">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right font-bold text-muted-foreground uppercase text-xs">
                          Grand Total
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-extrabold text-foreground text-sm">
                          ₱{replacementItems.reduce((sum, item) => sum + ((parseFloat(item.new_unit_price) || 0) * (parseInt(String(item.quantity)) || 0)), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">
                  Replacement Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Additional notes for replacement PO..."
                  value={replacementNotes}
                  onChange={(e) => setReplacementNotes(e.target.value)}
                  className="w-full border border-border/60 bg-muted/20 hover:bg-muted/40 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-zinc-400 text-foreground transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-card">
              <button
                onClick={() => {
                  setShowReplacementModal(false);
                  setReplacementTarget(null);
                }}
                disabled={submittingReplacement}
                className="px-4 py-2.5 text-xs font-bold text-muted-foreground border border-border rounded-xl hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReplacementPO}
                disabled={submittingReplacement}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 text-zinc-50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {submittingReplacement ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating Replacement...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Create Replacement PO
                  </>
                )}
              </button>
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
                  <h3 className="text-lg font-semibold text-foreground text-foreground">Archive Order</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">This can be restored later</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-muted-foreground dark:text-gray-300">
                Are you sure you want to archive order{" "}
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
                  <h3 className="text-lg font-semibold text-foreground text-foreground">Move Order to Deleted Folder</h3>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">30-day retention countdown</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-muted-foreground dark:text-gray-300">
                Are you sure you want to move order{" "}
                <span className="font-semibold text-foreground text-foreground">"{trashTarget.displayId}"</span> to the Deleted Folder?
              </p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/70 mt-2">
                This order will remain in the Deleted Folder for 30 days before permanent deletion.
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
                onClick={confirmTrashOrder}
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

      <ReceiveOrderModal
        isOpen={showReceiveModal}
        onClose={() => {
          setShowReceiveModal(false);
          setOrderToReceive(null);
          setReceiveModalNotReceivedMode(false);
        }}
        onSuccess={() => {
          setShowViewModal(false);
          loadData();
        }}
        order={orderToReceive}
        initialNotReceivedMode={receiveModalNotReceivedMode}
      />

      {/* Reorder Level Warning Dialog */}
      {reorderWarningDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card rounded-2xl p-6 shadow-2xl max-w-md w-full border border-border">
            <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">Reorder Level Warning</h3>
            <div className="space-y-2 mb-6">
              {reorderWarningDialog.messages.map((msg, idx) => (
                <p key={idx} className="text-sm font-medium text-foreground">{msg}</p>
              ))}
              <p className="text-xs text-muted-foreground mt-3 font-semibold">Do you want to proceed creating this purchase order?</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReorderWarningDialog((prev) => ({ ...prev, open: false }))}
                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={reorderWarningDialog.onConfirm}
                className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

