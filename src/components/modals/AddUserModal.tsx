import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import { BaseModal } from './BaseModal';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (user: {
    username: string;
    fullName: string;
    email: string;
    password: string;
    role: string;
    status: 'Active' | 'Inactive';
  }) => void | Promise<void>;
  /** Role names for the dropdown; defaults to [] if omitted (e.g. legacy call sites). */
  roleNames?: string[];
  error?: string | null;
  saving?: boolean;
}

export function AddUserModal({
  isOpen,
  onClose,
  onAddUser,
  roleNames = [],
  error = null,
  saving = false,
}: AddUserModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => initialFocusRef.current?.focus(), 100);
    } else {
      setFormData({
        username: '',
        fullName: '',
        email: '',
        password: '',
        role: '',
        status: 'Active',
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onAddUser(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Add New User" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              ref={initialFocusRef}
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="username"
              required
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
              required
              disabled={saving}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="user@jonbrix.com"
            autoComplete="email"
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
              disabled={saving}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={roleNames.length === 0 || saving}
            >
              <option value="" disabled>
                {roleNames.length === 0 ? 'No roles — add one in Roles tab' : 'Select role'}
              </option>
              {roleNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as 'Active' | 'Inactive')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={saving}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || roleNames.length === 0}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add User'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
