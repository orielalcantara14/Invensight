import React, { useState, useEffect, useRef } from "react";
import { BaseModal } from "./BaseModal";
import { api, type Supplier, type InventoryItem } from "@/services/api";
import { toast } from "sonner";
import { Search, ChevronDown, Check } from "lucide-react";
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

interface EditInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: InventoryItem | null;
}

export function EditInventoryModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: EditInventoryModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supplierRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    product_name: "",
    sku: "",
    supplier_name: "",
    unit_of_measurement: "",
    specific_category: "",
    category_id: "",
    quantity: "0",
    expected: "0",
    reorder_level: "0",
    actual: "0",
    reason_adjustment: "",
  });

  const [adjustmentValue, setAdjustmentValue] = useState<string>("");

  const isAdjustmentMode = formData.reason_adjustment !== "";

  const handleAdjustmentChange = (valueStr: string, reason: string) => {
    setAdjustmentValue(valueStr);
    const amt = Math.max(0, parseInt(valueStr) || 0);
    const currentQty = item?.quantity || 0;
    const currentActual = item?.actual || 0;

    if (reason === "Restock") {
      setFormData({
        ...formData,
        quantity: String(currentQty + amt),
        actual: String(currentActual + amt),
      });
    } else if (reason === "Lost" || reason === "Damaged") {
      setFormData({
        ...formData,
        quantity: String(currentQty - amt),
        actual: String(currentActual - amt),
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (supplierRef.current && !supplierRef.current.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, sups] = await Promise.all([
          api.getCategories(),
          api.getSuppliers()
        ]);
        setCategories(cats);
        setSuppliers(sups);
      } catch (error) {
        toast.error("Failed to load dependency data");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (item) {
      setFormData({
        product_name: item.product_name,
        sku: item.sku,
        supplier_name: item.supplier_name || "",
        unit_of_measurement: item.unit_of_measurement || "",
        specific_category: item.specific_category || "",
        category_id: item.category_id ? String(item.category_id) : "",
        quantity: String(item.quantity),
        expected: String(item.expected),
        reorder_level: String(item.reorder_level),
        actual: String(item.actual),
        reason_adjustment: "", // Start with Select Reason (None)
      });
      setAdjustmentValue("");
    }
  }, [item]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setIsSubmitting(true);
    try {
      const payload = {
        product_name: formData.product_name,
        sku: formData.sku,
        supplier_name: formData.supplier_name || undefined,
        unit_of_measurement: formData.unit_of_measurement || undefined,
        specific_category: formData.specific_category || undefined,
        category_id: formData.category_id ? parseInt(formData.category_id) : undefined,
        quantity: parseInt(formData.quantity),
        expected: parseInt(formData.expected),
        reorder_level: parseInt(formData.reorder_level),
        actual: parseInt(formData.actual),
        reason_adjustment: formData.reason_adjustment || undefined,
        unit_price: item.unit_price,
        pos_price: item.pos_price,
      };

      if (formData.reason_adjustment === "Restock") {
        const inputQty = parseInt(formData.quantity);
        if (inputQty <= item.quantity) {
          toast.error("Restock quantity must be greater than 0");
          setIsSubmitting(false);
          return;
        }

        // UPDATE existing row instead of creating a NEW batch
        await api.updateInventoryItem(item.inventory_id, payload);
        toast.success(`Restock successful: Added ${parseInt(adjustmentValue) || 0} units (New total: ${inputQty})`);
      } else if (isAdjustmentMode) {
        const inputActual = parseInt(formData.actual);
        const diff = item.quantity - inputActual;
        if (inputActual < 0 || diff <= 0) {
          toast.error(`Deduction quantity must be greater than 0 and cannot exceed current quantity (${item.quantity})`);
          setIsSubmitting(false);
          return;
        }

        await api.updateInventoryItem(item.inventory_id, payload);
        toast.success(`Adjustment successful: Deducted ${diff} units (New total: ${inputActual})`);
      } else {
        // Metadata-only update (e.g. Supplier, SKU)
        await api.updateInventoryItem(item.inventory_id, payload);
        toast.success("Item details updated successfully");
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update inventory");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSpecificCategories = SPECIFIC_CATEGORIES.filter(cat =>
    cat.toLowerCase().includes(formData.specific_category.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(sup =>
    sup.supplier_name.toLowerCase().includes(formData.supplier_name.toLowerCase())
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Edit Item" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Product Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              SKU
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono text-sm uppercase"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g. OIL-0001"
            />
          </div>
        </div>

        <div className="relative" ref={supplierRef}>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Supplier Name
          </label>
          <div className="relative">
            <input
              type="text"
              className="w-full pl-3 pr-10 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              placeholder="Search supplier..."
              value={formData.supplier_name}
              onFocus={() => setIsSupplierDropdownOpen(true)}
              onChange={(e) => {
                setFormData({ ...formData, supplier_name: e.target.value });
                setIsSupplierDropdownOpen(true);
              }}
            />
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
            >
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground/70 transition-transform", isSupplierDropdownOpen && "rotate-180")} />
            </div>
          </div>

          {isSupplierDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((sup) => (
                  <div
                    key={sup.supplier_id}
                    className={cn(
                      "px-4 py-2 text-sm cursor-pointer hover:bg-primary/10 flex items-center justify-between",
                      formData.supplier_name === sup.supplier_name && "bg-primary/10 text-primary font-medium"
                    )}
                    onClick={() => {
                      setFormData({ ...formData, supplier_name: sup.supplier_name });
                      setIsSupplierDropdownOpen(false);
                    }}
                  >
                    {sup.supplier_name}
                    {formData.supplier_name === sup.supplier_name && <Check className="w-4 h-4" />}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-muted-foreground">No suppliers found</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Unit Measurement
            </label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={formData.unit_of_measurement}
              onChange={(e) => setFormData({ ...formData, unit_of_measurement: e.target.value })}
            >
              <option value="">Select Unit</option>
              <option value="Liter">Liter</option>
              <option value="Milliliter">Milliliter</option>
              <option value="Piece">Piece</option>
              <option value="Set">Set</option>
              <option value="Foot / Meter">Foot / Meter</option>
              <option value="Pair">Pair</option>
              <option value="Drum">Drum</option>
              <option value="Roll">Roll</option>
            </select>
          </div>
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Specific Category
            </label>
            <div className="relative">
              <input
                type="text"
                className="w-full pl-3 pr-10 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
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
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Category
            </label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {formData.reason_adjustment === "Lost" || formData.reason_adjustment === "Damaged" ? (
                <>
                  Quantity to Deduct <span className="text-xs text-red-500 font-normal">(Max {item?.quantity || 0})</span>
                </>
              ) : (
                <>
                  Physical Count (Actual){" "}
                  {!isAdjustmentMode ? (
                    <span className="text-xs text-muted-foreground/70 font-normal">(Disabled)</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/70 font-normal">(Synced with Quantity)</span>
                  )}
                </>
              )}
            </label>
            {formData.reason_adjustment === "Lost" || formData.reason_adjustment === "Damaged" ? (
              <input
                type="number"
                min="1"
                max={item?.quantity || 0}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="Enter quantity to deduct..."
                value={adjustmentValue}
                onChange={(e) => handleAdjustmentChange(e.target.value, formData.reason_adjustment)}
              />
            ) : (
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg bg-muted/50 border-border focus:ring-2 focus:ring-primary outline-none"
                value={formData.actual}
                readOnly
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {formData.reason_adjustment === "Restock" ? (
                <>
                  Quantity to Add <span className="text-xs text-green-600 font-normal">(Enter amount)</span>
                </>
              ) : (
                <>
                  Quantity{" "}
                  {!isAdjustmentMode ? (
                    <span className="text-xs text-muted-foreground/70 font-normal">(Disabled)</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/70 font-normal">(Synced with Actual)</span>
                  )}
                </>
              )}
            </label>
            {formData.reason_adjustment === "Restock" ? (
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="Enter quantity to add..."
                value={adjustmentValue}
                onChange={(e) => handleAdjustmentChange(e.target.value, "Restock")}
              />
            ) : (
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg bg-muted/50 border-border focus:ring-2 focus:ring-primary outline-none"
                value={formData.quantity}
                readOnly
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Reorder Level
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={formData.reorder_level}
              onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Reason For Adjustment
          </label>
          <select
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            value={formData.reason_adjustment}
            onChange={(e) => {
              const reason = e.target.value;
              setAdjustmentValue("");
              setFormData({
                ...formData,
                reason_adjustment: reason,
                quantity: String(item?.quantity || 0),
                actual: String(item?.actual || 0),
              });
            }}
          >
            <option value="">-- Select Reason --</option>
            <option value="Lost">Lost</option>
            <option value="Damaged">Damaged</option>
            <option value="Restock">Restock</option>
          </select>
        </div>


        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Processing..." : "Save Changes"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
