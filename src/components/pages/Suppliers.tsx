import { Search, Plus, Users, Edit2, Mail, Phone, MapPin, Package, ShoppingCart, Download, Archive, AlertTriangle, Trash2, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage suppliers and vendor relationships</p>
          </div>
          <div className="flex items-center gap-3">
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
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            </ProtectedAction>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Suppliers</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Suppliers</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Product Lines</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Supplier List</h2>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                />
              </div>
              <ProtectedAction module="Suppliers" action="Export">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export Suppliers
                </button>
              </ProtectedAction>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8F9FA] border-b border-gray-200 dark:bg-gray-900/50 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left">
                  {/* Header checkbox removed */}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Supplier Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No suppliers found</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add your first supplier to get started</p>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((supplier) => (
                  <tr key={supplier.supplier_id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Row selection handled in Export Wizard */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {supplier.supplier_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {supplier.address || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-full uppercase ${supplier.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                        {supplier.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewingSupplier(supplier)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingSupplier(supplier)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(supplier.supplier_id, supplier.supplier_name)}
                          className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-full transition-colors"
                          title="Archive Supplier"
                        >
                          <Archive className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Archive Supplier</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">This can be restored later</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to archive{" "}
                <span className="font-semibold text-gray-900 dark:text-white">"{archiveTarget.name}"</span>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                They will be moved to the Archive module and can be fully restored at any time.
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
                onClick={confirmArchive}
                disabled={archiving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                {archiving ? "Archiving..." : "Archive Supplier"}
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
