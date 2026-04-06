import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { api } from "@/services/api";
import { getSession } from "@/auth/session";
import { toast } from "sonner";

type ArchiveTab = "users" | "products" | "suppliers" | "orders" | "product-returns";

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
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { dialog.onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${dialog.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS: { key: ArchiveTab; label: string; icon: React.ElementType }[] = [
  { key: "users",           label: "Users",           icon: UsersIcon  },
  { key: "products",        label: "Products",        icon: Package    },
  { key: "suppliers",       label: "Suppliers",       icon: Truck      },
  { key: "orders",          label: "Order List",      icon: FileText   },
  { key: "product-returns", label: "Product Returns", icon: Archive    },
];

export function ArchivePage() {
  const session = getSession();
  const actorId = session?.user_id ?? 0;
  const isRootAdmin = (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo";

  const [activeTab, setActiveTab] = useState<ArchiveTab>("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialog>({ open: false, title: "", message: "", onConfirm: () => {} });

  // Data stores
  const [archivedUsers, setArchivedUsers] = useState<any[]>([]);
  const [archivedProducts, setArchivedProducts] = useState<any[]>([]);
  const [archivedSuppliers, setArchivedSuppliers] = useState<any[]>([]);
  const [archivedOrders, setArchivedOrders] = useState<any[]>([]);
  const [archivedReturns, setArchivedReturns] = useState<any[]>([]);

  const loadTab = useCallback(async (tab: ArchiveTab) => {
    setLoading(true);
    try {
      switch (tab) {
        case "users":
          setArchivedUsers(await api.getArchivedUsers(actorId));
          break;
        case "products":
          setArchivedProducts(await api.getArchivedProducts());
          break;
        case "suppliers":
          setArchivedSuppliers(await api.getArchivedSuppliers());
          break;
        case "orders":
          setArchivedOrders(await api.getArchivedOrders());
          break;
        case "product-returns":
          setArchivedReturns(await api.getArchivedProductReturns());
          break;
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load archive");
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => { loadTab(activeTab); }, [activeTab, loadTab]);

  const switchTab = (tab: ArchiveTab) => {
    setActiveTab(tab);
    setSearchTerm("");
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleRestoreUser = (userId: number, name: string) => {
    setConfirm({
      open: true,
      title: "Restore User",
      message: `Restore "${name}" to active status?`,
      onConfirm: async () => {
        try {
          await api.restoreUser(userId, actorId);
          toast.success("User restored successfully");
          loadTab("users");
        } catch (e: any) { toast.error(e?.message || "Failed to restore user"); }
      },
    });
  };

  const handlePermanentDeleteUser = (userId: number, name: string) => {
    setConfirm({
      open: true,
      danger: true,
      title: "Permanently Delete User",
      message: `Permanently delete "${name}"? This action CANNOT be undone and all their data will be removed.`,
      onConfirm: async () => {
        try {
          await api.permanentDeleteUser(userId, actorId);
          toast.success("User permanently deleted");
          loadTab("users");
        } catch (e: any) { toast.error(e?.message || "Failed to permanently delete user"); }
      },
    });
  };

  const handleRestoreProduct = (productId: number, name: string) => {
    setConfirm({
      open: true,
      title: "Restore Product",
      message: `Restore "${name}" back to Active status?`,
      onConfirm: async () => {
        try {
          await api.restoreProduct(productId);
          toast.success("Product restored");
          loadTab("products");
        } catch (e: any) { toast.error(e?.message || "Failed to restore product"); }
      },
    });
  };

  const handlePermanentDeleteProduct = (productId: number, name: string) => {
    setConfirm({
      open: true,
      danger: true,
      title: "Permanently Delete Product",
      message: `Permanently delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.permanentDeleteProduct(productId);
          toast.success("Product permanently deleted");
          loadTab("products");
        } catch (e: any) { toast.error(e?.message || "Failed to delete product"); }
      },
    });
  };

  const handleRestoreSupplier = (supplierId: number, name: string) => {
    setConfirm({
      open: true,
      title: "Restore Supplier",
      message: `Restore "${name}" back to Active status?`,
      onConfirm: async () => {
        try {
          await api.restoreSupplier(supplierId);
          toast.success("Supplier restored");
          loadTab("suppliers");
        } catch (e: any) { toast.error(e?.message || "Failed to restore supplier"); }
      },
    });
  };

  const handleRestoreOrder = (orderId: string, displayId: string) => {
    setConfirm({
      open: true,
      title: "Restore Order",
      message: `Restore order "${displayId}" back to Received status?`,
      onConfirm: async () => {
        try {
          await api.restoreOrder(orderId);
          toast.success("Order restored");
          loadTab("orders");
        } catch (e: any) { toast.error(e?.message || "Failed to restore order"); }
      },
    });
  };

  const handleRestoreReturn = (returnId: number) => {
    setConfirm({
      open: true,
      title: "Restore Return",
      message: `Restore return #${returnId} back to Resolved status?`,
      onConfirm: async () => {
        try {
          await api.restoreProductReturn(returnId);
          toast.success("Return restored");
          loadTab("product-returns");
        } catch (e: any) { toast.error(e?.message || "Failed to restore return"); }
      },
    });
  };

  // ── Filter helpers ────────────────────────────────────────────────────────

  const q = searchTerm.toLowerCase();
  const filteredUsers    = archivedUsers.filter(u => [u.username, u.full_name, u.role, u.employee_id].some(f => String(f ?? "").toLowerCase().includes(q)));
  const filteredProducts = archivedProducts.filter(p => [p.product_name, p.sku, p.category_name, p.supplier_name].some(f => String(f ?? "").toLowerCase().includes(q)));
  const filteredSuppliers = archivedSuppliers.filter(s => [s.supplier_name, s.email, s.address].some(f => String(f ?? "").toLowerCase().includes(q)));
  const filteredOrders   = archivedOrders.filter(o => [o.order_id, o.supplier_name].some(f => String(f ?? "").toLowerCase().includes(q)));
  const filteredReturns  = archivedReturns.filter(r => [r.return_id, r.supplier_name, r.reason].some(f => String(f ?? "").toLowerCase().includes(q)));

  const activeData = { users: filteredUsers, products: filteredProducts, suppliers: filteredSuppliers, orders: filteredOrders, "product-returns": filteredReturns }[activeTab];

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <ConfirmModal dialog={confirm} onClose={() => setConfirm(p => ({ ...p, open: false }))} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Archive className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archive Module</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">View and manage all archived records</p>
          </div>
        </div>

      </div>

      {/* Main Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-gray-900"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search archived records..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <button
            onClick={() => loadTab(activeTab)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading archive…
            </div>
          ) : activeData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
              <Archive className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No archived {TABS.find(t => t.key === activeTab)?.label.toLowerCase()}</p>
              <p className="text-sm mt-1">Items you archive will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {activeTab === "users" && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </>
                  )}
                  {activeTab === "products" && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </>
                  )}
                  {activeTab === "suppliers" && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Supplied</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </>
                  )}
                  {activeTab === "orders" && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </>
                  )}
                  {activeTab === "product-returns" && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Return ID</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {activeTab === "users" && filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{u.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{u.username || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{u.full_name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        {u.role || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestoreUser(u.id, u.full_name || u.username)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        {isRootAdmin && (
                          <button
                            onClick={() => handlePermanentDeleteUser(u.id, u.full_name || u.username)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Forever
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {activeTab === "products" && filteredProducts.map(p => (
                  <tr key={p.product_id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{p.product_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">{p.sku || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{p.category_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{p.supplier_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestoreProduct(p.product_id, p.product_name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        {isRootAdmin && (
                          <button
                            onClick={() => handlePermanentDeleteProduct(p.product_id, p.product_name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Forever
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {activeTab === "suppliers" && filteredSuppliers.map(s => (
                  <tr key={s.supplier_id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{s.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{s.email || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{s.contact_number || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{s.product_supplied || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestoreSupplier(s.supplier_id, s.supplier_name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {activeTab === "orders" && filteredOrders.map((o, idx) => (
                  <tr key={o.order_id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900 dark:text-white">
                      {`PO-${String(idx + 1).padStart(6, "0")}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{o.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{o.total_items}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestoreOrder(o.order_id, `PO-${String(idx + 1).padStart(6, "0")}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {activeTab === "product-returns" && filteredReturns.map(r => (
                  <tr key={r.return_id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900 dark:text-white">
                      {`PR-${String(r.return_id).padStart(6, "0")}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.supplier_name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-48 truncate">{r.reason || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestoreReturn(r.return_id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
