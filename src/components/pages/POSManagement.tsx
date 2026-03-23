import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { Search, Download, Plus, Edit, Trash2, Archive, Monitor } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
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
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { api, type Category, type PosProduct, type PosProductPayload } from "@/services/api";

type FormState = {
  sku: string;
  product_name: string;
  description: string;
  image_url: string;
  category_id: string;
  pos_price: string;
  stock: string;
  status: "Active" | "Archived";
};
const MAX_DESCRIPTION_LENGTH = 500;

const initialForm: FormState = {
  sku: "",
  product_name: "",
  description: "",
  image_url: "",
  category_id: "",
  pos_price: "",
  stock: "",
  status: "Active",
};

export function POSManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Active" | "Archived">("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PosProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

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
    setEditingProduct(null);
    setForm({
      ...initialForm,
      category_id: categories.length ? String(categories[0].category_id) : "",
    });
    setShowFormModal(true);
  };

  const openEditModal = (product: PosProduct) => {
    setEditingProduct(product);
    setForm({
      sku: product.sku,
      product_name: product.product_name,
      description: product.description ?? "",
      image_url: product.image_url ?? "",
      category_id: String(product.category_id),
      pos_price: String(product.pos_price),
      stock: String(product.stock),
      status: product.status,
    });
    setShowFormModal(true);
  };

  const buildPayload = (): PosProductPayload => {
    return {
      sku: form.sku.trim(),
      product_name: form.product_name.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      pos_price: Number(form.pos_price),
      stock: Number(form.stock),
      status: form.status,
    };
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((prev) => ({ ...prev, image_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    if (!form.sku.trim() || !form.product_name.trim()) {
      toast.error("SKU and product name are required.");
      return false;
    }
    if (Number.isNaN(Number(form.pos_price)) || Number(form.pos_price) < 0) {
      toast.error("POS price must be a valid non-negative number.");
      return false;
    }
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      toast.error("Stock must be a valid non-negative integer.");
      return false;
    }
    if (form.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      toast.error(`Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = buildPayload();
    try {
      setSubmitting(true);
      if (editingProduct) {
        await api.updatePosProduct(editingProduct.pos_id, payload);
        toast.success("POS product updated.");
      } else {
        await api.createPosProduct(payload);
        toast.success("POS product created.");
      }
      setShowFormModal(false);
      await fetchData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
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
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POS Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading POS products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No POS products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.pos_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{product.sku}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{product.product_name}</div>
                        <div className="text-gray-500 text-xs">{product.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.category}</td>
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
                        <button onClick={() => openEditModal(product)} className="text-blue-600 hover:text-blue-800" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(product)}
                          className="text-orange-600 hover:text-orange-800"
                          title={product.status === "Archived" ? "Unarchive" : "Archive"}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-600 hover:text-red-800"
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

      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingProduct ? <Edit className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
              {editingProduct ? "Edit POS Product" : "Add Product to POS"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  value={form.product_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, product_name: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                className="break-all whitespace-pre-wrap"
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value.slice(0, MAX_DESCRIPTION_LENGTH),
                  }))
                }
              />
              <p className="text-xs text-gray-500 text-right">
                {form.description.length}/{MAX_DESCRIPTION_LENGTH}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-image">Product Image</Label>
              <Input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {form.image_url && (
                <div className="flex items-center gap-3">
                  <img
                    src={form.image_url}
                    alt="Product preview"
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm((prev) => ({ ...prev, image_url: "" }))}
                  >
                    Remove image
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.category_id} value={String(cat.category_id)}>
                        {cat.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pos-price">POS Price (₱)</Label>
                <Input
                  id="pos-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pos_price}
                  onChange={(e) => setForm((prev) => ({ ...prev, pos_price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                  required
                />
              </div>
            </div>

            {editingProduct && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: "Active" | "Archived") =>
                    setForm((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowFormModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingProduct ? "Update Product" : "Add to POS"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
