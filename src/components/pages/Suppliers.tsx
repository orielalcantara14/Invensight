import { Search, Plus, Users, Pencil, Mail, Phone, MapPin, Package, ShoppingCart, Download, Archive, AlertTriangle, Trash2, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { api } from "@/services/api";
import { ProtectedAction } from "../ProtectedAction";
import { Supplier } from "@/services/api";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { AddSupplierModal } from "@/components/modals/AddSupplierModal";
import { EditSupplierModal } from "@/components/modals/EditSupplierModal";
import { toast } from "sonner";
import { ExportPreviewModal } from "../modals/ExportPreviewModal";
import { exportToExcel } from "@/utils/export";
import { SupplierDetailsModal } from "@/components/modals/SupplierDetailsModal";

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [archiveTarget, setArchiveTarget] = useState<{ id: number; name: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [trashTarget, setTrashTarget] = useState<{ id: number; name: string } | null>(null);
  const [trashing, setTrashing] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (error) {
      toast.error("Failed to fetch suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleArchive = (id: number, name: string) => {
    setArchiveTarget({ id, name });
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.archiveSupplier(archiveTarget.id);
      toast.success("Supplier archived successfully");
      setArchiveTarget(null);
      fetchSuppliers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive supplier");
    } finally {
      setArchiving(false);
    }
  };

  const handleMoveToTrash = (id: number, name: string) => {
    setTrashTarget({ id, name });
  };

  const confirmTrash = async () => {
    if (!trashTarget) return;
    setTrashing(true);
    try {
      await api.deleteSupplier(trashTarget.id);
      toast.success("Supplier moved to Deleted Folder");
      setTrashTarget(null);
      fetchSuppliers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move supplier to Deleted Folder");
    } finally {
      setTrashing(false);
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.contact_number?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);

  const handleExport = () => {
    const data = filteredSuppliers.map(s => ({
      "Supplier ID": s.supplier_id,
      "Name": s.supplier_name,
      "Address": s.address || "-",
      "Email": s.email || "-",
      "Contact": s.contact_number || "-",
      "Products Supplied": s.product_supplied || "-",
      "Total Orders": s.total_orders || 0,
      "Status": s.status || "Active"
    }));
    exportToExcel(data, "Suppliers_Export");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const stats = {
    total: suppliers.length,
    active: suppliers.filter((s) => (s.status || "").toLowerCase() === "active").length,
    totalProducts: suppliers.reduce((acc, s) => acc + (s.product_supplied ? s.product_supplied.split(',').length : 0), 0),
    totalOrders: suppliers.reduce((acc, s) => acc + (s.total_orders || 0), 0),
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Supplier Management</h1>
            <p className="text-muted-foreground dark:text-muted-foreground/70 mt-1">Manage suppliers and vendor relationships</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ProtectedAction module="Archive" action="View">
              <Link
                to="/archive?stage=Archived&tab=suppliers"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
              >
                <Archive className="w-4 h-4" />
                Archive
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Archive" action="Delete">
              <Link
                to="/archive?stage=Deleted&tab=suppliers"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Trash
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Suppliers" action="Add">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            </ProtectedAction>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-card p-4 sm:p-6 rounded-xl border border-border/50 shadow-xs">
          <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Total Suppliers</div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{stats.total}</div>
        </div>

        <div className="bg-card p-4 sm:p-6 rounded-xl border border-border/50 shadow-xs">
          <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Active Suppliers</div>
          <div className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.active}</div>
        </div>

        <div className="bg-card p-4 sm:p-6 rounded-xl border border-border/50 shadow-xs">
          <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Total Product Lines</div>
          <div className="text-2xl font-semibold tracking-tight text-purple-600 dark:text-purple-400">{stats.totalProducts}</div>
        </div>

        <div className="bg-card p-4 sm:p-6 rounded-xl border border-border/50 shadow-xs">
          <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Total Orders</div>
          <div className="text-2xl font-semibold tracking-tight text-orange-600 dark:text-orange-400">{stats.totalOrders}</div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all placeholder:text-zinc-400"
              />
            </div>
            <ProtectedAction module="Suppliers" action="Export">
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Supplier Name
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Address
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
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-xs italic">Loading suppliers...</td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">No suppliers found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Add your first supplier to get started</p>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((supplier) => (
                  <tr key={supplier.supplier_id} className="group hover:bg-muted/20 dark:hover:bg-zinc-900/30 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-foreground">
                        {supplier.supplier_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">
                        {supplier.address || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          (supplier.status || 'Active') === 'Active'
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                        }`} />
                        {supplier.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingSupplier(supplier)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <ProtectedAction module="Suppliers" action="Edit">
                          <button
                            onClick={() => setEditingSupplier(supplier)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction module="Suppliers" action="Delete">
                          <button
                            onClick={() => handleArchive(supplier.supplier_id, supplier.supplier_name)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction module="Suppliers" action="Delete">
                          <button
                            onClick={() => handleMoveToTrash(supplier.supplier_id, supplier.supplier_name)}
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
            itemCount={filteredSuppliers.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>

      <AddSupplierModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchSuppliers}
      />

      <EditSupplierModal
        isOpen={!!editingSupplier}
        onClose={() => setEditingSupplier(null)}
        onSuccess={fetchSuppliers}
        supplier={editingSupplier}
      />

      <SupplierDetailsModal
        isOpen={!!viewingSupplier}
        onClose={() => setViewingSupplier(null)}
        supplier={viewingSupplier}
      />

      {/* Archive Confirm Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-card bg-background rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">Archive Supplier</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">This can be restored later</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6">
              <p className="text-sm text-muted-foreground dark:text-gray-300">
                Are you sure you want to archive{" "}
                <span className="font-semibold text-foreground">"{archiveTarget.name}"</span>?
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground/70 mt-2">
                They will be moved to the Archive module and can be fully restored at any time.
              </p>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6">
              <button
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-300 border border-border dark:border-gray-600 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                disabled={archiving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                {archiving ? "Archiving..." : "Archive Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Trash Confirm Modal */}
      {trashTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-card bg-background rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">Move Supplier to Deleted Folder</h3>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">30-day retention countdown</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6">
              <p className="text-sm text-muted-foreground dark:text-gray-300">
                Are you sure you want to move{" "}
                <span className="font-semibold text-foreground">"{trashTarget.name}"</span> to the Deleted Folder?
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground/70 mt-2">
                This supplier will be kept in the Deleted Folder for 30 days before permanent deletion.
              </p>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6">
              <button
                onClick={() => setTrashTarget(null)}
                disabled={trashing}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-300 border border-border dark:border-gray-600 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              <button
                onClick={confirmTrash}
                disabled={trashing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {trashing ? "Moving..." : "Move to Trash"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Suppliers"
        filename={`InvenSight_Suppliers_${new Date().toISOString().split('T')[0]}`}
        showDateFilter={false}
        data={suppliers.map(s => ({
          id: s.supplier_id,
          "Name": s.supplier_name,
          "Address": s.address || "-",
          "Email": s.email || "-",
          "Contact": s.contact_number || "-",
          "Products Supplied": s.product_supplied || "-",
          "Total Orders": s.total_orders || 0,
          "Status": s.status || "Active"
        }))}
      />
    </div>
  );
}
