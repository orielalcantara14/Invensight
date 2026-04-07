import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { Check } from 'lucide-react';

interface Permission {
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
}

const defaultModules: Permission[] = [
  { module: 'Sales', actions: ['View', 'Add', 'Edit', 'Delete'] },
  { module: 'Inventory', actions: ['View', 'Add Item', 'Edit', 'Delete'] },
  { module: 'Products', actions: ['View', 'Add Product', 'Edit', 'Delete'] },
  { module: 'Suppliers', actions: ['View', 'Add Supplier', 'Edit', 'Delete'] },
  { module: 'Reports', actions: ['View', 'Generate Report'] },
  { module: 'User Management', actions: ['View', 'Add User', 'Edit User', 'Delete User'] },
  { module: 'Role Permissions', actions: ['View', 'Create', 'Edit', 'Delete'] },
  { module: 'Forecasting', actions: ['View', 'Generate Forecast'] },
  { module: 'Stock Prediction', actions: ['View', 'Run Prediction'] },
  { module: 'Audit Log', actions: ['View', 'Export'] },
  { module: 'Purchase Order', actions: ['View', 'Create Order', 'Edit', 'Delete'] },
  { module: 'Supplier Return', actions: ['View', 'Process Return', 'Edit'] }
];

export function PermissionsModal({ 
  isOpen, 
  onClose, 
  onSave,
  initialPermissions = {},
  primaryLabel = 'Next',
  saving = false,
  isReadOnly = false,
}: PermissionsModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (isOpen) {
      setSelectedPermissions(initialPermissions);
    }
  }, [isOpen, initialPermissions]);

  const handleModuleToggle = (module: string) => {
    if (isReadOnly) return;
    setSelectedPermissions(prev => {
      const moduleData = defaultModules.find(m => m.module === module);
      if (!moduleData) return prev;

      const hasAllActions = moduleData.actions.every(action => 
        prev[module]?.includes(action)
      );

      if (hasAllActions) {
        // Uncheck all
        const { [module]: _, ...rest } = prev;
        return rest;
      } else {
        // Check all
        return { ...prev, [module]: moduleData.actions };
      }
    });
  };

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

  const handleSave = () => {
    onSave(selectedPermissions);
    onClose();
  };

  const isModuleChecked = (module: string, actions: string[]) => {
    const selectedActions = selectedPermissions[module] || [];
    return actions.every(action => selectedActions.includes(action));
  };

  const isActionChecked = (module: string, action: string) => {
    return selectedPermissions[module]?.includes(action) || false;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Allowed Modules"
      maxWidth="xl"
      backdrop="dim"
    >
      <div className="space-y-4">
        <div className="max-h-[58vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {defaultModules.map(({ module, actions }) => (
            <div key={module} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {/* Module Header */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => handleModuleToggle(module)}
                  disabled={isReadOnly}
                  className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors duration-200 ${
                    isModuleChecked(module, actions)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white hover:border-blue-400'
                  } ${isReadOnly ? 'opacity-70 cursor-default' : ''}`}
                >
                  {isModuleChecked(module, actions) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
                <span className="font-semibold text-gray-900">{module}</span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                {actions.map(action => (
                  <label
                    key={`${module}-${action}`}
                    className={`flex items-center gap-2 group ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className={`flex items-center justify-center w-4 h-4 rounded border transition-colors duration-200 ${
                      isActionChecked(module, action)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 bg-white group-hover:border-blue-400'
                    } ${isReadOnly ? 'opacity-70' : ''}`}>
                      {isActionChecked(module, action) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isActionChecked(module, action)}
                      onChange={() => handleActionToggle(module, action)}
                      disabled={isReadOnly}
                      className="sr-only"
                    />
                    <span className={`text-sm ${
                      isActionChecked(module, action) 
                        ? 'text-gray-900' 
                        : 'text-gray-600 group-hover:text-gray-800'
                    }`}>
                      {action}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
          {!isReadOnly && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            {saving ? 'Saving…' : primaryLabel}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
