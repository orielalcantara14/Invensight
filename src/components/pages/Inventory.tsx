import { Search, Download, Package, Edit2, Trash2, Eye, AlertTriangle, Archive, ChevronLeft, Plus, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { api, type InventoryItem } from "@/services/api";
import { ProtectedAction } from "../ProtectedAction";
import { EditInventoryModal } from "../modals/EditInventoryModal";
import { BulkRestockModal } from "../modals/BulkRestockModal";
import { InventoryTraceModal } from "../modals/InventoryTraceModal";
import { DeleteConfirmationModal } from "../modals/DeleteConfirmationModal";
import { toast } from "sonner";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { ExportPreviewModal } from "../modals/ExportPreviewModal";
import { exportToExcel } from "@/utils/export";
import { AddProductModal } from "../modals/AddProductModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [categories, setCategories] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [traceItem, setTraceItem] = useState<InventoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<"archive" | "trash">("archive");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isBulkRestockOpen, setIsBulkRestockOpen] = useState(false);
  
  const [searchParams] = useSearchParams();

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const [invItems, cats] = await Promise.all([
        api.getInventoryItems(),
        api.getCategories()
      ]);
      setItems(invItems);
      setCategories(cats);
      
      // Handle initial search from URL
      const initialSearch = searchParams.get("search");
      if (initialSearch) {
        setSearchTerm(initialSearch);
      }
      
      const initialStatus = searchParams.get("status");
      if (initialStatus) {
        setFilterStatus(initialStatus);
      }
    } catch (error) {
      console.error("Inventory fetch error:", error);
      toast.error("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = async (id: number, productName: string) => {
    setItemToDelete({ id, name: productName });
    setConfirmationMode("archive");
    setDeleteModalOpen(true);
  };

  const handleMoveToTrash = async (id: number, productName: string) => {
    setItemToDelete({ id, name: productName });
    setConfirmationMode("trash");
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      if (confirmationMode === "archive") {
        await api.deleteInventoryItem(itemToDelete.id);
        toast.success("Inventory item moved to Archive");
      } else {
        await api.moveInventoryToTrash(itemToDelete.id);
        toast.success("Inventory item moved to Trash folder");
      }
      fetchInventory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.specific_category?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (item.unit_of_measurement?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (item.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (item.reason_adjustment?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = filterStatus === "All" || item.status === filterStatus;
    const matchesCategory = filterCategory === "All" || item.category_name === filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handleExport = () => {
    const data = filteredItems.map(item => ({
      "Product Name": item.product_name,
      "SKU": item.sku,
      "Supplier": item.supplier_name || "-",
      "Category": item.category_name,
      "Specific Category": item.specific_category || "-",
      "Unit Measurement": item.unit_of_measurement || "-",
      "Unit Cost": item.unit_price,
      "Total Cost": (item.unit_price ?? 0) * (item.quantity ?? 0),
      "Quantity": item.quantity,
      "Expected": item.expected,
      "Actual": item.actual,
      "Reorder Level": item.reorder_level,
      "Status": item.status,
      "Difference": item.difference
    }));
    exportToExcel(data, "Inventory_Export");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterCategory]);

  const outOfStockCount = items.filter(item => item.status === "Out of Stock").length;
  const lowCount = items.filter(item => item.status === "Low").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {(searchParams.get("from") === "products" || sessionStorage.getItem("fromProducts") === "true") && (
              <Link
                to="/products"
                onClick={() => sessionStorage.removeItem("fromProducts")}
                className="flex items-center justify-center p-2 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 border border-border hover:border-blue-200 rounded-xl transition-all shadow-sm group"
                title="Back to Products"
              >
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
              </Link>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">Inventory Management</h1>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground/70 mt-1">Monitor and manage stock levels</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ProtectedAction module="Archive" action="View">
              <Link
                to="/archive?stage=Archived&tab=inventory"
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
              >
                <Archive className="w-4 h-4" />
                Archive
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Archive" action="Delete">
              <Link
                to="/archive?stage=Deleted&tab=inventory"
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
                title="View deleted items"
              >
                <Trash2 className="w-4 h-4" />
                Trash
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Inventory" action="Edit">
              <button 
                onClick={() => setIsBulkRestockOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all shadow-sm font-medium text-xs sm:text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Bulk Adjust / Restock
              </button>
            </ProtectedAction>
            <ProtectedAction module="Products" action="Add">
              <button 
                onClick={() => setIsAddProductOpen(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-sm font-medium text-xs sm:text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </ProtectedAction>
          </div>
        </div>
      </div>

      {/* Out of Stock Alert Banner */}
      {outOfStockCount > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Out of Stock Alert</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              You have <strong>{outOfStockCount}</strong> product{outOfStockCount > 1 ? "s" : ""} that {outOfStockCount > 1 ? "are" : "is"} currently out of stock.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-card p-4 sm:p-5 rounded-xl border border-border/50 shadow-xs">
          <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Total Items</div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{items.length}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-xl border border-border/50 shadow-xs">
          <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Normal Stock</div>
          <div className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">{items.filter(i => i.status === 'Normal').length}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-xl border border-border/50 shadow-xs">
          <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Low Stock</div>
          <div className="text-2xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">{lowCount}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-xl border border-red-200/60 dark:border-red-900/40 shadow-xs">
          <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Out of Stock</div>
          <div className="text-2xl font-semibold tracking-tight text-red-600 dark:text-red-400">{outOfStockCount}</div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_name}>{c.category_name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all"
              >
                <option value="All">All Statuses</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Archived">Archived</option>
              </select>
              <ProtectedAction module="Inventory" action="Export">
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </ProtectedAction>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-border/40">
              <tr>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Product Name (Batch ID)
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  SKU
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Supplier
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Category
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Specific Category
                </th>
                <th className="px-6 py-3.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Unit Measurement
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help border-b border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 pb-0.5 transition-colors">
                        Quantity
                        <Info className="w-3 h-3 text-zinc-400" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] text-xs font-normal normal-case">
                      The total physical units of this product currently in stock.
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help border-b border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 pb-0.5 transition-colors">
                        Expected
                        <Info className="w-3 h-3 text-zinc-400" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] text-xs font-normal normal-case">
                      The quantity expected to be in stock based on system transaction records.
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help border-b border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 pb-0.5 transition-colors">
                        Actual
                        <Info className="w-3 h-3 text-zinc-400" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] text-xs font-normal normal-case">
                      The physical count of units physically present in inventory from the latest count.
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="px-6 py-3.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  <div className="flex justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help border-b border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 pb-0.5 transition-colors">
                          Difference
                          <Info className="w-3 h-3 text-zinc-400" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-xs font-normal normal-case">
                        The discrepancy between Actual and Expected stock levels (Actual - Expected).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help border-b border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 pb-0.5 transition-colors">
                        Reorder Level
                        <Info className="w-3 h-3 text-zinc-400" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] text-xs font-normal normal-case">
                      The minimum stock threshold. Restocks are triggered when stock falls to or below this level.
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-3.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest w-32 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">No inventory items found</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Add items to start managing your inventory</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr 
                    key={item.inventory_id} 
                    className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div className="max-w-[260px] truncate font-medium" title={item.product_name}>
                        {item.product_name} <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500 ml-1">(ID: {item.inventory_id})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="max-w-[140px] truncate" title={item.supplier_name || ""}>
                        {item.supplier_name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="inline-flex max-w-[160px] truncate px-1.5 py-0.5 text-[9px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded uppercase tracking-wider"
                        title={item.category_name}
                      >
                        {item.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="max-w-[140px] truncate" title={item.specific_category || ""}>
                        {item.specific_category || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      <div className="max-w-[100px] truncate" title={item.unit_of_measurement || ""}>
                        {item.unit_of_measurement || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-zinc-500 dark:text-zinc-400">
                      {item.expected}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-zinc-500 dark:text-zinc-400">
                      {item.actual}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-center font-medium">
                      <span className={item.difference < 0 ? "text-red-500 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}>
                        {item.difference > 0 ? `+${item.difference}` : item.difference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-zinc-500 dark:text-zinc-400">
                      {item.reorder_level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'Archived'
                            ? 'bg-zinc-400 dark:bg-zinc-500'
                            : item.status === 'Out of Stock' 
                            ? 'bg-red-500 animate-pulse' 
                            : item.status === 'Low' 
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`} />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setTraceItem(item)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <ProtectedAction module="Inventory" action="Edit">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction module="Inventory" action="Delete">
                          <button
                            onClick={() => handleDelete(item.inventory_id, item.product_name)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction module="Inventory" action="Delete">
                          <button
                            onClick={() => handleMoveToTrash(item.inventory_id, item.product_name)}
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
        {!isLoading && (
          <OrdersStyleTablePagination
            itemCount={filteredItems.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>

      <EditInventoryModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={fetchInventory}
        item={editingItem}
      />

      <InventoryTraceModal
        isOpen={!!traceItem}
        onClose={() => setTraceItem(null)}
        item={traceItem}
        inventoryId={traceItem?.inventory_id ?? null}
        title="Inventory Discrepancy Details"
        onSuccess={fetchInventory}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={confirmationMode === "archive" ? "Archive Inventory Item" : "Move to Trash"}
        message={
          confirmationMode === "archive" 
            ? "Are you sure you want to move this inventory item to the Archive? This will NOT affect the Master Product List."
            : "Are you sure you want to move this inventory item to the Deleted Folder? It will be preserved there before permanent removal."
        }
        itemName={itemToDelete?.name}
        isDeleting={isDeleting}
      />

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Inventory"
        filename={`InvenSight_Inventory_${new Date().toISOString().split('T')[0]}`}
        data={items.map(i => ({
          id: i.inventory_id,
          "Product": i.product_name,
          "SKU": i.sku,
          "Supplier": i.supplier_name || "-",
          "Category": i.category_name,
          "Cost": i.unit_price,
          "Qty": i.quantity,
          "Actual": i.actual,
          "Status": i.status,
          "Last Updated": i.last_updated
        }))}
      />
      <AddProductModal 
        isOpen={isAddProductOpen} 
        onClose={() => setIsAddProductOpen(false)} 
        onSuccess={fetchInventory} 
      />
      <BulkRestockModal
        isOpen={isBulkRestockOpen}
        onClose={() => setIsBulkRestockOpen(false)}
        onSuccess={fetchInventory}
        items={items}
      />
    </div>
  );
}
