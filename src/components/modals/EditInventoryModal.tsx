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
    serial_start: "",
    serial_end: "",
    expiry_date: "",
  });

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
        reason_adjustment: "Lost",
        serial_start: item.serial_start || "",
        serial_end: item.serial_end || "",
        expiry_date: item.expiry_date || "",
      });
    }
  }, [item]);

  useEffect(() => {
    if (formData.reason_adjustment === "Restock" && item) {
       // Fetch existing items for this SKU to find max serial
       api.getInventoryItems().then(items => {
         const skuItems = items.filter(i => i.sku === item.sku);
         let maxSerial = 0;
         skuItems.forEach(i => {
           const end = i.serial_end ? parseInt(i.serial_end) : 0;
           if (end > maxSerial) maxSerial = end;
         });
         const nextStart = maxSerial + 1;
         const qty = parseInt(formData.quantity) || 0;
         const nextEnd = nextStart + qty - 1;
         
         setFormData(prev => ({
           ...prev,
           serial_start: String(nextStart).padStart(4, '0'),
           serial_end: String(nextEnd).padStart(4, '0')
         }));
       }).catch(console.error);
    }
  }, [formData.reason_adjustment, formData.quantity, item]);

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
        reason_adjustment: formData.reason_adjustment,
        serial_start: formData.serial_start || undefined,
        serial_end: formData.serial_end || undefined,
        expiry_date: formData.expiry_date || undefined,
        unit_price: item.unit_price,
        pos_price: item.pos_price,
      };

      if (formData.reason_adjustment === "Restock") {
        // Create a NEW batch instead of updating the current one
        await api.addInventoryItem({
           ...payload,
           product_id: item.product_id
        });
        toast.success("New batch (Restock) added successfully");
      } else {
        await api.updateInventoryItem(item.inventory_id, payload);
        toast.success("Inventory updated successfully");
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
    <BaseModal isOpen={isOpen} onClose={onClose} title="Edit Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
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

        <div className="grid grid-cols-3 gap-4">
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
              <option value="Set">Foot / Meter</option>
              <option value="Set">Pair</option>
              <option value="Set">Drum</option>
              <option value="Set">Roll</option>
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
              Physical Count (Actual) {formData.reason_adjustment === "Restock" && <span className="text-xs text-muted-foreground/70 font-normal">(Synced with Quantity)</span>}
            </label>
            <input
              type="number"
              className={cn(
                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none",
                (formData.reason_adjustment === "Restock") ? "bg-muted/50 border-border" : "border-border"
              )}
              value={formData.actual}
              readOnly={formData.reason_adjustment === "Restock"}
              onChange={(e) => {
                const val = e.target.value;
                const update = { ...formData, actual: val };
                if (formData.reason_adjustment !== "Restock") {
                  update.quantity = val;
                }
                setFormData(update);
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Quantity {(formData.reason_adjustment === "Lost" || formData.reason_adjustment === "Damaged") && <span className="text-xs text-muted-foreground/70 font-normal">(Synced with Actual)</span>}
            </label>
            <input
              type="number"
              className={cn(
                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none",
                (formData.reason_adjustment === "Lost" || formData.reason_adjustment === "Damaged") ? "bg-muted/50 border-border" : "border-border"
              )}
              value={formData.quantity}
              readOnly={formData.reason_adjustment === "Lost" || formData.reason_adjustment === "Damaged"}
              onChange={(e) => {
                const val = e.target.value;
                const update = { ...formData, quantity: val };
                if (formData.reason_adjustment !== "Lost" && formData.reason_adjustment !== "Damaged" && formData.reason_adjustment !== "Manual Count") {
                   // Only sync Quantity -> Actual for Restock or others where Actual is system-derived
                   update.actual = val;
                } else if (formData.reason_adjustment === "Manual Count" || formData.reason_adjustment === "Lost" || formData.reason_adjustment === "Damaged") {
                   // If user edits quantity directly, also sync actual
                   update.actual = val;
                }
                setFormData(update);
              }}
            />
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
              const update = { ...formData, reason_adjustment: reason };
              if (reason === "Restock") {
                update.actual = formData.quantity;
              } else {
                // For Manual Count, Lost, Damaged, sync Actual and Quantity
                update.quantity = formData.actual;
              }
              setFormData(update);
            }}
          >
            <option value="Lost">Lost</option>
            <option value="Damaged">Damaged</option>
            <option value="Restock">Restock (Add New Batch)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Serial No. Range
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Start"
                className="w-1/2 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-muted/20"
                value={formData.serial_start}
                onChange={(e) => setFormData({ ...formData, serial_start: e.target.value })}
              />
              <input
                type="text"
                placeholder="End"
                className="w-1/2 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-muted/20"
                value={formData.serial_end}
                readOnly={formData.reason_adjustment === "Restock"}
                onChange={(e) => setFormData({ ...formData, serial_end: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>
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
            {isSubmitting ? "Updating..." : "Edit Item"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
