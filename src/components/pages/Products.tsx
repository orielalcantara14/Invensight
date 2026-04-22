import { Search, Download, Plus, Package, Trash2, Edit2, LayoutGrid, ArrowRight, Archive } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, type Product, type Category, type PosProduct } from "@/services/api";
import { toast } from "sonner";
import { ProtectedAction } from "../ProtectedAction";
import { AddCategoryModal } from "../modals/AddCategoryModal";
import { AddProductModal } from "../modals/AddProductModal";
import { EditProductModal } from "../modals/EditProductModal";
import { DeleteConfirmationModal } from "../modals/DeleteConfirmationModal";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { ExportPreviewModal } from "../modals/ExportPreviewModal";
import { exportToExcel } from "@/utils/export";

export function Products() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<PosProduct | null>(null);
  const [deleteProductModalOpen, setDeleteProductModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<"archive" | "trash">("archive");
  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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

  const handleDeleteCategory = async (id: number, name: string) => {
    setCategoryToDelete({ id, name });
    setDeleteCategoryModalOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      await api.deleteCategory(categoryToDelete.id);
      toast.success("Category deleted");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    } finally {
      setIsDeletingCategory(false);
      setDeleteCategoryModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleEditProduct = (product: PosProduct) => {
    setSelectedProductForEdit(product);
    setIsEditProductOpen(true);
  };

  const handleDeleteProduct = (id: number, name: string) => {
    setProductToDelete({ id, name });
    setConfirmationMode("archive");
    setDeleteProductModalOpen(true);
  };

  const handleMoveToTrashProduct = (id: number, name: string) => {
    setProductToDelete({ id, name });
    setConfirmationMode("trash");
    setDeleteProductModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      if (confirmationMode === "archive") {
        await api.deletePosProduct(productToDelete.id);
        toast.success("Product moved to Archive");
      } else {
        await api.moveProductToTrash(productToDelete.id);
        toast.success("Product moved to Trash folder");
      }
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsDeletingProduct(false);
      setDeleteProductModalOpen(false);
      setProductToDelete(null);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    
    const productDate = product.date_added ? new Date(product.date_added) : null;
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    
    const matchesDateFrom = !fromDate || !productDate || productDate >= fromDate;
    const matchesDateTo = !toDate || !productDate || productDate <= toDate;
    
    return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, dateFrom, dateTo]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handleExport = () => {
    const data = filteredProducts.map(p => ({
      "Product Name": p.product_name,
      "SKU": p.sku,
      "Category": p.category,
      "Specific Category": p.specific_category || "-",
      "Unit Measurement": p.unit_of_measurement || "-",
      "Unit Price": p.unit_price,
      "Total Cost": (p.unit_price ?? 0) * (p.stock ?? 0),
      "POS Price": p.pos_price,
      "Stock": p.stock,
      "Date Added": p.date_added ? new Date(p.date_added).toLocaleDateString() : "N/A"
    }));
    exportToExcel(data, "Products_Export");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products & Categories</h1>
            <p className="text-muted-foreground mt-1">Manage product catalog and categories</p>
          </div>
          <div className="flex gap-3">
            <ProtectedAction module="Archive" action="View">
              <Link
                to="/archive?stage=Archived&tab=products"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-sm"
              >
                <Archive className="w-4 h-4" />
                Archive
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Archive" action="Delete">
              <Link
                to="/archive?stage=Deleted&tab=products"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Trash
              </Link>
            </ProtectedAction>
            <ProtectedAction module="Products" action="Add">
              <button 
                onClick={() => setIsAddCategoryOpen(true)}
                className="flex items-center gap-2 bg-gray-600 text-white px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-all shadow-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
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

      {/* Categories Section */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <LayoutGrid className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Product Categories</h2>
        </div>
        
        {categories.length === 0 ? (
          <div className="flex items-center justify-center py-12 bg-muted/50 rounded-2xl border border-dashed border-border">
            <div className="text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <LayoutGrid className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-foreground font-bold text-sm">No categories available</p>
              <p className="text-xs text-muted-foreground mt-1">Add categories to organize your products</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <div 
                key={cat.category_id} 
                className="group p-4 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-md transition-all relative overflow-hidden shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground truncate text-sm">{cat.category_name}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat.category_id, cat.category_name)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
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
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-foreground">Product List</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  className="bg-transparent px-3 py-1.5 text-sm focus:outline-none text-foreground"
                />
                <span className="text-muted-foreground text-xs font-medium uppercase">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="bg-transparent px-3 py-1.5 text-sm focus:outline-none text-foreground"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-muted px-4 py-2 border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none text-foreground"
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_name}>{cat.category_name}</option>
                ))}
              </select>
              <ProtectedAction module="Products" action="Export">
                  <button 
                    onClick={() => setIsExportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary border border-primary rounded-xl text-sm font-medium text-white hover:bg-primary/90 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export Products
                  </button>
              </ProtectedAction>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-foreground"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-6 py-4 text-left">
                  {/* Header checkbox removed */}
                </th>
                <th className="min-w-[320px] px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Product Name</th>
                <th className="w-[130px] px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">SKU</th>
                <th className="min-w-[220px] px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="min-w-[220px] px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Specific Category</th>
                <th className="w-[170px] px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Unit Measurement</th>
                <th className="w-[140px] px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Unit Cost</th>
                <th className="w-[140px] px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Total Cost</th>
                <th className="w-[140px] px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">SRP</th>
                <th className="w-[160px] px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Date Added</th>
                <th className="w-[140px] px-6 py-4 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-bold text-sm">No products available</p>
                    <p className="text-xs text-muted-foreground mt-1">Add products to your catalog to get started</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.pos_id} className="hover:bg-muted/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Row selection handled in Export Wizard */}
                    </td>
                    <td
                      className="px-6 py-4 max-w-[320px] truncate text-sm font-bold text-foreground"
                      title={product.product_name}
                    >
                      {product.product_name} <span className="text-xs font-normal text-muted-foreground ml-1">(ID: {product.pos_id})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-medium">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-medium">
                      <span
                        className="inline-block max-w-[200px] truncate rounded-full bg-primary/10 px-3 py-1 align-middle text-xs font-bold text-primary"
                        title={product.category}
                      >
                        {product.category}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 max-w-[220px] truncate text-sm text-muted-foreground font-medium"
                      title={product.specific_category || undefined}
                    >
                      {product.specific_category || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-medium">
                      {product.unit_of_measurement || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                      ₱{(product.unit_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                      ₱{((product.unit_price ?? 0) * (product.stock ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                      ₱{(product.pos_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-medium">
                      {product.date_added ? new Date(product.date_added).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          to={`/inventory?search=${product.sku}&from=products`}
                          onClick={() => sessionStorage.setItem("fromProducts", "true")}
                          className="p-1.5 text-primary hover:bg-primary/10 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                          title="View in Inventory"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button 
                          className="p-1.5 text-primary hover:bg-primary/10 dark:hover:bg-blue-900/30 rounded-full transition-colors" 
                          title="Edit"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-full transition-colors" 
                          title="Archive"
                          onClick={() => handleDeleteProduct(product.pos_id, product.product_name)}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors" 
                          title="Move to Trash"
                          onClick={() => handleMoveToTrashProduct(product.pos_id, product.product_name)}
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
            itemCount={filteredProducts.length}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
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

      <DeleteConfirmationModal
        isOpen={deleteProductModalOpen}
        onClose={() => {
          setDeleteProductModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={confirmDeleteProduct}
        title={confirmationMode === "archive" ? "Archive Product" : "Move to Trash"}
        message={
          confirmationMode === "archive" 
            ? "Are you sure you want to move this product to the Archive? You can restore it later."
            : "Are you sure you want to move this product to the Deleted Folder? It will be preserved there before permanent removal."
        }
        itemName={productToDelete?.name}
        isDeleting={isDeletingProduct}
      />

      <DeleteConfirmationModal
        isOpen={deleteCategoryModalOpen}
        onClose={() => {
          setDeleteCategoryModalOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message="Are you sure you want to delete this category? It will only delete if no products are using it."
        itemName={categoryToDelete?.name}
        isDeleting={isDeletingCategory}
      />

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Products"
        filename={`InvenSight_Products_${new Date().toISOString().split('T')[0]}`}
        data={products.map(p => ({
          id: p.pos_id,
          "Product": p.product_name,
          "SKU": p.sku,
          "Category": p.category,
          "Specific Category": p.specific_category || "-",
          "Unit Price": p.unit_price,
          "POS Price": p.pos_price,
          "Stock": p.stock,
          "Date Added": p.date_added // Field for date filtering
        }))}
      />
    </div>
  );
}
