import { Search, Download, Package, Edit2, Trash2, Eye, AlertTriangle, Archive, ChevronLeft, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api, type InventoryItem } from "@/services/api";
import { ProtectedAction } from "../ProtectedAction";
import { EditInventoryModal } from "../modals/EditInventoryModal";
import { InventoryTraceModal } from "../modals/InventoryTraceModal";
import { DeleteConfirmationModal } from "../modals/DeleteConfirmationModal";
import { toast } from "sonner";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { ExportPreviewModal } from "../modals/ExportPreviewModal";
import { exportToExcel } from "@/utils/export";
import { AddProductModal } from "../modals/AddProductModal";

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
      "Expiry Date": item.expiry_date || "-",
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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
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
              <h1 className="text-3xl font-bold text-foreground text-foreground leading-tight">Inventory Management</h1>
              <p className="text-muted-foreground dark:text-muted-foreground/70 mt-1">Monitor and manage stock levels</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProtectedAction module="Archive" action="View">
              <Link
                to="/archive?stage=Archived&tab=inventory"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
              >
                <Archive className="w-4 h-4" />
                Archive
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Archive" action="Delete">
              <Link
                to="/archive?stage=Deleted&tab=inventory"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
                title="View deleted items"
              >
                <Trash2 className="w-4 h-4" />
                Trash
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Products" action="Add">
              <button 
                onClick={() => setIsAddProductOpen(true)}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-sm font-medium"
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-card bg-card p-6 rounded-xl shadow-sm border border-border border-border">
          <div className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/70 mb-1">Total Items</div>
          <div className="text-2xl font-bold text-foreground text-foreground">{items.length}</div>
        </div>
        <div className="bg-card bg-card p-6 rounded-xl shadow-sm border border-border border-border">
          <div className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/70 mb-1">Normal Stock</div>
          <div className="text-2xl font-bold text-green-600">{items.filter(i => i.status === 'Normal').length}</div>
        </div>
        <div className="bg-card bg-card p-6 rounded-xl shadow-sm border border-border border-border">
          <div className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/70 mb-1">Low Stock</div>
          <div className="text-2xl font-bold text-orange-600">{lowCount}</div>
        </div>
        <div className="bg-card bg-card p-6 rounded-xl shadow-sm border border-red-200 dark:border-red-800">
          <div className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/70 mb-1">Out of Stock</div>
          <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card bg-card rounded-xl shadow-sm border border-border border-border overflow-hidden">
        <div className="p-6 border-b border-border border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-foreground text-foreground">Inventory Items</h2>
            <div className="flex items-center gap-3">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 bg-muted/50 bg-background/50 border border-border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-foreground transition-all"
              >
                <option value="All">Category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_name}>{c.category_name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-muted/50 bg-background/50 border border-border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-foreground transition-all"
              >
                <option value="All">All Status</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Archived">Archived</option>
              </select>
              <ProtectedAction module="Inventory" action="Export">
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export Inventory
                </button>
              </ProtectedAction>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/50 bg-background/50 border border-border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-foreground transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8F9FA] bg-background/50 border-b border-border border-border">
              <tr>
                <th className="px-6 py-4 text-left">
                  {/* Removed checkbox for export */}
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  Product Name (Batch ID)
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  Specific Category
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider text-center">
                  Unit Measurement
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  Expected
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  Difference
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground/70 dark:text-muted-foreground uppercase tracking-wider">
                  Reorder Level
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-muted-foreground" />
                    <p className="text-muted-foreground dark:text-muted-foreground/70 font-medium">No inventory items found</p>
                    <p className="text-sm text-muted-foreground/70 dark:text-muted-foreground mt-1">Add items to start managing your inventory</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr 
                    key={item.inventory_id} 
                    className="hover:bg-muted/50 dark:hover:bg-gray-900/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Empty cell for layout consistency if needed, but we can just remove it */}
                    </td>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground text-foreground">
                      <div className="max-w-[260px] truncate" title={item.product_name}>
                        {item.product_name} <span className="text-xs font-normal text-muted-foreground ml-1">(ID: {item.inventory_id})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground/70 font-mono">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground/70">
                      <div className="max-w-[140px] truncate" title={item.supplier_name || ""}>
                        {item.supplier_name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="inline-flex max-w-[160px] truncate px-2 py-1 text-[10px] font-bold bg-muted dark:bg-gray-700 text-muted-foreground/70 dark:text-muted-foreground rounded uppercase"
                        title={item.category_name}
                      >
                        {item.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground/70">
                      <div className="max-w-[140px] truncate" title={item.specific_category || ""}>
                        {item.specific_category || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground/70 text-center">
                      <div className="max-w-[100px] truncate" title={item.unit_of_measurement || ""}>
                        {item.unit_of_measurement || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-foreground text-foreground">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground/70">
                      {item.expected}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground/70">
                      {item.actual}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <span className={item.difference < 0 ? "text-red-600" : "text-muted-foreground"}>
                        {item.difference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground/70">
                      {item.reorder_level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'Archived'
                          ? 'bg-muted text-foreground bg-card dark:text-gray-300'
                          : item.status === 'Out of Stock' 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                          : item.status === 'Low' 
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setTraceItem(item)}
                          className="p-1.5 text-primary hover:bg-primary/10 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 text-primary hover:bg-primary/10 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.inventory_id, item.product_name)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-full transition-colors"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveToTrash(item.inventory_id, item.product_name)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          "Expiry": i.expiry_date || "-",
          "Status": i.status,
          "Last Updated": i.last_updated
        }))}
      />
      <AddProductModal 
        isOpen={isAddProductOpen} 
        onClose={() => setIsAddProductOpen(false)} 
        onSuccess={fetchInventory} 
      />
    </div>
  );
}
