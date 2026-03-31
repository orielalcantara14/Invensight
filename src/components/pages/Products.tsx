import { Search, Download, Plus, Package, Trash2, Edit2, LayoutGrid } from "lucide-react";
import { useState, useEffect } from "react";
import { api, type Product, type Category, type PosProduct } from "@/services/api";
import { toast } from "sonner";
import { AddCategoryModal } from "../modals/AddCategoryModal";
import { AddProductModal } from "../modals/AddProductModal";
import { EditProductModal } from "../modals/EditProductModal";

export function Products() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<PosProduct | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getPosProducts(),
        api.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      toast.error("Failed to fetch products and categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this category? It will only delete if no products are using it.")) return;
    try {
      await api.deleteCategory(id);
      toast.success("Category deleted");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    }
  };

  const handleEditProduct = (product: PosProduct) => {
    setSelectedProductForEdit(product);
    setIsEditProductOpen(true);
  };

  const handleDeleteProduct = async (posId: number) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.deletePosProduct(posId);
      toast.success("Product deleted successfully");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete product");
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    
    const productDate = product.date_added ? new Date(product.date_added) : null;
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    
    const matchesDateFrom = !fromDate || !productDate || productDate >= fromDate;
    const matchesDateTo = !toDate || !productDate || productDate <= toDate;
    
    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products & Categories</h1>
            <p className="text-gray-500 mt-1">Manage product catalog and categories</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsAddCategoryOpen(true)}
              className="flex items-center gap-2 bg-gray-600 text-white px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-all shadow-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
            <button 
              onClick={() => setIsAddProductOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <LayoutGrid className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-bold text-gray-900">Product Categories</h2>
        </div>
        
        {categories.length === 0 ? (
          <div className="flex items-center justify-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <LayoutGrid className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-900 font-bold text-sm">No categories available</p>
              <p className="text-xs text-gray-400 mt-1">Add categories to organize your products</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <div 
                key={cat.category_id} 
                className="group p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all relative overflow-hidden shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 truncate text-sm">{cat.category_name}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat.category_id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-gray-900">Product List</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent px-3 py-1.5 text-sm focus:outline-none"
                />
                <span className="text-gray-400 text-xs font-medium uppercase">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent px-3 py-1.5 text-sm focus:outline-none"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-50 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_name}>{cat.category_name}</option>
                ))}
              </select>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all shadow-sm">
                <Download className="w-4 h-4 text-gray-500" />
                Export
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px]">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="min-w-[320px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Product Name</th>
                <th className="w-[130px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">SKU</th>
                <th className="min-w-[220px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="min-w-[220px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Specific Category</th>
                <th className="w-[170px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Unit Measurement</th>
                <th className="w-[140px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Unit Cost</th>
                <th className="w-[140px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Total Cost</th>
                <th className="w-[140px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">SRP</th>
                <th className="w-[160px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Date Added</th>
                <th className="w-[140px] px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-400">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-gray-900 font-bold text-sm">No products available</p>
                    <p className="text-xs text-gray-400 mt-1">Add products to your catalog to get started</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.pos_id} className="hover:bg-gray-50/50 transition-colors group">
                    <td
                      className="px-6 py-4 max-w-[320px] truncate text-sm font-bold text-gray-900"
                      title={product.product_name}
                    >
                      {product.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      <span
                        className="inline-block max-w-[200px] truncate rounded-full bg-blue-50 px-3 py-1 align-middle text-xs font-bold text-blue-600"
                        title={product.category}
                      >
                        {product.category}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 max-w-[220px] truncate text-sm text-gray-600 font-medium"
                      title={product.specific_category || undefined}
                    >
                      {product.specific_category || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {product.unit_of_measurement || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ₱{product.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ₱{(product.unit_price * product.stock).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      ₱{product.pos_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-medium">
                      {product.date_added ? new Date(product.date_added).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button 
                          className="p-2 text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded-full transition-colors shadow-sm" 
                          title="Edit"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-full transition-colors shadow-sm" 
                          title="Delete"
                          onClick={() => handleDeleteProduct(product.pos_id)}
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

      <AddCategoryModal 
        isOpen={isAddCategoryOpen} 
        onClose={() => setIsAddCategoryOpen(false)} 
        onSuccess={fetchData} 
      />
      <AddProductModal 
        isOpen={isAddProductOpen} 
        onClose={() => setIsAddProductOpen(false)} 
        onSuccess={fetchData} 
      />
      <EditProductModal
        isOpen={isEditProductOpen}
        onClose={() => {
          setIsEditProductOpen(false);
          setSelectedProductForEdit(null);
        }}
        onSuccess={fetchData}
        product={selectedProductForEdit}
      />
    </div>
  );
}
