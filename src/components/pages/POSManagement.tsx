import { useEffect, useMemo, useState } from "react";
import { Search, Download, Plus, Edit, Trash2, Archive, Monitor } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { toast } from "sonner";
import { api, type Category, type PosProduct } from "@/services/api";
import { AddProductModal } from "../modals/AddProductModal";
import { EditProductModal } from "../modals/EditProductModal";

export function POSManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Active" | "Archived">("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [posProducts, categoryRows] = await Promise.all([
        api.getPosProducts(),
        api.getCategories(),
      ]);
      setProducts(posProducts);
      setCategories(categoryRows);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load POS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        product.product_name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q);

      const matchesStatus = filterStatus === "All" || product.status === filterStatus;
      const matchesCategory = filterCategory === "All" || product.category === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, searchTerm, filterStatus, filterCategory]);

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const openEditModal = (product: PosProduct) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleToggleArchive = async (product: PosProduct) => {
    const nextStatus = product.status === "Archived" ? "Active" : "Archived";
    try {
      await api.updatePosProductStatus(product.pos_id, nextStatus);
      toast.success(nextStatus === "Archived" ? "Product archived." : "Product unarchived.");
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Status update failed");
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      await api.deletePosProduct(selectedProduct.pos_id);
      toast.success("Product removed from POS.");
      setShowDeleteDialog(false);
      setSelectedProduct(null);
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const openPOSTerminal = () => {
    window.location.href = "/pos.html";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">POS Management</h1>
            <p className="text-gray-600 mt-1">Manage Point of Sale products and pricing</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openPOSTerminal}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
              <Monitor className="w-5 h-5" />
              Open POS Terminal
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">POS Products</h2>
            <div className="flex items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_name}>
                    {category.category_name}
                  </option>
                ))}
              </select>
              <button
                className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => toast.info("Export is not implemented yet.")}
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-[130px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">SKU</th>
                <th className="min-w-[320px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="min-w-[220px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="w-[140px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Price</th>
                <th className="w-[140px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">POS Price</th>
                <th className="w-[110px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Stock</th>
                <th className="w-[120px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="w-[140px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Loading POS products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No POS products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.pos_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{product.sku}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="max-w-[320px] truncate font-medium" title={product.product_name}>
                          {product.product_name}
                        </div>
                        <div className="max-w-[320px] truncate text-gray-500 text-xs" title={product.description}>
                          {product.description}
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 max-w-[220px] truncate whitespace-nowrap text-sm text-gray-700"
                      title={product.category}
                    >
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₱{Number(product.unit_price || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>₱{Number(product.pos_price).toFixed(2)}</span>
                        {product.price_modified && (
                          <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Modified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-full transition-colors shadow-sm"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(product)}
                          className="p-2 text-orange-600 bg-orange-50/50 hover:bg-orange-50 rounded-full transition-colors shadow-sm"
                          title={product.status === "Archived" ? "Unarchive" : "Archive"}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-full transition-colors shadow-sm"
                          title="Remove"
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
      </div>

      <AddProductModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={fetchData}
          title="Add Product to POS"
          submitLabel="Add to POS"
          mode="pos"
        />
  
        <EditProductModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={fetchData}
          product={selectedProduct}
          title="Edit POS Product"
          submitLabel="Update Product"
          mode="pos"
        />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove product from POS?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{selectedProduct?.product_name}" from POS management.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProduct(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
