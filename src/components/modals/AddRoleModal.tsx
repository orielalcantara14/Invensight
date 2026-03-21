import { useState, useRef, useEffect } from 'react';
import { BaseModal } from './BaseModal';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRole: (role: {
    name: string;
    permissions: string;
  }) => void;
}

export function AddRoleModal({ isOpen, onClose, onAddRole }: AddRoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    permissions: ''
  });

  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => initialFocusRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRole(formData);
    setFormData({ name: '', permissions: '' });
    onClose();
  };

  const handleChange = (field: string, value: string) => {
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
          <label htmlFor="permissions" className="block text-sm font-medium text-gray-700 mb-1">
            Permissions
          </label>
          <textarea
            id="permissions"
            value={formData.permissions}
            onChange={(e) => handleChange('permissions', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[80px] resize-none"
            placeholder="Describe permissions for this role"
          />
        </div>

        <div className="flex gap-3 mt-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Add Role
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
