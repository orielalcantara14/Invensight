import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import { BaseModal } from './BaseModal';
import { PermissionsModal } from './PermissionsModal';
import type { Role, User } from '@/types';
import { toast } from 'sonner';
import { Check, Copy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = "service_kzur8un";
const EMAILJS_TEMPLATE_ID = "template_nn7zdgv";
const EMAILJS_PUBLIC_KEY = "ZnEuZEpNlMgItPEBG";

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
  }) => Promise<User | undefined>;
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    username: '',
    surname: '',
    firstName: '',
    middleName: '',
    email: '',
    role: '',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [generatedTempPass, setGeneratedTempPass] = useState('');
  const [generatedEmployeeId, setGeneratedEmployeeId] = useState('');
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
        role: '',
        status: 'Active',
      });
      setOverriddenPermissions(null);
      setGeneratedTempPass('');
      setGeneratedEmployeeId('');
      setStep(1);
    }
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error("Username is required");
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

    // Calculate the temp password that the backend will generate to show to the admin
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const tempPass = `${formData.username.trim()}@jonbrix${today}`;

    const sanitized = {
      username: formData.username.trim(),
      fullName: fullName,
      email: formData.email.trim(),
      password: tempPass,
      role: formData.role,
      status: formData.status,
      permissions: permissions,
    };

    try {
      const newUser = await onAddUser(sanitized);
      if (newUser) {
        setGeneratedTempPass(tempPass);
        setGeneratedEmployeeId(newUser.employeeId);

        // Send email if email address is provided
        if (formData.email.trim()) {
           try {
             await emailjs.send(
               EMAILJS_SERVICE_ID,
               EMAILJS_TEMPLATE_ID,
               {
                 Username: formData.username.trim(),
                 Password: tempPass,
                 full_name: fullName,
                 email: formData.email.trim()
               },
               EMAILJS_PUBLIC_KEY
             );
             toast.success("Credentials sent to user's email");
           } catch (emailErr) {
             console.error("EmailJS Error:", emailErr);
             toast.error("Account created, but failed to send email.");
           }
        }

        setStep(3);
      }
    } catch (err) {
      // Error is handled by the parent via the 'error' prop
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (step === 3) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-500">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[420px] bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            {/* Animated Mesh Header */}
            <div className="relative h-48 bg-gradient-to-br from-indigo-600 via-blue-600 to-fuchsia-600 overflow-hidden">
              {/* Background Decorative Circles */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 10, repeat: Infinity }}
                className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
                transition={{ duration: 12, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-10 -right-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"
              />

              <button
                onClick={onClose}
                className="absolute top-6 right-6 z-10 p-2 bg-black/20 hover:bg-black/40 text-white/70 hover:text-white rounded-full transition-all backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-white/30 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
                    <Check className="w-12 h-12 text-indigo-600 stroke-[3]" />
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="px-10 pb-12 pt-8 text-center relative">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Account Ready!</h2>
                <p className="text-slate-400 text-sm mb-10 leading-relaxed px-4">
                  User account has been created. Please secure these temporary credentials.
                </p>
              </motion.div>

              <div className="space-y-6 text-left">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-3 block ml-1 px-1 border-l-2 border-indigo-500/50">Username</label>
                  <div className="relative group">
                    <div className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 group-hover:border-indigo-500/30 transition-all duration-300 rounded-2xl px-6 py-5 text-white font-bold text-lg backdrop-blur-md">
                      {formData.username}
                    </div>
                    <button
                      onClick={() => copyToClipboard(formData.username, 'Username')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-xl transition-all shadow-lg"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-3 block ml-1 px-1 border-l-2 border-emerald-500/50">Temporary Password</label>
                  <div className="relative group">
                    <div className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 group-hover:border-emerald-500/30 transition-all duration-300 rounded-2xl px-6 py-5 text-emerald-400 font-bold text-lg select-all backdrop-blur-md">
                      {generatedTempPass}
                    </div>
                    <button
                      onClick={() => copyToClipboard(generatedTempPass, 'Temporary Password')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-xl transition-all shadow-lg"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              </div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={onClose}
                className="w-full mt-12 py-5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-indigo-900/20"
              >
                Finalize & Close
              </motion.button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

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
