import React, { useState, useEffect, useRef } from "react";
import { BaseModal } from "./BaseModal";
import { api, type Category, type Supplier } from "@/services/api";
import { toast } from "sonner";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SPECIFIC_CATEGORIES_BY_CATEGORY: Record<string, string[]> = {
    "Engine Parts": [
        "Gasket",
        "Piston",
        "Piston Ring",
        "Cylinder",
        "Valve",
        "Camshaft",
        "Engine Bearing",
    ],

    "Fuel & Air System": [
        "Carburetor",
        "Fuel Filter",
        "Fuel Hose",
        "Air Filter",
        "Injector",
        "Intake Manifold",
    ],

    "Electrical & Ignition": [
        "Spark Plug",
        "Ignition Coil",
        "CDI",
        "Rectifier/Regulator",
        "Wiring",
        "Relay",
    ],

    "Battery & Charging": [
        "Battery",
        "Battery Terminal",
        "Battery Charger",
        "Charging Components",
    ],

    "Brake System": [
        "Brake Pad",
        "Brake Shoe",
        "Brake Disc",
        "Brake Lever",
        "Brake Cable",
        "Master Cylinder",
    ],

    "Transmission & CVT": [
        "CVT Belt",
        "Roller",
        "Clutch",
        "Clutch Lining",
        "Variator",
        "Drive Gear",
        "Chain & Sprocket",
    ],

    "Suspension & Steering": [
        "Front Fork",
        "Rear Shock",
        "Fork Seal",
        "Steering Bearing",
        "Ball Race",
        "Handlebar",
    ],

    "Tires & Inner Tubes": [
        "Motorcycle Tire",
        "Inner Tube",
        "Tubeless Valve/Pito",
        "Tire Accessories",
    ],

    "Lubricants & Fluids": [
        "Engine Oil",
        "Gear Oil",
        "Brake Fluid",
        "Coolant",
        "Chain Lubricant",
    ],

    "Cooling System": [
        "Radiator",
        "Radiator Hose",
        "Radiator Cap",
        "Cooling Fan",
        "Coolant Components",
    ],

    "Body & Exterior Parts": [
        "Fairings",
        "Side Covers",
        "Mudguard",
        "Fender",
        "Footrest",
        "Grab Bar",
    ],

    "Lights & Accessories": [
        "Headlight",
        "Tail Light",
        "Signal Light",
        "Bulb",
        "LED Light",
        "Auxiliary Light",
    ],

    "Motorcycle Accessories": [
        "Phone Holder",
        "Top Box",
        "Saddle Bag",
        "Mirrors",
        "Grips",
        "Horns",
    ],

    "Maintenance Supplies": [
        "Cleaning Products",
        "Degreaser",
        "Chain Cleaner",
        "Tire Sealant",
        "Maintenance Tools",
    ],

    "Fasteners & Small Parts": [
        "Bolts",
        "Nuts",
        "Washers",
        "Screws",
        "Clips",
        "Clamps",
        "O-Rings",
    ],

    "Performance & Upgrade Parts": [
        "Performance Exhaust",
        "Racing CDI",
        "Upgraded Suspension",
        "Performance Air Filter",
    ],

    "Safety & Riding Gear": [
        "Helmet",
        "Gloves",
        "Raincoat",
        "Knee/Elbow Protection",
        "Reflective Gear",
    ],

    "Other Parts & Accessories": [
        "Other Parts & Accessories",
    ],

    Services: [
        "Change Oil",
        "Tune-up",
        "Tire Change",
        "CVT Cleaning",
        "Ball Race Replacement",
        "Front Shock Repack",
        "Brake Pad/Shoe Replacement",
        "Others",
    ],
};

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    sku: "",
    product_name: "",
    unit_of_measurement: "",
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
    if (!formData.product_name || !formData.unit_price || !formData.supplier_id) {
      toast.error("Please fill in all required fields including supplier");
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
      toast.error("Retail Price cannot be negative");
      return;
    }
    if (srp !== undefined && srp < unitCost) {
      toast.error("Retail Price cannot be lower than the Unit Cost");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    setIsSubmitting(true);
    try {
      const posPrice = mode === "pos" ? (srp ?? unitCost) : srp;

      await api.createPosProduct({
        sku: undefined,
        product_name: formData.product_name,
        unit_of_measurement: formData.unit_of_measurement || undefined,
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
        category_id: "",
        specific_category: "",
        supplier_id: "",
        unit_price: "",
        pos_price: "",
        stock: "0",
        status: "Active",
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNumberWithCommas = (value: string) => {
    if (!value) return "";
    const parts = value.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  const handleNumericChange = (field: keyof typeof formData, value: string) => {
    const cleanValue = value.replace(/,/g, "");
    if (cleanValue === "" || /^\d*\.?\d*$/.test(cleanValue)) {
      setFormData((prev) => ({ ...prev, [field]: cleanValue }));
    }
  };

  const handleNumericBlur = (field: "unit_price" | "pos_price") => {
    const raw = formData[field];
    if (raw !== "" && raw !== undefined) {
      const num = parseFloat(raw.replace(/,/g, ""));
      if (!isNaN(num)) {
        setFormData((prev) => ({ ...prev, [field]: num.toFixed(2) }));
      }
    }
  };

    const selectedCategory = categories.find(
        (cat) => String(cat.category_id) === formData.category_id
    );

    const availableSpecificCategories = selectedCategory
        ? SPECIFIC_CATEGORIES_BY_CATEGORY[selectedCategory.category_name] || []
        : [];

    const filteredSpecificCategories = availableSpecificCategories.filter((cat) =>
        cat.toLowerCase().includes(formData.specific_category.toLowerCase())
    );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Product Name & Unit Measurement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Product Name *
            </label>
            <input
  		type="text"
  		value={formData.product_name}
  		onChange={(e) =>
    		setFormData({
      		...formData,
      		product_name: e.target.value,
    		})
  		}
  		className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
 		 placeholder="Enter product name..."
  		required
	/>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Unit Measurement
            </label>
            <select
  		value={formData.unit_of_measurement}
  		onChange={(e) =>
    			setFormData({
     			 ...formData,
      			unit_of_measurement: e.target.value,
    		})
  		}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Select Unit —</option>
              {UNIT_MEASUREMENT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Category & Specific Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Category
            </label>
            <select
  		value={formData.category_id}
  		onChange={(e) =>
    			setFormData({
     			 ...formData,
      			category_id: e.target.value,
      			specific_category: "",
    		})
  		}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Specific Category
            </label>
            <div className="relative">
                          <input
                              type="text"
                              className="w-full pl-3 pr-10 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
                              placeholder={
                                  formData.category_id
                                      ? "Search specific category..."
                                      : "Select a category first..."
                              }
                              value={formData.specific_category}
                              disabled={!formData.category_id}
                              onFocus={() => {
                                  if (formData.category_id) {
                                      setIsDropdownOpen(true);
                                  }
                              }}
                              onChange={(e) => {
                                  setFormData({
                                      ...formData,
                                      specific_category: e.target.value,
                                  });
                                  setIsDropdownOpen(true);
                              }}
              />
              <div 
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                              onClick={() => {
                                  if (formData.category_id) {
                                      setIsDropdownOpen(!isDropdownOpen);
                                  }
                              }}
              >
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground/70 transition-transform", isDropdownOpen && "rotate-180")} />
              </div>
            </div>
            
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredSpecificCategories.length > 0 ? (
                  filteredSpecificCategories.map((cat) => (
                    <div
                      key={cat}
                      className={cn(
                        "px-4 py-2 text-sm cursor-pointer hover:bg-primary/10 flex items-center justify-between",
                        formData.specific_category === cat && "bg-primary/10 text-primary font-medium"
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
                  <div className="px-4 py-2 text-sm text-muted-foreground">No categories found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Supplier & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Supplier *
            </label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoadingSuppliers}
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map((sup) => (
                <option key={sup.supplier_id} value={sup.supplier_id}>
                  {sup.supplier_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Row 4: Pricing & Inventory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Unit Cost *
            </label>
            <input
              type="text"
              value={formatNumberWithCommas(formData.unit_price)}
              onChange={(e) => handleNumericChange("unit_price", e.target.value)}
              onBlur={() => handleNumericBlur("unit_price")}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Retail Price {mode === "pos" ? "*" : ""}
            </label>
            <input
              type="text"
              value={formatNumberWithCommas(formData.pos_price)}
              onChange={(e) => handleNumericChange("pos_price", e.target.value)}
              onBlur={() => handleNumericBlur("pos_price")}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
              required={mode === "pos"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Initial Stock
            </label>
            <input
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
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
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted/50 text-muted-foreground"
              disabled
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Adding..." : submitLabel}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

