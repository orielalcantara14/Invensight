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
  { module: 'Dashboard',         actions: ['View', 'Export'] },
  { module: 'POS Terminal',      actions: ['View', 'Add'] },
  { module: 'Sales',             actions: ALL_ACTIONS },
  { module: 'Inventory',         actions: ALL_ACTIONS },
  { module: 'Products',          actions: ALL_ACTIONS },
  { module: 'Suppliers',         actions: ALL_ACTIONS },
  { module: 'Orders',            actions: ALL_ACTIONS },
  { module: 'Supplier Returns',  actions: ALL_ACTIONS },
  { module: 'Customer Returns',  actions: ALL_ACTIONS },
  { module: 'Reports',           actions: ALL_ACTIONS },
  { module: 'User Management',   actions: ALL_ACTIONS },
  { module: 'Role Permissions',  actions: ['View', 'Add', 'Edit', 'Delete'] },
  { module: 'Mechanic Services', actions: ALL_ACTIONS },
  { module: 'Forecasting',       actions: ['View', 'Export'] },
  { module: 'Stock Prediction',  actions: ['View', 'Add', 'Export'] },
  { module: 'Audit Log',         actions: ['View', 'Edit', 'Delete', 'Export'] },
  { module: 'Archive',           actions: ['View', 'Edit', 'Delete'] },
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

  const handleSelectAll = () => {
    if (isReadOnly) return;
    const allPerms: Record<string, string[]> = {};
    defaultModules.forEach(({ module, actions }) => {
      allPerms[module] = [...actions];
    });
    setSelectedPermissions(allPerms);
  };

  const handleUnselectAll = () => {
    if (isReadOnly) return;
    setSelectedPermissions({});
  };

  const configuredCount = Object.keys(selectedPermissions).length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Role Permission"
      maxWidth="5xl"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Header Policy Banner */}
        <div className="relative overflow-hidden flex items-start gap-3.5 mb-6 p-4 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent border border-primary/15 rounded-2xl">
          <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground mb-0.5">Role Permission Policy</h4>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              Grant or revoke specific actions across system modules. Changes will apply to all users with this role.
            </p>
          </div>
        </div>

        {/* Modules Configured & Action Pills */}
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
              {configuredCount} of {defaultModules.length} Modules configured
            </span>
            <div className="w-48 h-1.5 bg-muted/40 rounded-full overflow-hidden border border-border/30">
              <div 
                className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500 ease-out" 
                style={{ width: `${(configuredCount / defaultModules.length) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={isReadOnly}
              className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary border border-primary/20 bg-primary/5 rounded-xl hover:bg-primary hover:text-white transition-all duration-300 disabled:opacity-50"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleUnselectAll}
              disabled={isReadOnly}
              className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-500 border border-red-500/20 bg-red-500/5 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 disabled:opacity-50"
            >
              Unselect All
            </button>
          </div>
        </div>

        {/* Permissions Grid Table */}
        <div className="flex-1 overflow-auto border border-border dark:border-gray-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-card/10 backdrop-blur-xl">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-muted/40 bg-card/85 backdrop-blur-xl border-b border-border shadow-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b border-border">Module Access</th>
                {ALL_ACTIONS.map(action => (
                  <th key={action} className="px-4 py-4 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/70 border-b border-border">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {defaultModules.map(({ module, actions }) => {
                const isAllSelected = actions.every(a => isActionChecked(module, a));
                
                return (
                  <tr key={module} className="group hover:bg-primary/[0.03] dark:hover:bg-primary/[0.04] transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleRowToggle(module, actions)}
                          disabled={isReadOnly}
                          className={`flex items-center justify-center w-5.5 h-5.5 rounded-lg border-2 transition-all duration-300 hover:scale-105 ${
                            isAllSelected 
                              ? 'bg-primary border-primary shadow-[0_0_12px_rgba(99,102,241,0.3)] text-white' 
                              : 'border-muted-foreground/30 hover:border-primary/50 text-transparent'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 transition-transform duration-300 ${isAllSelected ? 'scale-100' : 'scale-0'}`} />
                        </button>
                        <span className="font-bold text-foreground text-sm tracking-wide">{module}</span>
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
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border-2 transition-all duration-300 relative ${
                                isChecked 
                                  ? 'bg-primary/10 border-primary text-primary dark:text-primary-foreground shadow-[0_0_15px_-3px_rgba(99,102,241,0.25)]' 
                                  : 'border-border bg-card/25 text-muted-foreground/30 hover:border-muted-foreground/50 hover:text-muted-foreground'
                              } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                            >
                              <Check className={`w-4 h-4 transition-all duration-300 absolute ${isChecked ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 rotate-12'}`} />
                              {!isChecked && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 transition-all duration-300" />}
                            </button>
                          ) : (
                            <div className="flex justify-center items-center">
                              <div className="w-8 h-8 flex items-center justify-center" title="Action not available for this module">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground/25 dark:text-muted-foreground/45" />
                              </div>
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
          <div className="mt-4 p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 rounded-xl">
             <p className="text-sm font-bold text-red-500">{error}</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between p-1.5 bg-muted bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl">
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
            className="flex items-center gap-2 px-10 py-3 bg-primary hover:bg-primary/95 text-white text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : primaryLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
