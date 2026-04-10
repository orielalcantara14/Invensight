import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import { BaseModal } from './BaseModal';
import { PermissionsModal } from './PermissionsModal';
import type { Role } from '@/types';
import { toast } from 'sonner';

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
    permissions?: Record<string, string[]>;
  }) => void | Promise<void>;
  /** Role names for the dropdown; defaults to [] if omitted (e.g. legacy call sites). */
  roleNames?: string[];
  roles?: Role[];
  error?: string | null;
  saving?: boolean;
  submitLabel?: string;
}

export function AddUserModal({
  isOpen,
  onClose,
  onAddUser,
  roleNames = [],
  roles = [],
  error = null,
  saving = false,
  submitLabel = 'Next',
}: AddUserModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    username: '',
    surname: '',
    firstName: '',
    middleName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [overriddenPermissions, setOverriddenPermissions] = useState<Record<string, string[]> | null>(null);

  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => initialFocusRef.current?.focus(), 100);
    } else {
      setFormData({
        username: '',
        surname: '',
        firstName: '',
        middleName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        status: 'Active',
      });
      setOverriddenPermissions(null);
      setStep(1);
    }
  }, [isOpen]);

  const validatePassword = (pass: string) => {
    return {
      length: pass.length >= 8,
      upper: /[A-Z]/.test(pass),
      lower: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*]/.test(pass)
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate Password
    const v = validatePassword(formData.password);
    const isValid = Object.values(v).every(Boolean);
    
    if (!isValid) {
      toast.error("Password does not meet requirements");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!formData.surname.trim() || !formData.firstName.trim()) {
      toast.error("Surname and First Name are required");
      return;
    }

    if (!formData.role) {
      toast.error("Please select a role");
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (permissions: Record<string, string[]>) => {
    const fullName = `${formData.surname.trim()}, ${formData.firstName.trim()} ${formData.middleName.trim()}`.trim();
    const sanitized = {
      ...formData,
      username: formData.username.trim(),
      fullName: fullName,
      email: formData.email.trim(),
      permissions: permissions,
    };
    await onAddUser(sanitized);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (step === 2) {
    const matchedRole = roles.find(r => r.name === formData.role);
    const matchedPermissions = matchedRole?.permissions || {};
    return (
      <PermissionsModal
        isOpen={isOpen}
        onClose={() => setStep(1)}
        onSave={handleFinalSubmit}
        initialPermissions={overriddenPermissions || matchedPermissions}
        isReadOnly={false}
        primaryLabel={saving ? "Adding User…" : "Confirm & Add User"}
        saving={saving}
        error={error}
      />
    );
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Add New User" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username and Role row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="username" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Username
            </label>
            <input
              ref={initialFocusRef}
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              placeholder="username"
              required
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="role" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
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

        {/* Names Section */}
        <div className="space-y-4 pt-2">
          <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-1">Personal Information</p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="surname" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Surname
              </label>
              <input
                id="surname"
                type="text"
                value={formData.surname}
                onChange={(e) => handleChange('surname', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dela Cruz"
                required
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Juan"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="middleName" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Middle Name
                </label>
                <input
                  id="middleName"
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => handleChange('middleName', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Perez"
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
           <div>
            <label htmlFor="email" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              placeholder="user@jonbrix.com"
              autoComplete="email"
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Account Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as 'Active' | 'Inactive')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
              disabled={saving}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Password Section */}
        <div className="space-y-4 pt-2">
          <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-1">Security Credentials</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                disabled={saving}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                disabled={saving}
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">Password Security Requirements</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <RequirementItem label="8-12 Characters" met={formData.password.length >= 8} />
              <RequirementItem label="Uppercase" met={/[A-Z]/.test(formData.password)} />
              <RequirementItem label="Lowercase" met={/[a-z]/.test(formData.password)} />
              <RequirementItem label="Number" met={/[0-9]/.test(formData.password)} />
              <RequirementItem label="Special (!@#$%^&*)" met={/[!@#$%^&*]/.test(formData.password)} />
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${formData.password.length >= 12 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`text-[10px] font-bold ${formData.password.length >= 12 ? 'text-green-600' : 'text-gray-400'}`}>Recommended (12+)</span>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-bold text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-50 text-sm uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || roleNames.length === 0}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2.5 font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-50 text-sm uppercase tracking-widest shadow-lg shadow-gray-200"
          >
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

function RequirementItem({ label, met }: { label: string, met: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${met ? 'bg-green-500' : 'bg-red-400 opacity-50'}`} />
      <span className={`text-[10px] font-bold uppercase tracking-tight ${met ? 'text-green-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}
