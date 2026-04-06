import React, { useState, useEffect, useRef, type FormEvent } from "react";
import { BaseModal } from "./BaseModal";
import type { User, Role } from "@/types";
import type { UpdateUserPayload } from "@/services/api";
import { PermissionsModal } from "./PermissionsModal";
import { Shield } from "lucide-react";

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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [newPassword, setNewPassword] = useState("");
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || "");
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setRole(user.role || "");
      setStatus(user.status);
      setNewPassword("");
      setPermissions(user.permissions || {});
      setTimeout(() => initialFocusRef.current?.focus(), 100);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload: UpdateUserPayload = {
      username: username.trim(),
      full_name: fullName.trim(),
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
              <label htmlFor="edit-username" className="mb-1 block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                ref={initialFocusRef}
                id="edit-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label htmlFor="edit-fullName" className="mb-1 block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="edit-fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-email" className="mb-1 block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-role" className="mb-1 block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="edit-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div>
              <label htmlFor="edit-status" className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-new-password" className="mb-1 block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              id="edit-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsPermissionsModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              <Shield className="h-4 w-4 text-blue-600" />
              Manage Permissions
              <span className="ml-1 text-xs text-gray-400 font-normal">
                ({Object.keys(permissions).length > 0 ? Object.keys(permissions).length : Object.keys(matchedPermissions).length} modules allowed)
              </span>
            </button>
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error === "Actor not found" ? "Your session is invalid. Please log out and log in again." : error}
            </p>
          ) : null}

          <div className="flex gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-900 py-2 font-medium text-white transition-colors duration-200 hover:bg-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || roleNames.length === 0}
              className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
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
