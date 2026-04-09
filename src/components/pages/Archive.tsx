import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import { api, InventoryItem } from "@/services/api";
import { getSession } from "@/auth/session";
import { toast } from "sonner";

type ArchiveTab = "inventory" | "products" | "suppliers" | "orders" | "product-returns" | "users";

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className={`p-6 border-b ${dialog.danger ? "border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/30" : "border-gray-100 dark:border-gray-800"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dialog.danger ? "bg-red-100 dark:bg-red-900/40" : "bg-blue-100 dark:bg-blue-900/40"}`}>
              <AlertTriangle className={`w-5 h-5 ${dialog.danger ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dialog.title}</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400">{dialog.message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={() => { dialog.onConfirm(); onClose(); }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${dialog.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS: { key: ArchiveTab; label: string; icon: React.ElementType }[] = [
  { key: "inventory",       label: "Inventory",       icon: History    },
  { key: "products",        label: "Products (Master)", icon: Package    },
  { key: "suppliers",       label: "Suppliers",       icon: Truck      },
  { key: "orders",          label: "Orders",          icon: FileText   },
  { key: "product-returns", label: "Supplier Returns", icon: Archive    },
  { key: "users",           label: "Users",           icon: UsersIcon  },
];

export function ArchivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const stage = (searchParams.get("stage") || "Archived") as "Archived" | "Deleted";
  const session = getSession();
  const actorId = session?.user_id ?? 0;
  const isAuthorizedToDelete = ["rootadminnginamo", "Administrator"].includes((session?.role || session?.username || "").trim());

  const initialTab = (searchParams.get("tab") as ArchiveTab) || "inventory";
  const [activeTab, setActiveTab] = useState<ArchiveTab>(initialTab);

  // Sync tab with search param if it changes
  useEffect(() => {
    const tabParam = searchParams.get("tab") as ArchiveTab;
    if (tabParam && TABS.some(t => t.key === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialog>({ open: false, title: "", message: "", onConfirm: () => {} });

  const [data, setData] = useState<any[]>([]);

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
        case "users":           result = await api.getArchivedUsers(actorId); break;
      }
      setData(result);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [activeTab, stage, actorId]);

  useEffect(() => { loadData(); }, [activeTab, loadData]);

  const handleAction = async (action: "restore" | "trash" | "delete", id: any, name: string) => {
    const isTrash = action === "trash";
    const isDelete = action === "delete";
    const isRestore = action === "restore";

    setConfirm({
      open: true,
      danger: isDelete || isTrash,
      title: isRestore ? "Restore Record" : isTrash ? "Move to Deleted Folder" : "Permanently Delete",
      message: isRestore 
        ? `Restore "${name}" to active status?` 
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
          } else if (activeTab === "users") {
            if (isRestore) await api.restoreUser(id, actorId);
            else await api.permanentDeleteUser(id, actorId);
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

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      <ConfirmModal dialog={confirm} onClose={() => setConfirm(p => ({ ...p, open: false }))} />

      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${stage === "Archived" ? "bg-amber-500 shadow-amber-500/20" : "bg-red-500 shadow-red-500/20 text-white"}`}>
              {stage === "Archived" ? <Archive className="w-6 h-6 text-white" /> : <Trash2 className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{stage === "Archived" ? "Archive" : "Deleted Folder"}</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {stage === "Archived" ? "Manage and restore soft-archived records" : "Review items for permanent deletion"}
              </p>
            </div>
          </div>

          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setSearchParams({ stage: "Archived" })}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${stage === "Archived" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"}`}
            >
              <Archive className="w-4 h-4" /> Archive
            </button>
            <button
              onClick={() => setSearchParams({ stage: "Deleted" })}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${stage === "Deleted" ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"}`}
            >
              <Trash2 className="w-4 h-4" /> Deleted Folder
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex flex-col lg:flex-row border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-1 overflow-x-auto no-scrollbar bg-gray-50/50 dark:bg-gray-800/10">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  disabled={tab.key === "users" && stage === "Archived"} // In this app users move directly? Actually let's keep it consistent if possible.
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2.5 px-6 py-5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? stage === "Archived" ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-gray-900" : "border-red-500 text-red-600 dark:text-red-400 bg-white dark:bg-gray-900"
                      : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  } ${tab.key === "users" && stage === "Archived" ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900">
            <div className="relative group flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-amber-500/20 transition-all dark:placeholder-gray-500"
              />
            </div>
            <button
              onClick={loadData}
              className="px-5 py-3 flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
              Refresh Records
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                <RefreshCw className="w-12 h-12 animate-spin mb-4 text-amber-500 opacity-50" />
                <p className="animate-pulse font-medium">Crunching data...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-300 dark:text-gray-700">
                <Archive className="w-24 h-24 mb-6 opacity-10" />
                <h3 className="text-xl font-bold">No records found</h3>
                <p className="text-sm text-gray-500 mt-2">Try a different search or change the stage</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 dark:bg-gray-800/30 border-y border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Details</th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Info</th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-gray-400">Date/Status</th>
                    <th className="px-8 py-4 text-right text-xs font-black uppercase tracking-widest text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {filteredData.map((item, idx) => {
                    const id = item.inventory_id || item.product_id || item.supplier_id || item.order_id || item.return_id || item.id;
                    const name = item.product_name || item.supplier_name || item.username || item.full_name || id;
                    
                    return (
                      <tr key={id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{name}</span>
                            <span className="text-xs font-mono text-gray-400 mt-1 uppercase">{item.sku || id}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-gray-600 dark:text-gray-300">{item.category_name || item.email || item.reason || "—"}</span>
                            <span className="text-xs text-gray-400">{item.supplier_name || item.contact_number || (item.total_items ? `${item.total_items} items` : "")}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{item.last_updated || item.date_added || item.created_at ? new Date(item.last_updated || item.date_added || item.created_at).toLocaleDateString() : "—"}</span>
                            <span className="inline-flex mt-1 text-[10px] font-black uppercase tracking-tighter text-amber-500">{stage}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                            <button
                              onClick={() => handleAction("restore", id, name)}
                              className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                            >
                              <RotateCcw className="w-3 h-3" /> Restore
                            </button>
                            
                            {stage === "Archived" ? (
                              <button
                                onClick={() => handleAction("trash", id, name)}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                              >
                                <Trash2 className="w-3 h-3" /> Trash
                              </button>
                            ) : (
                              isAuthorizedToDelete && (
                                <button
                                  onClick={() => handleAction("delete", id, name)}
                                  className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
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
        </div>
      </div>
    </div>
  );
}
