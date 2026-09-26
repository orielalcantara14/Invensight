import { Search, Plus, Wrench, Pencil, Edit2, Archive, TrendingUp, PhilippinePeso, UserCheck, Settings, Trash2, AlertTriangle, Banknote, History, Upload, Download, FileSpreadsheet, CheckCircle2, Clock, ClipboardList } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ProtectedAction } from "@/components/ProtectedAction";

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  danger?: boolean;
}
import { api, Mechanic, MechanicServicesResponse, API_URL } from "@/services/api";
import { toast } from "sonner";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function Mechanics() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [commissionRate, setCommissionRate] = useState(0.80);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [archiveTarget, setArchiveTarget] = useState<{ id: number; name: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [trashTarget, setTrashTarget] = useState<{ id: number; name: string } | null>(null);
  const [trashing, setTrashing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [payoutMechanic, setPayoutMechanic] = useState<Mechanic | null>(null);
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutHistoryMechanic, setPayoutHistoryMechanic] = useState<Mechanic | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  // Mechanic Services Done state & Edit Modal Tabs
  const [editModalTab, setEditModalTab] = useState<"details" | "services">("details");
  const [servicesMechanic, setServicesMechanic] = useState<Mechanic | null>(null);
  const [mechanicServicesData, setMechanicServicesData] = useState<MechanicServicesResponse | null>(null);
  const [isServicesLoading, setIsServicesLoading] = useState(false);
  const [serviceStatusFilter, setServiceStatusFilter] = useState<"ALL" | "Unpaid" | "Paid">("ALL");
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setImporting(true);
    const toastId = toast.loading("Uploading and importing mechanics CSV...");
    try {
      const res = await api.importMechanics(file);
      toast.success(res.message, { id: toastId });
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.message || "Failed to import mechanics.", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  // Form states
  const [newName, setNewName] = useState("");
  const [newStatus, setNewStatus] = useState("Active");

  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editTotalEarnings, setEditTotalEarnings] = useState("");

  const [editCommissionRate, setEditCommissionRate] = useState("80");

  const handleReleasePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutMechanic) return;
    setIsReleasing(true);
    try {
      const res = await api.releaseMechanicPayout(payoutMechanic.mechanic_id, { notes: payoutNotes.trim() || undefined });
      toast.success(`Successfully released payout of ₱${res.payout_amount.toFixed(2)} for ${payoutMechanic.name}`);
      setPayoutMechanic(null);
      setPayoutNotes("");
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.message || "Failed to release payout");
    } finally {
      setIsReleasing(false);
    }
  };

  const fetchPayoutHistory = async (m: Mechanic) => {
    setPayoutHistoryMechanic(m);
    setPayoutHistory([]);
    setIsHistoryLoading(true);
    try {
      const data = await api.getMechanicPayouts(m.mechanic_id);
      setPayoutHistory(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch payout history");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchMechanicServices = async (m: Mechanic) => {
    setServicesMechanic(m);
    setMechanicServicesData(null);
    setIsServicesLoading(true);
    setServiceStatusFilter("ALL");
    setServiceSearchTerm("");
    try {
      const data = await api.getMechanicServices(m.mechanic_id);
      setMechanicServicesData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch mechanic service jobs");
    } finally {
      setIsServicesLoading(false);
    }
  };

  const openEditMechanicModal = (m: Mechanic, tab: "details" | "services" = "details") => {
    setEditingMechanic(m);
    setEditName(m.name);
    setEditStatus(m.status);
    setEditTotalEarnings(m.total_earnings.toString());
    setEditModalTab(tab);
    fetchMechanicServices(m);
  };

  const fetchMechanics = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMechanics();
      setMechanics(data.mechanics || []);
      setCommissionRate(data.mechanic_commission_rate ?? 0.80);
    } catch (error) {
      toast.error("Failed to fetch mechanics list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMechanics();
  }, []);

  const handleAddMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Mechanic name is required");
      return;
    }
    try {
      await api.createMechanic({ name: newName.trim(), status: newStatus });
      toast.success("Mechanic added successfully");
      setIsAddOpen(false);
      setNewName("");
      setNewStatus("Active");
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.message || "Failed to add mechanic");
    }
  };

  const handleUpdateMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Mechanic name is required");
      return;
    }
    if (!editingMechanic) return;
    try {
      const payload: any = {
        name: editName.trim(),
        status: editStatus,
      };
      if (editTotalEarnings !== "") {
        payload.total_earnings = parseFloat(editTotalEarnings);
      }
      await api.updateMechanic(editingMechanic.mechanic_id, payload);
      toast.success("Mechanic updated successfully");
      setEditingMechanic(null);
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.message || "Failed to update mechanic");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(editCommissionRate);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }
    try {
      await api.updateMechanicSettings({ commission_rate: val / 100 });
      toast.success("Split settings updated successfully");
      setIsSettingsOpen(false);
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    }
  };

  const handleArchiveMechanic = (mechanic: Mechanic) => {
    setArchiveTarget({ id: mechanic.mechanic_id, name: mechanic.name });
  };

  const confirmArchiveMechanic = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.deleteMechanic(archiveTarget.id);
      toast.success(`Mechanic "${archiveTarget.name}" moved to Archive`);
      setArchiveTarget(null);
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive mechanic");
    } finally {
      setArchiving(false);
    }
  };

  const handleMoveToTrashMechanic = (mechanic: Mechanic) => {
    setTrashTarget({ id: mechanic.mechanic_id, name: mechanic.name });
  };

  const confirmTrashMechanic = async () => {
    if (!trashTarget) return;
    setTrashing(true);
    try {
      await api.moveMechanicToTrash(trashTarget.id);
      toast.success(`Mechanic "${trashTarget.name}" moved to Deleted Folder`);
      setTrashTarget(null);
      fetchMechanics();
    } catch (err: any) {
      toast.error(err.message || "Failed to move mechanic to Deleted Folder");
    } finally {
      setTrashing(false);
    }
  };

  const handleDeactivateMechanic = (id: number) => {
    setConfirmDialog({
      open: true,
      title: "Deactivate Mechanic",
      message: "Are you sure you want to deactivate this mechanic?",
      danger: true,
      onConfirm: async () => {
        try {
          await api.deleteMechanic(id);
          toast.success("Mechanic deactivated successfully");
          fetchMechanics();
        } catch (err: any) {
          toast.error(err.message || "Failed to deactivate mechanic");
        } finally {
          setConfirmDialog(p => ({ ...p, open: false }));
        }
      },
    });
  };

  const handlePermanentDeleteMechanic = (id: number, name: string) => {
    setConfirmDialog({
      open: true,
      title: "Permanently Delete Mechanic",
      message: `Are you sure you want to permanently delete mechanic "${name}"? This action cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        try {
          await api.deleteMechanic(id);
          toast.success(`Mechanic "${name}" permanently deleted`);
          fetchMechanics();
        } catch (err: any) {
          toast.error(err.message || "Failed to delete mechanic");
        } finally {
          setConfirmDialog(p => ({ ...p, open: false }));
        }
      },
    });
  };

  const filteredMechanics = mechanics.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive ? true : m.status === "Active";
    return matchesSearch && matchesStatus;
  });

  const filteredServices = (mechanicServicesData?.services || []).filter((s) => {
    const term = serviceSearchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      s.service_name.toLowerCase().includes(term) ||
      String(s.invoice_id).includes(term) ||
      `inv-${String(s.invoice_id).padStart(6, "0")}`.toLowerCase().includes(term) ||
      (s.customer_name || "").toLowerCase().includes(term);

    const matchesStatus =
      serviceStatusFilter === "ALL" ? true : s.mechanic_payout_status.toLowerCase() === serviceStatusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactive]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMechanics = filteredMechanics.slice(startIndex, startIndex + itemsPerPage);

  // Calculate high-level stats
  const totalServiceRevenue = mechanics.reduce((sum, m) => sum + m.calculated_revenue, 0);
  const totalMechanicPayouts = mechanics.reduce((sum, m) => sum + m.total_earnings, 0);
  const totalStoreShare = mechanics.reduce((sum, m) => sum + m.store_share, 0);
  const activeCount = mechanics.filter((m) => m.status === "Active").length;

  const mechanicPct = (commissionRate * 100).toFixed(0);
  const storePct = ((1 - commissionRate) * 100).toFixed(0);

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Services
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage mechanics, assign service jobs in POS, and track service jobs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx"
            className="hidden"
          />

          <a
            href={`${API_URL}/api/mechanics/import-template`}
            download
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-full shadow-sm transition-all cursor-pointer border border-transparent"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" /> Template
          </a>

          <button
            onClick={handleImportClick}
            disabled={importing}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-full shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 border border-transparent"
          >
            <Upload className="w-4 h-4 text-white" /> Import CSV
          </button>

          <button
            onClick={() => {
              setEditCommissionRate(mechanicPct);
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-semibold rounded-full shadow-sm transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-zinc-700 dark:text-zinc-300" /> Settings
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" /> Add Mechanic
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total service revenue */}
        <div className="bg-card p-5 rounded-lg border border-border/50 shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Total Service Revenue
            </span>
            <PhilippinePeso className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            ₱{totalServiceRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Stat 2: Mechanic payouts */}
        <div className="bg-card p-5 rounded-lg border border-border/50 shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Mechanic Payouts ({mechanicPct}%)
            </span>
            <PhilippinePeso className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            ₱{totalMechanicPayouts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Stat 3: Store share */}
        <div className="bg-card p-5 rounded-lg border border-border/50 shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Store Revenue ({storePct}%)
            </span>
            <PhilippinePeso className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            ₱{totalStoreShare.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Stat 4: Active Mechanics */}
        <div className="bg-card p-5 rounded-lg border border-border/50 shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Active Mechanics
            </span>
            <UserCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {activeCount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Table Filter and Layout */}
      <div className="border border-border dark:border-gray-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-card overflow-hidden">
        <div className="p-5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search mechanic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-sm bg-card outline-none focus:border-primary/50 text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-2 accent-primary cursor-pointer"
              />
              Show Inactive Mechanics
            </label>
          </div>
        </div>

        {/* Table list */}
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading mechanics list...</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-6 py-4 min-w-[160px]">Mechanic Name</th>
                  <th className="px-6 py-4 text-right min-w-[140px]">Total Sales</th>
                  <th className="px-6 py-4 text-right font-semibold min-w-[160px]">Mechanic Share ({mechanicPct}%)</th>
                  <th className="px-6 py-4 text-right min-w-[160px]">Store Share ({storePct}%)</th>
                  <th className="px-6 py-4 text-right min-w-[120px]">Adjustment</th>
                  <th className="px-6 py-4 text-right font-semibold text-primary min-w-[145px]">Total Earnings</th>
                  <th className="px-6 py-4 text-center min-w-[100px]">Status</th>
                  <th className="px-6 py-4 text-center min-w-[190px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {paginatedMechanics.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                      No mechanics found. Click "Add Mechanic" to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedMechanics.map((m) => (
                    <tr key={m.mechanic_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <button
                          type="button"
                          onClick={() => openEditMechanicModal(m, "details")}
                          className="hover:text-primary hover:underline font-semibold text-foreground text-left cursor-pointer flex items-center gap-1.5 group"
                          title="Click to view & edit mechanic details"
                        >
                          <span>{m.name}</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">₱{m.calculated_revenue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono">₱{m.mechanic_share.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono">₱{m.store_share.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                        {m.earnings_adjustment >= 0 ? "+" : ""}
                        ₱{m.earnings_adjustment.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ₱{m.total_earnings.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${m.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-500"
                            }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center items-center gap-1">
                          <ProtectedAction module="Mechanic Services" action="Edit">
                            <button
                              type="button"
                              onClick={() => openEditMechanicModal(m, "details")}
                              className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit Mechanic"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </ProtectedAction>
                          {m.status === "Active" && (
                            <ProtectedAction module="Mechanic Services" action="Edit">
                              <button
                                type="button"
                                onClick={() => {
                                  setPayoutMechanic(m);
                                  setPayoutNotes("");
                                }}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors cursor-pointer"
                                title="Release Payout"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                              </button>
                            </ProtectedAction>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              fetchPayoutHistory(m);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Payout History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <ProtectedAction module="Mechanic Services" action="Delete">
                            <button
                              type="button"
                              onClick={() => handleArchiveMechanic(m)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              title="Archive Mechanic"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </ProtectedAction>
                          <ProtectedAction module="Mechanic Services" action="Delete">
                            <button
                              type="button"
                              onClick={() => handleMoveToTrashMechanic(m)}
                              className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                              title="Move to Trash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </ProtectedAction>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredMechanics.length > 0 && (
          <OrdersStyleTablePagination
            currentPage={currentPage}
            itemCount={filteredMechanics.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </div>

      {/* Add Mechanic Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight">
              Add Mechanic
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMechanic} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Mechanic Name</label>
              <input
                type="text"
                placeholder="Enter mechanic name (e.g. Rovhic)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-card outline-none focus:border-primary/50 text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-card outline-none focus:border-primary/50 text-foreground"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="border-t border-border/50 pt-4 mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-md shadow-primary/10"
              >
                Add Mechanic
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Mechanic Modal (With Details & Services Done Tabs) */}
      <Dialog open={editingMechanic !== null} onOpenChange={(open) => !open && setEditingMechanic(null)}>
        <DialogContent
          className={`w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col transition-all overflow-hidden ${
            editModalTab === "services" ? "max-w-4xl max-h-[90vh]" : "max-w-lg max-h-[90vh]"
          }`}
        >
          <DialogHeader className="border-b border-border/50 pb-3 mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    {editModalTab === "services" ? <Wrench className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  </div>
                  <span>{editModalTab === "services" ? `Services Done • ${editingMechanic?.name}` : `Edit Mechanic • ${editingMechanic?.name}`}</span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editModalTab === "services"
                    ? "List of all services and repair jobs completed by this mechanic."
                    : "Update mechanic profile, status, and total earnings."}
                </p>
              </div>

              {editingMechanic && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      editingMechanic.status === "Active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {editingMechanic.status}
                  </span>
                  <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-lg font-mono font-bold">
                    Split: {mechanicPct}%
                  </span>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 pt-3 mt-1">
              <button
                type="button"
                onClick={() => setEditModalTab("details")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  editModalTab === "details"
                    ? "bg-primary text-white shadow-2xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Mechanic Details</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab("services")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  editModalTab === "services"
                    ? "bg-primary text-white shadow-2xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Services Done</span>
                {mechanicServicesData && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${
                      editModalTab === "services" ? "bg-white/20 text-white" : "bg-border text-foreground"
                    }`}
                  >
                    {mechanicServicesData.summary.total_services_count}
                  </span>
                )}
              </button>
            </div>
          </DialogHeader>

          {/* TAB 1: DETAILS */}
          {editModalTab === "details" && (
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Quick Services Banner inside details */}
              <div className="p-3 bg-muted/40 border border-border/60 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {mechanicServicesData
                        ? `${mechanicServicesData.summary.total_services_count} ${mechanicServicesData.summary.total_services_count === 1 ? "Service Completed" : "Services Completed"}`
                        : "Completed Services History"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {mechanicServicesData
                        ? `Total Sales: ₱${mechanicServicesData.summary.total_gross_revenue.toFixed(2)} • Mechanic Share: ₱${mechanicServicesData.summary.total_mechanic_earned.toFixed(2)}`
                        : "View all service and repair jobs"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditModalTab("services")}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  View Services →
                </button>
              </div>

              <form onSubmit={handleUpdateMechanic} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Mechanic Name</label>
                  <input
                    type="text"
                    placeholder="Enter mechanic name (e.g. Rovhic)"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-card outline-none focus:border-primary/50 text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-card outline-none focus:border-primary/50 text-foreground"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Total Earnings (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter new total earnings"
                    value={editTotalEarnings}
                    onChange={(e) => setEditTotalEarnings(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-card outline-none focus:border-primary/50 text-foreground font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    You can change this amount to manually adjust the mechanic's total earnings.
                  </p>
                </div>
                <div className="border-t border-border/50 pt-4 mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingMechanic(null)}
                    className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-md shadow-primary/10 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SERVICES DONE */}
          {editModalTab === "services" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Quick Metrics Bar */}
              {mechanicServicesData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2 shrink-0">
                  <div className="p-3 bg-muted/40 border border-border/50 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Services</span>
                    <span className="text-base font-black text-foreground font-mono">
                      {mechanicServicesData.summary.total_services_count} jobs
                    </span>
                  </div>
                  <div className="p-3 bg-muted/40 border border-border/50 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Sales</span>
                    <span className="text-base font-black text-foreground font-mono">
                      ₱{mechanicServicesData.summary.total_gross_revenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Mechanic Earnings</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ₱{mechanicServicesData.summary.total_mechanic_earned.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block">Unpaid Earnings</span>
                    <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                      ₱{mechanicServicesData.summary.unpaid_mechanic_share.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 shrink-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search service name, invoice #, customer..."
                    value={serviceSearchTerm}
                    onChange={(e) => setServiceSearchTerm(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-muted/40 border border-border/60 rounded-lg outline-none focus:border-primary text-foreground"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {(["ALL", "Unpaid", "Paid"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setServiceStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        serviceStatusFilter === st
                          ? "bg-primary text-white shadow-2xs"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {st === "ALL" ? "All Jobs" : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Jobs Table */}
              <div className="flex-1 overflow-y-auto pr-1 border border-border/50 rounded-xl bg-card">
                {isServicesLoading ? (
                  <div className="flex justify-center items-center py-16 text-muted-foreground text-xs font-bold uppercase animate-pulse">
                    Loading service jobs...
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground italic text-sm">
                    No services recorded for this mechanic matching the criteria.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur-xs">
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">Service Name</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3 text-right">Service Fee (₱)</th>
                        <th className="px-4 py-3 text-right">Mechanic ({mechanicPct}%)</th>
                        <th className="px-4 py-3 text-center">Payout Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredServices.map((job) => {
                        const d = job.service_timestamp || job.service_date ? new Date(job.service_timestamp || job.service_date) : null;
                        const dateStr = d ? d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "-";
                        const timeStr = d && job.service_timestamp ? d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";
                        const isPaid = job.mechanic_payout_status === "Paid";
                        return (
                          <tr key={job.sold_item_id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-foreground">{dateStr}</div>
                              {timeStr && <div className="text-[10px] text-muted-foreground">{timeStr}</div>}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                              INV-{String(job.invoice_id).padStart(6, "0")}
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>{job.service_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {job.customer_name || "Walk In customer"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                              ₱{job.total_amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ₱{job.mechanic_share.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isPaid
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {job.mechanic_payout_status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="border-t border-border/50 pt-3 mt-2 flex justify-between items-center shrink-0">
                <span className="text-xs text-muted-foreground">
                  Showing {filteredServices.length} of {mechanicServicesData?.summary.total_services_count || 0} services
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalTab("details")}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    ← Back to Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMechanic(null)}
                    className="px-5 py-2 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Commission Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight">
              Service Split Settings
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Configure the revenue split percentage between the mechanic and the store.
            </p>
          </DialogHeader>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Mechanic Share (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="80"
                value={editCommissionRate}
                onChange={(e) => setEditCommissionRate(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-card outline-none focus:border-primary/50 text-foreground font-mono"
              />
            </div>

            <div className="border-t border-border/50 pt-4 mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-md shadow-primary/10"
              >
                Save Settings
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(p => ({ ...p, open: false }))} />

      {/* Release Payout Modal */}
      <Dialog open={payoutMechanic !== null} onOpenChange={(open) => !open && setPayoutMechanic(null)}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" />
              Release Payout
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Confirm and release payment split for {payoutMechanic?.name}.
            </p>
          </DialogHeader>
          {payoutMechanic && (
            <form onSubmit={handleReleasePayout} className="space-y-4">
              <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase font-sans font-bold">Gross Job Volume</span>
                  <span className="font-bold">₱{payoutMechanic.calculated_revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase font-sans font-bold">Mechanic Share ({mechanicPct}%)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">₱{payoutMechanic.mechanic_share.toFixed(2)}</span>
                </div>
                {payoutMechanic.earnings_adjustment !== 0 && (
                  <div className="flex justify-between border-t border-dashed border-border/50 pt-2">
                    <span className="text-muted-foreground uppercase font-sans font-bold">Manual Adjustment</span>
                    <span className={payoutMechanic.earnings_adjustment >= 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-red-500 font-bold"}>
                      {payoutMechanic.earnings_adjustment >= 0 ? "+" : ""}₱{payoutMechanic.earnings_adjustment.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/50 pt-2.5 text-sm font-bold">
                  <span className="text-foreground uppercase font-sans font-black">Total Release Amount</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">₱{payoutMechanic.total_earnings.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Notes / Description (Optional)</label>
                <textarea
                  placeholder="Add any details (e.g. Paid out for cut-off June 20)"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-card outline-none focus:border-primary/50 text-foreground resize-none h-20"
                />
              </div>
              <div className="border-t border-border/50 pt-4 mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPayoutMechanic(null)}
                  className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReleasing}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                >
                  {isReleasing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Releasing...
                    </>
                  ) : (
                    "Confirm Payout"
                  )}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Payout History Modal */}
      <Dialog open={payoutHistoryMechanic !== null} onOpenChange={(open) => !open && setPayoutHistoryMechanic(null)}>
        <DialogContent className="max-w-2xl w-full p-6 rounded-2xl border border-border/50 bg-card text-foreground flex flex-col max-h-[80vh] overflow-hidden">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <DialogTitle className="text-lg font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Payout History: {payoutHistoryMechanic?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              View all past released payouts and transaction settlements.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {isHistoryLoading ? (
              <div className="flex justify-center items-center py-12 text-muted-foreground/60 text-xs font-bold uppercase animate-pulse">
                Loading transaction history...
              </div>
            ) : payoutHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground italic text-sm">
                No payouts have been released for this mechanic yet.
              </div>
            ) : (
              <div className="border border-border/50 rounded-xl overflow-hidden bg-card divide-y divide-border/50">
                {payoutHistory.map((p) => {
                  const pDate = new Date(p.payout_date);
                  const formattedDate = pDate.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
                  const formattedTime = pDate.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
                  return (
                    <div key={p.payout_id} className="p-4 hover:bg-muted/10 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">₱{p.amount.toFixed(2)}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted border border-border/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            Settled
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Released on {formattedDate} at {formattedTime} by <span className="font-semibold text-foreground">{p.processed_by_name || "System"}</span>
                        </p>
                        {p.notes && (
                          <p className="text-xs text-foreground italic mt-1 font-medium bg-muted/20 border border-border/40 p-2 rounded-lg">
                            "{p.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border-t border-border/50 pt-4 mt-4 flex justify-end">
            <button
              onClick={() => setPayoutHistoryMechanic(null)}
              className="px-5 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-lg transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-card bg-background rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">Archive Mechanic</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">This can be restored later</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6">
              <p className="text-sm text-muted-foreground dark:text-gray-300">
                Are you sure you want to archive mechanic{" "}
                <span className="font-semibold text-foreground">"{archiveTarget.name}"</span>?
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground/70 mt-2">
                They will be moved to the Archive module and can be fully restored at any time.
              </p>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6">
              <button
                onClick={() => setArchiveTarget(null)}
                disabled={archiving}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-300 border border-border dark:border-gray-600 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveMechanic}
                disabled={archiving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                {archiving ? "Archiving..." : "Archive Mechanic"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Trash Confirm Modal */}
      {trashTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-card bg-background rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">Move Mechanic to Deleted Folder</h3>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">30-day retention countdown</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6">
              <p className="text-sm text-muted-foreground dark:text-gray-300">
                Are you sure you want to move mechanic{" "}
                <span className="font-semibold text-foreground">"{trashTarget.name}"</span> to the Deleted Folder?
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground/70 mt-2">
                This mechanic will remain in the Deleted Folder for 30 days before permanent deletion.
              </p>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6">
              <button
                onClick={() => setTrashTarget(null)}
                disabled={trashing}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-300 border border-border dark:border-gray-600 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              <button
                onClick={confirmTrashMechanic}
                disabled={trashing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {trashing ? "Moving..." : "Move to Trash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function handlePageChange(page: number) {
    setCurrentPage(page);
  }

  function handleItemsPerPageChange(value: number) {
    setItemsPerPage(value);
    setCurrentPage(1);
  }
}

function ConfirmModal({ dialog, onClose }: { dialog: ConfirmDialogState; onClose: () => void }) {
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
            onClick={() => { dialog.onConfirm(); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest text-white rounded-lg transition-colors bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/10`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
