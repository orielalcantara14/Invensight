import React, { useState, useEffect, useRef } from "react";
import { BaseModal } from "./BaseModal";
import { api, type Category, type Supplier } from "@/services/api";
import { toast } from "sonner";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SPECIFIC_CATEGORIES = [
  "Engine Oil", "Gear Oil", "Fork Oil", "Penetrant", "Grease", "Gasket Maker",
  "Cleaner", "Brake Fluid", "Coolant", "Additive", "Bearing", "Fuel Filter",
  "Oil Filter", "Light Bulb", "Switch", "Relay", "Fuse", "Consumables",
  "Horn", "Socket", "Regulator", "CDI", "LED Bulb", "Battery", "Ignition",
  "Spark Plug", "Tire Sealant", "Tire", "Valve Stem", "Tire Care", "Tire (Used)",
  "Inner Tube", "Drive Belt", "Flyball", "Oil Seal", "Gasket", "Slider Piece",
  "Clutch Shoe", "Air Filter", "Carburetor", "Fuel Pump", "Gear Box",
  "Clutch Lining", "Clutch Spring", "Pulley Set", "Sprockets", "Chain",
  "Brake Pad", "Cable", "Repair Kit", "Mirror Acc.", "Brake Shoe", "Ballrace",
  "Hose", "Hardware", "Accessory", "O-Ring", "Chemicals"
].sort();

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  submitLabel?: string;
  mode?: "products" | "pos";
}

export function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Add Product",
  submitLabel = "Add Product",
  mode = "products",
}: AddProductModalProps) {
  const UNIT_MEASUREMENT_OPTIONS = [
    "Piece",
    "Set",
    "Liter",
    "Milliliter",
    "Foot / Meter",
    "Pair",
    "Drum",
    "Roll",
  ];

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    sku: "",
    product_name: "",
    unit_of_measurement: "",
    image_url: "",
    category_id: "",
    specific_category: "",
    supplier_id: "",
    unit_price: "",
    pos_price: "",
    stock: "0",
    status: "Active" as "Active" | "Archived",
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        setIsLoadingCategories(true);
        try {
          const cats = await api.getCategories();
          setCategories(cats);
        } catch (error) {
          toast.error("Failed to load categories");
        } finally {
          setIsLoadingCategories(false);
        }
      };

      const fetchSuppliers = async () => {
        setIsLoadingSuppliers(true);
        try {
          const supps = await api.getSuppliers();
          setSuppliers(supps);
        } catch (error) {
          toast.error("Failed to load suppliers");
        } finally {
          setIsLoadingSuppliers(false);
        }
      };

      fetchCategories();
      fetchSuppliers();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name || !formData.unit_price) {
      toast.error("Please fill in all required fields");
      return;
    }
    const unitCost = parseFloat(formData.unit_price);
    const srp = formData.pos_price ? parseFloat(formData.pos_price) : undefined;
    const stock = parseInt(formData.stock);

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      toast.error("Unit cost cannot be negative");
      return;
    }
    if (srp !== undefined && (!Number.isFinite(srp) || srp < 0)) {
      toast.error("SRP cannot be negative");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.image_url;
      if (selectedFile) {
        const uploadResult = await api.uploadImage(selectedFile);
        finalImageUrl = uploadResult.url;
      }
      const posPrice = mode === "pos" ? (srp ?? unitCost) : srp;

      await api.createPosProduct({
        sku: formData.sku,
        product_name: formData.product_name,
        unit_of_measurement: formData.unit_of_measurement || undefined,
        image_url: finalImageUrl || null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        specific_category: formData.specific_category || undefined,
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        unit_price: unitCost,
        pos_price: posPrice,
        stock,
        status: formData.status,
      });
      toast.success("Product added successfully");
      setFormData({
        sku: "",
        product_name: "",
        unit_of_measurement: "",
        image_url: "",
        category_id: "",
        specific_category: "",
        supplier_id: "",
        unit_price: "",
        pos_price: "",
        stock: "0",
        status: "Active",
      });
      setSelectedFile(null);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSpecificCategories = SPECIFIC_CATEGORIES.filter(cat => 
    cat.toLowerCase().includes(formData.specific_category.toLowerCase())
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU (Auto-generated)
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Leave blank to auto-generate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Measurement
            </label>
            <select
              value={formData.unit_of_measurement}
              onChange={(e) => setFormData({ ...formData, unit_of_measurement: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {UNIT_MEASUREMENT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingCategories}
            >
              <option value="">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specific Category
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search category..."
                value={formData.specific_category}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setFormData({ ...formData, specific_category: e.target.value });
                  setIsDropdownOpen(true);
                }}
              />
              <div 
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isDropdownOpen && "rotate-180")} />
              </div>
            </div>
            
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredSpecificCategories.length > 0 ? (
                  filteredSpecificCategories.map((cat) => (
                    <div
                      key={cat}
                      className={cn(
                        "px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between",
                        formData.specific_category === cat && "bg-blue-50 text-blue-600 font-medium"
                      )}
                      onClick={() => {
                        setFormData({ ...formData, specific_category: cat });
                        setIsDropdownOpen(false);
                      }}
                    >
                      {cat}
                      {formData.specific_category === cat && <Check className="w-4 h-4" />}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500">No categories found</div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier
            </label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoadingSuppliers}
            >
              <option value="">No Supplier</option>
              {suppliers.map((sup) => (
                <option key={sup.supplier_id} value={sup.supplier_id}>
                  {sup.supplier_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Cost *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.unit_price}
              onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SRP {mode === "pos" ? "*" : ""}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.pos_price}
              onChange={(e) => setFormData({ ...formData, pos_price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              required={mode === "pos"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Stock
            </label>
            <input
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Cost
            </label>
            <input
              type="text"
              value={(() => {
                const unitCost = Number(formData.unit_price);
                const stock = Number(formData.stock);
                if (!Number.isFinite(unitCost) || !Number.isFinite(stock)) return "";
                return (unitCost * stock).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
              })()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Image
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedFile ? selectedFile.name : "PNG, JPG or GIF (MAX. 800x400px)"}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : submitLabel}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
