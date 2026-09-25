import React, { useState, useEffect, useRef } from "react";
import { BaseModal } from "./BaseModal";
import { api, type InventoryItem, type BulkRestockItemPayload } from "@/services/api";
import { toast } from "sonner";
import { Search, Trash2, Plus, Minus, Package, AlertCircle, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkRestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items: InventoryItem[];
}

interface RestockEntry {
  item: InventoryItem;
  quantityToAdd: number;
  reasonAdjustment: string;
}

export function BulkRestockModal({
  isOpen,
  onClose,
  onSuccess,
  items,
}: BulkRestockModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<RestockEntry[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Clear selections when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedItems([]);
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items based on search term and exclude already selected items
  const selectedIds = new Set(selectedItems.map((e) => e.item.inventory_id));
  const filteredSearchItems = items.filter(
    (item) =>
      item.status !== "Archived" &&
      !selectedIds.has(item.inventory_id) &&
      (item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItems((prev) => [...prev, { item, quantityToAdd: 10, reasonAdjustment: "Restock" }]);
    setSearchTerm("");
    setIsDropdownOpen(false);
  };

  const handleReasonChange = (inventoryId: number, reason: string) => {
    setSelectedItems((prev) =>
      prev.map((entry) => {
        if (entry.item.inventory_id === inventoryId) {
          let qty = entry.quantityToAdd;
          if (reason === "Lost" || reason === "Damaged") {
            qty = Math.min(qty, entry.item.quantity);
          }
          return { ...entry, reasonAdjustment: reason, quantityToAdd: qty };
        }
        return entry;
      })
    );
  };

  const handleQuantityChange = (inventoryId: number, val: number) => {
    if (val < 1) return;
    setSelectedItems((prev) =>
      prev.map((entry) => {
        if (entry.item.inventory_id === inventoryId) {
          let finalVal = val;
          if (entry.reasonAdjustment === "Lost" || entry.reasonAdjustment === "Damaged") {
            finalVal = Math.min(val, entry.item.quantity);
          }
          return { ...entry, quantityToAdd: finalVal };
        }
        return entry;
      })
    );
  };

  const handleRemoveItem = (inventoryId: number) => {
    setSelectedItems((prev) =>
      prev.filter((entry) => entry.item.inventory_id !== inventoryId)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to adjust/restock");
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadItems: BulkRestockItemPayload[] = selectedItems.map((entry) => ({
        inventory_id: entry.item.inventory_id,
        quantity_to_add: entry.quantityToAdd,
        reason_adjustment: entry.reasonAdjustment,
      }));

      await api.bulkRestock({ items: payloadItems });

      toast.success(`Successfully processed bulk adjustments for ${selectedItems.length} items`);

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to perform bulk adjustments");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItemsCount = selectedItems.length;
  const totalRestockUnits = selectedItems
    .filter((e) => e.reasonAdjustment === "Restock")
    .reduce((acc, entry) => acc + entry.quantityToAdd, 0);
  const totalDeductedUnits = selectedItems
    .filter((e) => e.reasonAdjustment === "Lost" || e.reasonAdjustment === "Damaged")
    .reduce((acc, entry) => acc + entry.quantityToAdd, 0);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Bulk Adjust / Restock Inventory" maxWidth="2xl">
      <div className="space-y-6">
        {/* Description Banner */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-border flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-foreground">
            <p className="font-semibold">Bulk Adjustment & Restocking Mode</p>
            <p className="mt-0.5 text-muted-foreground">
              Select multiple inventory items, input the quantities, select the adjustment reason (Restock, Lost, or Damaged), and click confirm to apply the updates at once.
            </p>
          </div>
        </div>

        {/* Product Search & Selector */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-muted-foreground dark:text-gray-300 mb-1.5">
            Search & Select Products
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50/50 dark:bg-zinc-900/50 border border-border/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Dropdown List */}
          {isDropdownOpen && searchTerm.trim() !== "" && (
            <div className="absolute z-50 w-full mt-1.5 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-border/50">
              {filteredSearchItems.length > 0 ? (
                filteredSearchItems.map((item) => (
                  <div
                    key={item.inventory_id}
                    onClick={() => handleSelectItem(item)}
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {item.product_name}
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground/60 mt-0.5">
                        SKU: {item.sku} • Category: {item.category_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Current: {item.quantity}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  No active matching products found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Items Form List */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border border-border/60 rounded-xl overflow-hidden bg-zinc-50/20 dark:bg-zinc-900/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Product Description</th>
                  <th className="px-4 py-3 text-center w-24">Current Stock</th>
                  <th className="px-4 py-3 text-center w-32">Quantity</th>
                  <th className="px-4 py-3 text-center w-40">Reason for Adjustment</th>
                  <th className="px-4 py-3 text-center w-16">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/45">
                {selectedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <ShoppingBag className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2.5" />
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No items selected yet</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Search and select items above to build your list</p>
                    </td>
                  </tr>
                ) : (
                  selectedItems.map(({ item, quantityToAdd, reasonAdjustment }) => (
                    <tr key={item.inventory_id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-foreground">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.inventory_id, quantityToAdd - 1)}
                            disabled={quantityToAdd <= 1}
                            className="p-1 border border-border/80 hover:border-border rounded-lg bg-card text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={(reasonAdjustment === "Lost" || reasonAdjustment === "Damaged") ? item.quantity : undefined}
                            value={quantityToAdd}
                            onChange={(e) => handleQuantityChange(item.inventory_id, parseInt(e.target.value) || 1)}
                            className="w-16 px-1.5 py-1 border border-border rounded-lg text-center bg-card text-foreground font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-primary shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(item.inventory_id, quantityToAdd + 1)}
                            disabled={(reasonAdjustment === "Lost" || reasonAdjustment === "Damaged") && quantityToAdd >= item.quantity}
                            className="p-1 border border-border/80 hover:border-border rounded-lg bg-card text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-primary outline-none text-sm"
                          value={reasonAdjustment}
                          onChange={(e) => handleReasonChange(item.inventory_id, e.target.value)}
                        >
                          <option value="Restock">Restock</option>
                          <option value="Lost" disabled={item.quantity <= 0}>Lost</option>
                          <option value="Damaged" disabled={item.quantity <= 0}>Damaged</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.inventory_id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary / Footer section */}
          {selectedItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-border/50 rounded-xl text-sm font-medium">
              <div className="flex gap-6 text-muted-foreground">
                <div>
                  Products Selected: <span className="text-foreground font-semibold">{totalItemsCount}</span>
                </div>
                {totalRestockUnits > 0 && (
                  <div>
                    Total Restock Units: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{totalRestockUnits}</span>
                  </div>
                )}
                {totalDeductedUnits > 0 && (
                  <div>
                    Total Deducted Units: <span className="text-red-600 dark:text-red-400 font-semibold">-{totalDeductedUnits}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedItems.length === 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Confirm Adjustments
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
}
