import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import { BaseModal } from './BaseModal';
import { PermissionsModal } from './PermissionsModal';
import { Shield, Layout, Settings } from 'lucide-react';

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

  const selectedModuleCount = Object.keys(formData.permissions).length;
  const totalActionCount = Object.values(formData.permissions).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Define New System Role" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-primary/10/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-3">
          <Shield className="w-5 h-5 text-primary dark:text-blue-400 mt-1" />
          <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
            Roles define a collection of permissions. You can assign these roles to users to control their system access precisely.
          </p>
        </div>

        <div>
          <label htmlFor="roleName" className="block text-xs font-black uppercase tracking-widest text-muted-foreground/70 mb-2 ml-1">
            Global Role Name
          </label>
          <input
            ref={initialFocusRef}
            id="roleName"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-4 py-3 bg-muted/50 bg-background/50 border border-border dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-bold text-foreground text-foreground transition-all shadow-inner"
            placeholder="e.g. Regional Manager"
            required
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground/70 mb-2 ml-1">
            Access Configuration
          </label>
          <div className="bg-muted/50 bg-background/30 border border-border dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
            <div className="flex flex-col">
              <span className="text-sm font-black text-foreground text-foreground">Permissions</span>
              <div className="flex gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{selectedModuleCount} Modules</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{totalActionCount} Actions</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPermissionsModal(true)}
              className="px-5 py-2.5 bg-card bg-card text-foreground text-foreground text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all border border-border border-border shadow-sm"
            >
              Configure
            </button>
          </div>
        </div>

        {showPermissionsModal && (
          <PermissionsModal
            isOpen={showPermissionsModal}
            onClose={() => setShowPermissionsModal(false)}
            initialPermissions={formData.permissions}
            onSave={(perms: Record<string, string[]>) => {
              handleChange('permissions', perms);
              setShowPermissionsModal(false);
            }}
            primaryLabel="Save & Close"
          />
        )}

        {error ? (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100 animate-shake">
            {error}
          </div>
        ) : null}

        <div className="flex gap-3 pt-4 border-t border-gray-50 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-muted bg-card text-muted-foreground dark:text-muted-foreground/70 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-bold text-sm"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={saving || !formData.name.trim()}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/30 disabled:opacity-50"
          >
            {saving ? "Deploying..." : "Create Role"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
