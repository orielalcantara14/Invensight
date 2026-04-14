import React, { useState, useEffect } from "react";
import { BaseModal } from "./BaseModal";
import { api, type Supplier } from "@/services/api";
import { toast } from "sonner";

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: Supplier | null;
  existingSuppliers?: Supplier[];
}

export function EditSupplierModal({
  isOpen,
  onClose,
  onSuccess,
  supplier,
  existingSuppliers,
}: EditSupplierModalProps) {
  const normalizePhilippineMobile = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;
    if (/^09\d{9}$/.test(digits)) return digits;
    if (/^639\d{9}$/.test(digits)) return `0${digits.slice(2)}`;
    return null;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    supplier_name: "",
    address: "",
    email: "",
    contact_number: "",
    product_supplied: "",
    status: "Active",
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        supplier_name: supplier.supplier_name,
        address: supplier.address || "",
        email: supplier.email || "",
        contact_number: supplier.contact_number || "",
        product_supplied: supplier.product_supplied || "",
        status: supplier.status || "Active",
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !formData.supplier_name) {
      toast.error("Supplier name is required");
      return;
    }
    const isDuplicate = existingSuppliers?.some(
      (s) => s.supplier_id !== supplier.supplier_id && 
             s.supplier_name.toLowerCase() === formData.supplier_name.toLowerCase()
    );
    if (isDuplicate) {
      toast.error("A supplier with this name already exists");
      return;
    }
    const normalizedContact = formData.contact_number
      ? normalizePhilippineMobile(formData.contact_number)
      : null;
    if (formData.contact_number && !normalizedContact) {
      toast.error("Contact number must be a valid Philippine mobile number");
      return;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address (e.g., example@gmail.com)");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateSupplier(supplier.supplier_id, {
        supplier_name: formData.supplier_name,
        address: formData.address || null,
        email: formData.email || null,
        contact_number: normalizedContact,
        product_supplied: formData.product_supplied || null,
        status: formData.status,
      });
      toast.success("Supplier updated successfully");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Edit Supplier">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="e.g. Global Parts Co."
            value={formData.supplier_name}
            onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="Full business address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="contact@supplier.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="09XXXXXXXXX or 639XXXXXXXXX"
              value={formData.contact_number}
              onChange={(e) =>
                setFormData({ ...formData, contact_number: e.target.value.replace(/\D/g, "").slice(0, 12) })
              }
              inputMode="numeric"
              maxLength={12}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Products
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            placeholder="e.g. Tires, Batteries, Oil"
            value={formData.product_supplied}
            onChange={(e) => setFormData({ ...formData, product_supplied: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
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
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              "Update Supplier"
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
