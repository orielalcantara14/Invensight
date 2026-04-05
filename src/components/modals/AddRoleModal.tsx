import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import { BaseModal } from './BaseModal';
import { PermissionsModal } from './PermissionsModal';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRole: (role: {
    name: string;
    permissions: Record<string, string[]>;
  }) => void | Promise<void>;
  error?: string | null;
  saving?: boolean;
}

export function AddRoleModal({
  isOpen,
  onClose,
  onAddRole,
  error = null,
  saving = false,
}: AddRoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    permissions: {} as Record<string, string[]>
  });
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => initialFocusRef.current?.focus(), 100);
    } else {
      setFormData({ name: '', permissions: {} });
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onAddRole(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Add New Role" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-1">
            Role Name
          </label>
          <input
            ref={initialFocusRef}
            id="roleName"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter Role Name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Permissions
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPermissionsModal(true)}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 font-medium whitespace-nowrap"
            >
              Configure Permissions
            </button>
            <div className="text-sm text-gray-500 py-2">
              {Object.keys(formData.permissions).length > 0 
                ? `${Object.keys(formData.permissions).length} modules selected`
                : "No permissions selected"}
            </div>
          </div>
        </div>

        {showPermissionsModal && (
          <PermissionsModal
            isOpen={showPermissionsModal}
            onClose={() => setShowPermissionsModal(false)}
            initialPermissions={formData.permissions}
            onSave={(perms: Record<string, string[]>) => handleChange('permissions', perms)}
            primaryLabel="Done"
          />
        )}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 mt-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add Role"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
