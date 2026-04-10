import React, { useState, useEffect, useRef, type FormEvent } from "react";
import { BaseModal } from "./BaseModal";
import type { User, Role } from "@/types";
import type { UpdateUserPayload } from "@/services/api";
import { PermissionsModal } from "./PermissionsModal";
import { Shield } from "lucide-react";
import { toast } from "sonner";

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (userId: number, payload: UpdateUserPayload) => void | Promise<void>;
  roleNames: string[];
  roles: Role[];
  error?: string | null;
  saving?: boolean;
}

export function EditUserModal({
  isOpen,
  user,
  onClose,
  onSave,
  roleNames = [],
  roles = [],
  error = null,
  saving = false,
}: EditUserModalProps) {
  const [username, setUsername] = useState("");
  const [surname, setSurname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || "");
      
      // Parse Full Name: formats "Surname, FirstName MiddleName" or "FirstName MiddleName Surname"
      const raw = user.fullName || "";
      if (raw.includes(",")) {
        const [sn, rest] = raw.split(",").map(s => s.trim());
        setSurname(sn || "");
        const parts = (rest || "").split(/\s+/).filter(Boolean);
        setFirstName(parts[0] || "");
        setMiddleName(parts.slice(1).join(" ") || "");
      } else {
        const parts = raw.split(/\s+/).filter(Boolean);
        if (parts.length > 1) {
          setSurname(parts[parts.length - 1]);
          setFirstName(parts.slice(0, -1).join(" "));
          setMiddleName("");
        } else {
          setSurname(raw);
          setFirstName("");
          setMiddleName("");
        }
      }

      setEmail(user.email || "");
      setRole(user.role || "");
      setStatus(user.status);
      setNewPassword("");
      setConfirmNewPassword("");
      setPermissions(user.permissions || {});
      setTimeout(() => initialFocusRef.current?.focus(), 100);
    }
  }, [isOpen, user]);

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
    if (!user) return;

    if (newPassword.trim()) {
       const v = validatePassword(newPassword);
       const isValid = Object.values(v).every(Boolean);
       if (!isValid) {
         toast.error("New password does not meet security requirements");
         return;
       }
       if (newPassword !== confirmNewPassword) {
         toast.error("Passwords do not match");
         return;
       }
    }

    if (!surname.trim() || !firstName.trim()) {
      toast.error("Surname and First Name are required");
      return;
    }

    const fullName = `${surname.trim()}, ${firstName.trim()} ${middleName.trim()}`.trim();

    const payload: UpdateUserPayload = {
      username: username.trim(),
      full_name: fullName,
      email: email.trim() || null,
      role,
      is_active: status === "Active",
      permissions: permissions,
    };
    const pw = newPassword.trim();
    if (pw) {
      payload.new_password = pw;
    }
    await onSave(user.id, payload);
  };

  if (!user) return null;

  const matchedRole = roles.find(r => r.name === role);
  const matchedPermissions = matchedRole?.permissions || {};

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} title="Edit User" maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-username" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Username
              </label>
              <input
                ref={initialFocusRef}
                id="edit-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={saving}
              />
            </div>
            <div>
               <label htmlFor="edit-role" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Role
              </label>
              <select
                id="edit-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
                disabled={saving || roleNames.length === 0}
              >
                {roleNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-1">Personal Information</p>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="edit-surname" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Surname
                </label>
                <input
                  id="edit-surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-firstName" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    First Name
                  </label>
                  <input
                    id="edit-firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label htmlFor="edit-middleName" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Middle Name
                  </label>
                  <input
                    id="edit-middleName"
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-email" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Email Address
              </label>
              <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              />
            </div>
             <div>
              <label htmlFor="edit-status" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Status
              </label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={saving}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-2">
             <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-1">Security Update</p>
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-new-password" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    New password
                  </label>
                  <input
                    id="edit-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label htmlFor="edit-confirm-password" className="mb-1 block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Confirm New password
                  </label>
                  <input
                    id="edit-confirm-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-bold transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
             </div>

             {/* Password Requirements Checklist - Only show if typing new password */}
             {newPassword.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2 translate-y-[-8px]">
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">Security Requirements</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <RequirementItem label="8-12 Characters" met={newPassword.length >= 8} />
                    <RequirementItem label="Uppercase" met={/[A-Z]/.test(newPassword)} />
                    <RequirementItem label="Lowercase" met={/[a-z]/.test(newPassword)} />
                    <RequirementItem label="Number" met={/[0-9]/.test(newPassword)} />
                    <RequirementItem label="Special (!@#$%^&*)" met={/[!@#$%^&*]/.test(newPassword)} />
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 12 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className={`text-[10px] font-bold ${newPassword.length >= 12 ? 'text-green-600' : 'text-gray-400'}`}>Recommended (12+)</span>
                    </div>
                  </div>
                </div>
             )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsPermissionsModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Shield className="h-4 w-4 text-blue-600" />
              Manage Permissions
              <span className="ml-1 text-[10px] text-gray-400 font-normal">
                ({Object.keys(permissions).length > 0 ? Object.keys(permissions).length : Object.keys(matchedPermissions).length} modules allowed)
              </span>
            </button>
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error === "Actor not found" ? "Your session is invalid. Please log out and log in again." : error}
            </p>
          ) : null}

          <div className="flex gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 font-bold text-gray-800 transition-colors duration-200 hover:bg-gray-200 disabled:opacity-50 text-xs uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || roleNames.length === 0}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 font-bold text-white transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-blue-200"
            >
              {saving ? "Saving…" : "Update Profile"}
            </button>
          </div>
        </form>
      </BaseModal>

      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        onSave={(p) => setPermissions(p)}
        initialPermissions={Object.keys(permissions).length > 0 ? permissions : matchedPermissions}
        primaryLabel="Save Override"
        isReadOnly={false}
      />
    </>
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
