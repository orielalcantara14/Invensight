import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import {
  Archive,
  Users as UsersIcon,
  Package,
  Truck,
  FileText,
  RotateCcw,
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  History,
  Clock,
  Settings,
  X,
  Check,
  Wrench,
  Shield,
} from "lucide-react";
import { api } from "@/services/api";
import { getSession } from "@/auth/session";
import { toast } from "sonner";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { cn } from "@/lib/utils";

type ArchiveTab = "inventory" | "products" | "suppliers" | "orders" | "product-returns" | "services" | "users" | "roles";

interface ConfirmDialog {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  danger?: boolean;
}

function ConfirmModal({ dialog, onClose }: { dialog: ConfirmDialog; onClose: () => void }) {
  if (!dialog.open) return null;
  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-card text-foreground rounded-xl shadow-lg max-w-md w-full border border-border/50 overflow-hidden">
        <div className={`p-4 sm:p-5 border-b border-border/50 ${dialog.danger ? "bg-red-500/5 dark:bg-red-950/10" : ""}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${dialog.danger ? "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold uppercase tracking-tight">{dialog.title}</h3>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase leading-relaxed">{dialog.message}</p>
        </div>
        <div className="flex items-center justify-end gap-2.5 px-4 sm:px-5 pb-4 sm:pb-5">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/50 border border-border/50 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { dialog.onConfirm(); onClose(); }}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-50 rounded-lg transition-colors",
              dialog.danger ? "bg-red-600 hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            )}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function RetentionSettingsModal({
  open,
  currentDays,
  onClose,
  onSave,
}: {
  open: boolean;
  currentDays: number;
  onClose: () => void;
  onSave: (days: number) => Promise<void>;
}) {
  const [selectedDays, setSelectedDays] = useState<number>(currentDays);
  const [customDays, setCustomDays] = useState<string>(String(currentDays > 0 ? currentDays : ""));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedDays(currentDays);
    setCustomDays(String(currentDays > 0 ? currentDays : ""));
  }, [currentDays, open]);

  if (!open) return null;

  const presets = [
    { label: "7 Days", value: 7, desc: "Deletes after 1 week" },
    { label: "14 Days", value: 14, desc: "Deletes after 2 weeks" },
    { label: "30 Days", value: 30, desc: "Deletes after 1 month (Recommended)" },
    { label: "60 Days", value: 60, desc: "Deletes after 2 months" },
    { label: "90 Days", value: 90, desc: "Deletes after 3 months" },
    { label: "Never (Manual Only)", value: 0, desc: "Keep forever until you delete manually" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(selectedDays);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-card text-foreground rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col border border-border/55 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/50 flex items-center justify-between bg-muted/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">Auto-Delete Schedule</h3>
              <p className="text-[10px] text-muted-foreground font-semibold">Choose how long deleted items stay before being completely deleted</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Keep Deleted Items For:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets.map((p) => {
                const isSelected = selectedDays === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setSelectedDays(p.value);
                      if (p.value > 0) setCustomDays(String(p.value));
                    }}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between",
                      isSelected
                        ? "border-zinc-900 bg-zinc-900/5 dark:border-zinc-100 dark:bg-zinc-100/10 shadow-xs"
                        : "border-border/60 hover:border-border hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">{p.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Or Set Custom Days:</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="3650"
                placeholder="e.g. 45"
                value={customDays}
                onChange={(e) => {
                  setCustomDays(e.target.value);
                  const num = parseInt(e.target.value, 10);
                  if (!isNaN(num) && num >= 0) setSelectedDays(num);
                }}
                className="w-32 rounded-lg border border-border/60 px-3 py-2 text-xs font-bold outline-none focus:border-zinc-400 bg-card text-foreground"
              />
              <span className="text-xs text-muted-foreground font-semibold">days before permanent delete</span>
            </div>
            <p className="text-[10px] text-muted-foreground/80">
              * Set to <span className="font-bold text-foreground">0</span> if you want items to stay here forever until you delete them manually.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 border border-border/50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-all shadow-xs disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Delete Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TABS: { key: ArchiveTab; label: string; icon: React.ElementType }[] = [
  { key: "inventory",       label: "Inventory",         icon: History    },
  { key: "products",        label: "Products (Master)", icon: Package    },
  { key: "suppliers",       label: "Suppliers",         icon: Truck      },
  { key: "orders",          label: "Orders",            icon: FileText   },
  { key: "product-returns", label: "Supplier Returns",  icon: Archive    },
  { key: "services",        label: "Services",          icon: Wrench     },
  { key: "users",           label: "Users",             icon: UsersIcon  },
  { key: "roles",           label: "Roles",             icon: Shield     },
];

export function ArchivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const stage = (searchParams.get("stage") || "Archived") as "Archived" | "Deleted";
  const session = getSession();
  const actorId = session?.user_id ?? 0;
  const role = (session?.role || "").trim().toLowerCase();
  const username = (session?.username || "").trim().toLowerCase();
  const isAuthorizedToDelete = username === "rootadminnginamo" || ["administrator", "super admin", "system administrator"].includes(role);

  const isUserManagementAuthorized = username === "rootadminnginamo" || ["administrator", "super admin", "system administrator"].includes(role);
  const visibleTabs = TABS.filter(tab => {
    if (tab.key === "users" || tab.key === "roles") {
      return isUserManagementAuthorized;
    }
    return true;
  });

  const initialTab = (searchParams.get("tab") as ArchiveTab) || "inventory";
  const [activeTab, setActiveTab] = useState<ArchiveTab>(initialTab);

  // Sync tab with search param if it changes
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ArchiveTab;
    if (tabParam && visibleTabs.some(t => t.key === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, visibleTabs]);

  // Handle fallback if activeTab is not in visibleTabs
  useEffect(() => {
    if (!visibleTabs.some(t => t.key === activeTab)) {
      setActiveTab("inventory");
    }
  }, [stage, activeTab, visibleTabs]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialog>({ open: false, title: "", message: "", onConfirm: () => {} });

  const [data, setData] = useState<any[]>([]);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, stage, searchTerm]);

  const loadRetention = useCallback(async () => {
    try {
      const res = await api.getRetentionSetting();
      setRetentionDays(res.retention_days ?? 30);
    } catch (err) {
      console.error("Failed to load retention setting", err);
    }
  }, []);

  useEffect(() => {
    loadRetention();
  }, [loadRetention]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let result: any[] = [];
      switch (activeTab) {
        case "inventory":       result = await api.getArchivedInventory(stage); break;
        case "products":        result = await api.getArchivedProducts(stage);  break;
        case "suppliers":       result = await api.getArchivedSuppliers(stage); break;
        case "orders":          result = await api.getArchivedOrders(stage);    break;
        case "product-returns": result = await api.getArchivedProductReturns(stage); break;
        case "services":        result = await api.getArchivedMechanics(stage); break;
        case "users":           result = await api.getArchivedUsers(actorId, stage); break;
        case "roles":           result = await api.getArchivedRoles(stage); break;
      }
      setData(result);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [activeTab, stage, actorId]);

  useEffect(() => { loadData(); }, [activeTab, loadData]);

  const handleSaveRetention = async (days: number) => {
    try {
      await api.updateRetentionSetting(days);
      setRetentionDays(days);
      setIsRetentionModalOpen(false);
      toast.success(`Auto-delete schedule set to ${days > 0 ? `${days} days` : "never (manual only)"}`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update auto-delete schedule");
    }
  };

  const handlePurgeExpired = async () => {
    try {
      setIsPurging(true);
      const res = await api.autoCleanupDeletedFolder();
      if (res.purged_count > 0) {
        toast.success(`Cleaned up ${res.purged_count} expired records from Deleted Folder.`);
      } else {
        toast.info("No expired records to clean up.");
      }
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to clean up expired items");
    } finally {
      setIsPurging(false);
    }
  };

  const handleAction = async (action: "restore" | "trash" | "delete", id: any, name: string) => {
    const isTrash = action === "trash";
    const isDelete = action === "delete";
    const isRestore = action === "restore";

    setConfirm({
      open: true,
      danger: isDelete || isTrash,
      title: isRestore 
        ? (activeTab === "users" ? (stage === "Archived" ? "Activate User" : "Restore User") : activeTab === "roles" ? (stage === "Archived" ? "Activate Role" : "Restore Role") : activeTab === "services" ? (stage === "Archived" ? "Activate Mechanic" : "Restore Mechanic") : "Restore Record")
        : isTrash ? "Move to Deleted Folder" : "Permanently Delete",
      message: isRestore 
        ? (activeTab === "users" ? `Activate user "${name}"?` : activeTab === "roles" ? `Activate role "${name}"?` : activeTab === "services" ? `Activate mechanic "${name}"?` : `Restore "${name}" to active status?`) 
        : isTrash 
          ? `Move "${name}" to the Deleted Folder? You can still restore it from there.`
          : `Permanently delete "${name}"? This action CANNOT be undone.`,
      onConfirm: async () => {
        try {
          if (activeTab === "inventory") {
            if (isRestore) await api.restoreInventory(id);
            else if (isTrash) await api.moveInventoryToTrash(id);
            else await api.permanentDeleteInventory(id);
          } else if (activeTab === "products") {
            if (isRestore) await api.restoreProduct(id);
            else if (isTrash) await api.moveProductToTrash(id);
            else await api.permanentDeleteProduct(id);
          } else if (activeTab === "suppliers") {
            if (isRestore) await api.restoreSupplier(id);
            else if (isTrash) await api.moveSupplierToTrash(id);
            else await api.permanentDeleteSupplier(id);
          } else if (activeTab === "orders") {
            if (isRestore) await api.restoreOrder(id);
            else if (isTrash) await api.moveOrderToTrash(id);
            else await api.permanentDeleteOrder(id);
          } else if (activeTab === "product-returns") {
            if (isRestore) await api.restoreProductReturn(id);
            else if (isTrash) await api.moveReturnToTrash(id);
            else await api.permanentDeleteProductReturn(id);
          } else if (activeTab === "services") {
            if (isRestore) await api.restoreMechanic(id, actorId);
            else if (isTrash) await api.moveMechanicToTrash(id, actorId);
            else await api.permanentDeleteMechanic(id, actorId);
          } else if (activeTab === "users") {
            if (isRestore) await api.restoreUser(id, actorId);
            else if (isTrash) await api.moveUserToTrash(id, actorId);
            else await api.permanentDeleteUser(id, actorId);
          } else if (activeTab === "roles") {
            if (isRestore) await api.restoreRole(id, actorId);
            else if (isTrash) await api.moveRoleToTrash(id, actorId);
            else await api.permanentDeleteRole(id, actorId);
          }
          toast.success("Action completed successfully");
          loadData();
        } catch (e: any) { toast.error(e?.message || "Action failed"); }
      },
    });
  };

  const filteredData = data.filter(item => {
    const q = searchTerm.toLowerCase();
    return Object.values(item).some(val => String(val ?? "").toLowerCase().includes(q));
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-background text-foreground">
      <ConfirmModal dialog={confirm} onClose={() => setConfirm(p => ({ ...p, open: false }))} />
      <RetentionSettingsModal
        open={isRetentionModalOpen}
        currentDays={retentionDays}
        onClose={() => setIsRetentionModalOpen(false)}
        onSave={handleSaveRetention}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{stage === "Archived" ? "Archive" : "Deleted Folder"}</h1>
            <p className="text-muted-foreground mt-1">
              {stage === "Archived" ? "Manage and restore archived records" : "Review items before permanent deletion"}
            </p>
          </div>

          <div className="flex bg-muted/20 p-1 rounded-xl border border-border/50 shadow-xs">
            <button
              onClick={() => setSearchParams({ stage: "Archived" })}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                stage === "Archived"
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
            <button
              onClick={() => setSearchParams({ stage: "Deleted" })}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                stage === "Deleted"
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" /> Deleted Folder
            </button>
          </div>
        </div>

        {/* Deleted Folder Auto-Delete Timer Banner */}
        {stage === "Deleted" && (
          <div className="mb-6 p-4 rounded-xl bg-card border border-border/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 border border-border/50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Auto-Delete Timer</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950">
                    {retentionDays > 0 ? `Deletes after ${retentionDays} Days` : "Never (Manual Delete Only)"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  {retentionDays > 0 
                    ? `Items in this folder will be permanently deleted after ${retentionDays} days.`
                    : "Items in this folder will stay here until you delete them manually."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isAuthorizedToDelete && (
                <button
                  onClick={() => setIsRetentionModalOpen(true)}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-muted/40 hover:bg-muted text-foreground border border-border/50 transition-colors flex items-center gap-2 shadow-2xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Set Delete Time
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab switchers and actions panel */}
        <div className="bg-card rounded-lg shadow-xs border border-border/55 overflow-hidden">
          {/* Tabs header */}
          <div className="flex border-b border-border/50 overflow-x-auto overflow-y-hidden no-scrollbar bg-muted/5">
            {visibleTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-5 py-4 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap -mb-px",
                  activeTab === tab.key
                    ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50 bg-card"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/5"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Unified search & date bar */}
          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-border/60 bg-muted/20 hover:bg-muted/40 focus:bg-card rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all"
              />
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-border/50 rounded-lg transition-colors shadow-xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading ? "animate-spin text-zinc-600 dark:text-zinc-400" : "")} />
              Refresh Records
            </button>
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mb-3 text-muted-foreground/50" />
                <p className="text-xs uppercase tracking-widest font-bold">Loading records...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-350 dark:text-muted-foreground">
                <Archive className="w-16 h-16 mb-4 opacity-20 text-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-wider">No records found</h3>
                <p className="text-xs text-muted-foreground/80 mt-1">Try a different search or change the active category</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Info</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {stage === "Deleted" ? "Auto-Delete Schedule" : "Date / Status"}
                    </th>
                    <th className="px-6 py-3.5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-card">
                  {paginatedData.map((item) => {
                    const id = item.inventory_id || item.product_id || item.supplier_id || item.order_id || item.return_id || item.mechanic_id || item.user_id || item.role_id || item.id;
                    const name = item.role_name || item.product_name || item.name || item.supplier_name || item.username || item.full_name || id;

                    return (
                      <tr key={id} className="group hover:bg-muted/20 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-foreground group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">{name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground mt-0.5 uppercase">{item.sku || (activeTab === "services" ? `MECH-${id}` : activeTab === "roles" ? `ROLE-${id}` : id)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-medium">
                          <div className="flex flex-col">
                            <span>{activeTab === "roles" ? (item.permissions_text ? "Configured Permissions" : "Standard Role") : (item.category_name || item.email || item.reason || "—")}</span>
                            {item.supplier_name || item.contact_number || item.total_items ? (
                              <span className="text-[10px] text-muted-foreground/60 mt-0.5">{item.supplier_name || item.contact_number || `${item.total_items} items`}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stage === "Deleted" ? (
                            <div className="flex flex-col text-xs">
                              {item.days_remaining !== null && item.days_remaining !== undefined ? (
                                <>
                                  {item.days_remaining === 0 ? (
                                    <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-900">
                                      <AlertTriangle className="w-3 h-3" /> Deletes Today
                                    </span>
                                  ) : item.days_remaining <= 5 ? (
                                    <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-900">
                                      <Clock className="w-3 h-3" /> {item.days_remaining} {item.days_remaining === 1 ? "day" : "days"} left
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-muted/40 text-muted-foreground border border-border/50">
                                      <Clock className="w-3 h-3" /> {item.days_remaining} days left
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground font-mono mt-1">
                                    Deletes on {item.scheduled_delete_date || "—"}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-medium italic">No auto-delete (Keep forever)</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col text-xs text-muted-foreground">
                              <span className="font-mono">{item.last_updated || item.date_added || item.created_at ? new Date(item.last_updated || item.date_added || item.created_at).toLocaleDateString() : "—"}</span>
                              <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                <span className="w-1 h-1 rounded-full bg-zinc-400" />
                                Archived
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAction("restore", id, name)}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer"
                              title={activeTab === "users" ? (stage === "Archived" ? "Activate User" : "Restore User") : activeTab === "services" ? (stage === "Archived" ? "Activate Mechanic" : "Restore Mechanic") : "Restore"}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {stage === "Archived" ? (
                              <button
                                onClick={() => handleAction("trash", id, name)}
                                className="p-1 rounded text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                                title="Move to Deleted Folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              isAuthorizedToDelete && (
                                <button
                                  onClick={() => handleAction("delete", id, name)}
                                  className="p-1 rounded text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                                  title="Permanently Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {!loading && (
            <OrdersStyleTablePagination
              itemCount={filteredData.length}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
