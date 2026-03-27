import React, { useState, useEffect } from "react";
import { BaseModal } from "./BaseModal";
import { api, type Supplier, type InventoryItem } from "@/services/api";
import { toast } from "sonner";

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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    quantity_on_hand: "0",
    reorder_level: "0",
    supplier_id: "",
  });

  useEffect(() => {
    if (isOpen) {
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
      fetchSuppliers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      setFormData({
        quantity_on_hand: String(item.quantity_on_hand),
        reorder_level: String(item.reorder_level),
        supplier_id: item.supplier_name ? String(suppliers.find(s => s.supplier_name === item.supplier_name)?.supplier_id || "") : "",
      });
    }
  }, [item, suppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setIsSubmitting(true);
    try {
      await api.updateInventoryItem(item.inventory_id, {
        quantity_on_hand: parseInt(formData.quantity_on_hand),
        reorder_level: parseInt(formData.reorder_level),
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
      });
      toast.success("Inventory updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update inventory");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={`Edit Inventory - ${item?.product_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Level *
            </label>
            <input
              type="number"
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={formData.quantity_on_hand}
              onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Level *
            </label>
            <input
              type="number"
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={formData.reorder_level}
              onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={formData.supplier_id}
            onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
          >
            <option value="">Select a supplier</option>
            {suppliers.map((s) => (
              <option key={s.supplier_id} value={s.supplier_id}>
                {s.supplier_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingSuppliers}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              "Update Inventory"
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
