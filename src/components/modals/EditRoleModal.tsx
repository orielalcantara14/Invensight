import React, { useState, useRef, useEffect, type FormEvent } from "react";
import { BaseModal } from "./BaseModal";
import type { Role } from "@/types";

interface EditRoleModalProps {
  isOpen: boolean;
  role: Role | null;
  onClose: () => void;
  onSave: (
    roleId: number,
    data: { name: string; permissions: string }
  ) => void | Promise<void>;
  error?: string | null;
  saving?: boolean;
}

export function EditRoleModal({
  isOpen,
  role,
  onClose,
  onSave,
  error = null,
  saving = false,
}: EditRoleModalProps) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState("");
  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && role) {
      setName(role.name);
      setPermissions(role.permissions || "");
      setTimeout(() => initialFocusRef.current?.focus(), 100);
    }
  }, [isOpen, role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) return;
    await onSave(role.id, { name: name.trim(), permissions: permissions.trim() });
  };

  if (!role) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Edit Role" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-role-name" className="mb-1 block text-sm font-medium text-gray-700">
            Role Name
          </label>
          <input
            ref={initialFocusRef}
            id="edit-role-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Role name"
            required
            maxLength={50}
            disabled={saving}
          />
        </div>

        <div>
          <label htmlFor="edit-role-permissions" className="mb-1 block text-sm font-medium text-gray-700">
            Permissions
          </label>
          <textarea
            id="edit-role-permissions"
            value={permissions}
            onChange={(e) => setPermissions(e.target.value)}
            className="min-h-[100px] w-full resize-none rounded-lg border border-gray-300 px-3 py-2 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe permissions for this role"
            disabled={saving}
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg bg-gray-900 py-2 font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
