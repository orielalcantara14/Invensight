import { Search, Download, Plus, Package, Trash2, Edit2, LayoutGrid, ArrowRight, Archive, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";

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
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<PosProduct | null>(null);
  const [deleteProductModalOpen, setDeleteProductModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<"archive" | "trash">("archive");
  const [deleteCategoryModalOpen, setDeleteCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const downloadCSVTemplate = () => {
    const headers = [
      "product_name",
      "unit_cost",
      "retail_price",
      "stock",
      "sku",
      "category",
      "supplier",
      "unit_of_measurement",
      "is_service"
    ];
    const exampleRow = [
      "Spark Plug Model S",
      "120.00",
      "220.00",
      "50",
      "SPK-MDL-S",
      "Engine Parts",
      "Main Supplier Corp",
      "Piece",
      "false"
    ];
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), exampleRow.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "InvenSight_Product_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Product import template downloaded");
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const toastId = toast.loading("Importing products from CSV...");
    try {
      const res = await api.importProductsCSV(file);
      toast.success(res.message || "Products imported successfully", { id: toastId });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import products", { id: toastId });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Products & Categories</h1>
            <p className="text-muted-foreground mt-1">Manage product catalog and categories</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                className="flex items-center gap-2 bg-gray-650 dark:bg-zinc-800 border border-border/85 text-muted-foreground hover:text-foreground hover:bg-muted px-4 py-2 rounded-xl transition-all shadow-sm font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            </ProtectedAction>
            <ProtectedAction module="Products" action="Add">
              <button 
                onClick={downloadCSVTemplate}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-full transition-all shadow-sm font-semibold text-sm cursor-pointer border border-transparent"
                title="Download CSV Template"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                Template
              </button>
            </ProtectedAction>
            <ProtectedAction module="Products" action="Add">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-full transition-all shadow-md shadow-emerald-500/10 hover:shadow-lg font-semibold text-sm cursor-pointer disabled:opacity-50 border border-transparent"
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-white" />
                )}
                Import CSV
              </button>
            </ProtectedAction>
            <ProtectedAction module="Products" action="Add">
              <button 
                onClick={() => setIsAddProductOpen(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-sm font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </ProtectedAction>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-6 mb-6 sm:mb-8 shadow-xs">
        <div className="flex items-center gap-2 mb-6">
          <LayoutGrid className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Product Categories</h2>
        </div>
        
        {categories.length === 0 ? (
          <div className="flex items-center justify-center py-12 bg-zinc-50/50 dark:bg-zinc-900/10 rounded-xl border border-dashed border-border/60">
            <div className="text-center">
              <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <LayoutGrid className="w-5 h-5 text-zinc-400" />
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium text-xs">No categories available</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Add categories to organize your products</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`p-3.5 border rounded-xl transition-all text-left flex items-center justify-between cursor-pointer ${
                selectedCategory === "All"
                  ? "bg-primary text-white border-primary shadow-md font-bold"
                  : "bg-card border-border/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-foreground"
              }`}
            >
              <span className="text-xs font-semibold">All Categories</span>
              <span className="text-[10px] opacity-80 font-mono">({products.length})</span>
            </button>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.category_name;
              const count = products.filter(p => p.category === cat.category_name).length;

              return (
                <div 
                  key={cat.category_id}
                  onClick={() => setSelectedCategory(isSelected ? "All" : cat.category_name)}
                  className={`group p-3.5 border rounded-xl transition-all relative overflow-hidden shadow-xs cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                      : "bg-card border-border/60 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className={`font-semibold truncate text-xs ${isSelected ? "text-primary font-bold" : "text-zinc-800 dark:text-zinc-200"}`}>
                        {cat.category_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{count} items</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat.category_id, cat.category_name);
                      }}
                      className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg flex-shrink-0"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-border/40">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all placeholder:text-zinc-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-all"
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_name}>{cat.category_name}</option>
                ))}
              </select>
              <ProtectedAction module="Products" action="Export">
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
                <th className="min-w-[320px] px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Product Name</th>
                <th className="w-[130px] px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">SKU</th>
                <th className="min-w-[220px] px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Category</th>
                <th className="min-w-[220px] px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Specific Category</th>
                <th className="w-[170px] px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">Unit Measurement</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">Unit Cost</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">Total Cost</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">Retail Price</th>
                <th className="w-[160px] px-6 py-3.5 text-left text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">Date Added</th>
                <th className="w-[140px] px-6 py-3.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-zinc-400">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">No products available</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Add products to your catalog to get started</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.pos_id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors duration-150">
                    <td
                      className="px-6 py-4 max-w-[320px] truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                      title={product.product_name}
                    >
                      {product.product_name} <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500 ml-1">(ID: {product.pos_id})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400 font-mono">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className="inline-flex max-w-[200px] truncate rounded px-1.5 py-0.5 text-[9px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-wider"
                        title={product.category}
                      >
                        {product.category}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 max-w-[220px] truncate text-sm text-zinc-500 dark:text-zinc-400"
                      title={product.specific_category || undefined}
                    >
                      {product.specific_category || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      {product.unit_of_measurement || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
                      ₱{(product.unit_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
                      ₱{((product.unit_price ?? 0) * (product.stock ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
                      ₱{(product.pos_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      {product.date_added ? new Date(product.date_added).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/inventory?search=${product.sku}&from=products`}
                          onClick={() => sessionStorage.setItem("fromProducts", "true")}
                          className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                          title="View in Inventory"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <ProtectedAction module="Products" action="Edit">
                          <button 
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" 
                            title="Edit"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction module="Products" action="Delete">
                          <button 
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors" 
                            title="Archive"
                            onClick={() => handleDeleteProduct(product.pos_id, product.product_name)}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </ProtectedAction>
                        <ProtectedAction module="Products" action="Delete">
                          <button 
                            className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors" 
                            title="Move to Trash"
                            onClick={() => handleMoveToTrashProduct(product.pos_id, product.product_name)}
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCSVImport}
        accept=".csv"
        className="hidden"
        id="csv-file-input"
      />
    </div>
  );
}
