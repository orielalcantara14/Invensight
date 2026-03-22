import { Search, Download, Plus, Edit, Trash2, Archive, DollarSign, Monitor, Eye } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { toast } from "sonner";

const posProducts: { id: number; sku: string; name: string; category: string; description: string; price: number; posPrice: number; stock: number; status: string }[] = [];

export function POSManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof posProducts[0] | null>(null);

  const filteredProducts = posProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "All" || product.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Product added to POS successfully!");
    setShowAddModal(false);
  };

  const handleEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Product updated successfully!");
    setShowEditModal(false);
    setSelectedProduct(null);
  };

  const handleChangePrice = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("POS price updated successfully!");
    setShowPriceModal(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = () => {
    toast.success("Product removed from POS!");
    setShowDeleteDialog(false);
    setSelectedProduct(null);
  };

  const handleArchiveProduct = () => {
    toast.success(selectedProduct?.status === "Archived" ? "Product unarchived!" : "Product archived!");
    setShowArchiveDialog(false);
    setSelectedProduct(null);
  };

  const handleExport = () => {
    toast.success("Exporting POS products data...");
  };

  const openEditModal = (product: typeof posProducts[0]) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const openPriceModal = (product: typeof posProducts[0]) => {
    setSelectedProduct(product);
    setShowPriceModal(true);
  };

  const openDeleteDialog = (product: typeof posProducts[0]) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const openArchiveDialog = (product: typeof posProducts[0]) => {
    setSelectedProduct(product);
    setShowArchiveDialog(true);
  };

  const openPOSTerminal = () => {
    window.location.href = "/pos.html";
  };

  return (
    <div className="p-8">
      {/* Header */}
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
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>
      </div>



      {/* Products Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">POS Products</h2>
            <div className="flex items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Regular Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  POS Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-gray-500 text-xs">{product.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    ₱{product.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      ₱{product.posPrice.toLocaleString()}
                      {product.price !== product.posPrice && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                          Modified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.stock}
                  </td>
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
                        onClick={() => openPriceModal(product)}
                        className="text-green-600 hover:text-green-800"
                        title="Change Price"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEditModal(product)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openArchiveDialog(product)}
                        className="text-orange-600 hover:text-orange-800"
                        title={product.status === "Archived" ? "Unarchive" : "Archive"}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openDeleteDialog(product)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Add Product to POS
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" placeholder="SKU-XXX" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input id="product-name" placeholder="Enter product name" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Product description" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engine">Engine Parts</SelectItem>
                    <SelectItem value="braking">Braking System</SelectItem>
                    <SelectItem value="drivetrain">Drive Train</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="tires">Tires & Wheels</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Current Stock</Label>
                <Input id="stock" type="number" placeholder="0" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regular-price">Regular Price (₱)</Label>
                <Input id="regular-price" type="number" placeholder="0.00" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pos-price">POS Price (₱)</Label>
                <Input id="pos-price" type="number" placeholder="0.00" step="0.01" required />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add to POS
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Product
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <form onSubmit={handleEditProduct} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input id="edit-sku" defaultValue={selectedProduct.sku} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-product-name">Product Name</Label>
                  <Input id="edit-product-name" defaultValue={selectedProduct.name} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" defaultValue={selectedProduct.description} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select defaultValue={selectedProduct.category.toLowerCase().replace(/\s+/g, '-')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engine-parts">Engine Parts</SelectItem>
                      <SelectItem value="braking-system">Braking System</SelectItem>
                      <SelectItem value="drive-train">Drive Train</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="tires-wheels">Tires & Wheels</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Current Stock</Label>
                  <Input id="edit-stock" type="number" defaultValue={selectedProduct.stock} required />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setSelectedProduct(null); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Product
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Price Modal */}
      <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Change POS Price
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <form onSubmit={handleChangePrice} className="space-y-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Product</p>
                <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
                <p className="text-xs text-gray-500 mt-1">SKU: {selectedProduct.sku}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Regular Price</Label>
                  <div className="px-4 py-2 bg-gray-100 rounded-lg">
                    ₱{selectedProduct.price.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Current POS Price</Label>
                  <div className="px-4 py-2 bg-gray-100 rounded-lg">
                    ₱{selectedProduct.posPrice.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pos-price">New POS Price (₱)</Label>
                <Input id="new-pos-price" type="number" defaultValue={selectedProduct.posPrice} step="0.01" required />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => { setShowPriceModal(false); setSelectedProduct(null); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Price
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product from POS?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{selectedProduct?.name}" from the POS system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProduct(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedProduct?.status === "Archived" ? "Unarchive Product?" : "Archive Product?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProduct?.status === "Archived" 
                ? `This will restore "${selectedProduct?.name}" to active status in the POS system.`
                : `This will archive "${selectedProduct?.name}" and hide it from the POS terminal.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProduct(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveProduct} className="bg-orange-600 hover:bg-orange-700">
              {selectedProduct?.status === "Archived" ? "Unarchive" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
