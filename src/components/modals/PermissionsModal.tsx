import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Check, ShieldCheck, Lock } from 'lucide-react';

interface ModuleConfig {
  module: string;
  actions: string[];
}

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissions: Record<string, string[]>) => void;
  initialPermissions?: Record<string, string[]>;
  primaryLabel?: string;
  saving?: boolean;
  isReadOnly?: boolean;
  error?: string | null;
}

const ALL_ACTIONS = ['View', 'Add', 'Edit', 'Delete', 'Export'];

const defaultModules: ModuleConfig[] = [
  { module: 'Dashboard',       actions: ['View', 'Export'] },
  { module: 'Sales',           actions: ALL_ACTIONS },
  { module: 'Inventory',       actions: ALL_ACTIONS },
  { module: 'Products',        actions: ALL_ACTIONS },
  { module: 'Suppliers',       actions: ALL_ACTIONS },
  { module: 'Orders',          actions: ALL_ACTIONS },
  { module: 'Reports',         actions: ['View', 'Export'] },
  { module: 'User Management', actions: ALL_ACTIONS },
  { module: 'Role Permissions',actions: ALL_ACTIONS },
  { module: 'Forecasting',     actions: ['View', 'Export'] },
  { module: 'Stock Prediction',actions: ['View', 'Export'] },
  { module: 'Audit Log',       actions: ['View', 'Export'] },
  { module: 'Archive',         actions: ['View', 'Delete'] },
  { module: 'Supplier Return', actions: ALL_ACTIONS },
  { module: 'Customer Return', actions: ALL_ACTIONS }
];

export function PermissionsModal({ 
  isOpen, 
  onClose, 
  onSave,
  initialPermissions = {},
  primaryLabel = 'Save Permissions',
  saving = false,
  isReadOnly = false,
  error = null,
}: PermissionsModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (isOpen) {
      setSelectedPermissions(initialPermissions || {});
    }
  }, [isOpen, initialPermissions]);

  const handleActionToggle = (module: string, action: string) => {
    if (isReadOnly) return;
    setSelectedPermissions(prev => {
      const currentActions = prev[module] || [];
      const newActions = currentActions.includes(action)
        ? currentActions.filter(a => a !== action)
        : [...currentActions, action];
      
      if (newActions.length === 0) {
        const { [module]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [module]: newActions };
    });
  };

  const handleRowToggle = (module: string, actions: string[]) => {
    if (isReadOnly) return;
    setSelectedPermissions(prev => {
      const current = prev[module] || [];
      const isAll = actions.every(a => current.includes(a));
      
      if (isAll) {
        const { [module]: _, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [module]: [...actions] };
      }
    });
  };

  const isActionChecked = (module: string, action: string) => {
    return selectedPermissions[module]?.includes(action) || false;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Role Permission"
      maxWidth="5xl"
    >
      <div className="flex flex-col h-[70vh]">
        <div className="flex items-center gap-2 mb-6 p-4 bg-primary/10 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <ShieldCheck className="w-5 h-5 text-primary dark:text-blue-400" />
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
            Grant or revoke specific actions across system modules. Changes will apply to all users with this role.
          </p>
        </div>

        <div className="flex-1 overflow-auto border border-border dark:border-gray-800 rounded-2xl shadow-inner bg-card bg-background">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-muted/50 bg-card shadow-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border border-border">Module Access</th>
                {ALL_ACTIONS.map(action => (
                  <th key={action} className="px-4 py-4 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/70 border-b border-border border-border">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {defaultModules.map(({ module, actions }) => {
                const isAllSelected = actions.every(a => isActionChecked(module, a));
                
                return (
                  <tr key={module} className="group hover:bg-primary/10/30 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleRowToggle(module, actions)}
                          disabled={isReadOnly}
                          className={`flex items-center justify-center w-5 h-5 rounded-lg border-2 transition-all ${
                            isAllSelected 
                              ? 'bg-primary border-primary' 
                              : 'border-gray-400 dark:border-gray-600 group-hover:border-blue-400'
                          }`}
                        >
                          {isAllSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <span className="font-bold text-foreground dark:text-gray-100">{module}</span>
                      </div>
                    </td>
                    {ALL_ACTIONS.map(action => {
                      const isApplicable = actions.includes(action);
                      const isChecked = isActionChecked(module, action);

                      return (
                        <td key={action} className="px-4 py-4 text-center">
                          {isApplicable ? (
                            <button
                              type="button"
                              onClick={() => handleActionToggle(module, action)}
                              disabled={isReadOnly}
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all ${
                                isChecked 
                                  ? 'bg-blue-100 dark:bg-blue-900/40 border-primary text-primary dark:text-blue-400' 
                                  : 'border-border border-border text-muted-foreground/70 hover:border-gray-400'
                              } ${isReadOnly ? 'opacity-50' : ''}`}
                            >
                              {isChecked ? <Check className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                            </button>
                          ) : (
                            <div className="flex justify-center">
                              <div className="w-5 h-1 bg-muted/50 bg-card rounded-full" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-xl">
             <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between p-1 bg-muted bg-card rounded-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3 text-sm font-bold text-muted-foreground hover:text-foreground dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(selectedPermissions)}
            disabled={saving || isReadOnly}
            className="flex items-center gap-2 px-10 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/30 disabled:opacity-50"
          >
            {saving ? 'Saving...' : primaryLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
