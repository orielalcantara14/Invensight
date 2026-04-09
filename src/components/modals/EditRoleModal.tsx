import React, { useState, useRef, useEffect, type FormEvent } from "react";
import { BaseModal } from "./BaseModal";
import { PermissionsModal } from "./PermissionsModal";
import { Shield, Layout, Settings, RotateCcw } from 'lucide-react';
import type { Role } from "@/types";

interface EditRoleModalProps {
  isOpen: boolean;
  role: Role | null;
  onClose: () => void;
  onSave: (
    roleId: number,
    data: { name: string; permissions: Record<string, string[]> }
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
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && role) {
      setName(role.name);
      setPermissions(typeof role.permissions === 'object' ? role.permissions : {});
      setTimeout(() => initialFocusRef.current?.focus(), 100);
    }
  }, [isOpen, role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!role) return;
    await onSave(role.id, { name: name.trim(), permissions });
  };

  const selectedModuleCount = Object.keys(permissions).length;
  const totalActionCount = Object.values(permissions).reduce((acc, curr) => acc + curr.length, 0);

  if (!role) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Modify System Role" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-1" />
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
            Updating this role will immediately affect the permissions of all users currently assigned to it. Handle with caution.
          </p>
        </div>

        <div>
           <label htmlFor="edit-role-name" className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">
            Global Role Name
          </label>
          <input
            ref={initialFocusRef}
            id="edit-role-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 dark:text-white transition-all shadow-inner"
            placeholder="Role name"
            required
            maxLength={50}
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">
            Access Configuration
          </label>
          <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900 dark:text-white">Permission Matrix</span>
              <div className="flex gap-3 mt-1">
                 <div className="flex items-center gap-1.5">
                   <Layout className="w-3.5 h-3.5 text-gray-400" />
                   <span className="text-[10px] font-bold text-gray-500 uppercase">{selectedModuleCount} Modules</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <Settings className="w-3.5 h-3.5 text-gray-400" />
                   <span className="text-[10px] font-bold text-gray-500 uppercase">{totalActionCount} Actions</span>
                 </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPermissionsModal(true)}
              className="px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              Configure
            </button>
          </div>
        </div>

        {showPermissionsModal && (
          <PermissionsModal
            isOpen={showPermissionsModal}
            onClose={() => setShowPermissionsModal(false)}
            initialPermissions={permissions}
            onSave={(perms: Record<string, string[]>) => {
              setPermissions(perms);
              setShowPermissionsModal(false);
            }}
            primaryLabel="Apply Changes"
          />
        )}

        {error ? (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
            {error}
          </div>
        ) : null}

        <div className="flex gap-3 pt-4 border-t border-gray-50 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-bold text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <RotateCcw className="w-4 h-4 animate-spin"/> : null}
            {saving ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
