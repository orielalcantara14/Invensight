import { Search, Download, FileText, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import type { AuditLogEntry } from "@/services/api";
import { api } from "@/services/api";
import { getSession } from "@/auth/session";
import { ExportPreviewModal } from "../modals/ExportPreviewModal";
import { EditAuditLogModal } from "../modals/EditAuditLogModal";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProtectedAction } from "@/components/ProtectedAction";

export function AuditLog() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isClearing, setIsClearing] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedLogForEdit, setSelectedLogForEdit] = useState<AuditLogEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const session = getSession();

  useEffect(() => {
    const fetchLogs = async () => {
      if (!session?.user_id) return;
      try {
        const logs = await api.getAuditLogs(session.user_id);
        setAuditLogs(logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [session?.user_id]);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === "All" || 
      (filterAction === "LOGIN" 
        ? (log.action.includes("LOGIN") || log.action.includes("LOGOUT") || log.action.includes("OTP") || log.action.includes("SESSION") || log.action.includes("LOCKOUT"))
        : log.action.toLowerCase().includes(filterAction.toLowerCase()));
    
    const matchesRole = filterRole === "All" || 
      (log.role?.toLowerCase() === filterRole.toLowerCase());
    
    return matchesSearch && matchesAction && matchesRole;
  });

  const handleClearLogs = async () => {
    if (!session?.user_id) return;
    if (!window.confirm("Are you sure you want to clear all audit logs? Activity from the Root Admin will be preserved for security purposes.")) {
      return;
    }

    setIsClearing(true);
    try {
      await api.deleteAuditLogs(session.user_id);
      const logs = await api.getAuditLogs(session.user_id);
      setAuditLogs(logs);
      toast.success("Logs cleared successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear logs");
    } finally {
      setIsClearing(false);
    }
  };

  const handleEditLog = (log: AuditLogEntry) => {
    setSelectedLogForEdit(log);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedLog = async (logId: number, data: Partial<AuditLogEntry>) => {
    if (!session?.user_id) return;
    try {
      await api.updateAuditLog(session.user_id, logId, data);
      setAuditLogs(prev => prev.map(log => log.log_id === logId ? { ...log, ...data } : log));
      toast.success("Audit log updated successfully.");
    } catch (err) {
      throw err;
    }
  };

  const criticalActions = auditLogs.filter(log => 
    ['DELETE', 'DEACTIVATE_USER', 'DELETE_ROLE', 'PERMANENT_DELETE', 'ARCHIVE_PRODUCT', 'ARCHIVE_SUPPLIER', 'DELETE_ORDER', 'FAILED_LOGIN', 'ACCOUNT_LOCKOUT'].includes(log.action)
  ).length;

  const today = new Date().toISOString().split('T')[0];
  const todaysActivities = auditLogs.filter(log => 
    log.timestamp.startsWith(today)
  ).length;

  const uniqueUsers = new Set(auditLogs.map(log => log.user_id)).size;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAction, filterRole]);

  const role = (session?.role || "").toLowerCase();
  const username = (session?.username || "").toLowerCase();
  const canClearLogs = ["system administrator", "super admin", "administrator", "root admin", "manager"].includes(role) || username === "rootadminnginamo" || username === "rootadmin";

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Detailed, real-time activity tracking across all system movements</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Activities</div>
          <div className="text-2xl font-bold text-foreground font-mono">{loading ? "…" : auditLogs.length}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Today's Activities</div>
          <div className="text-2xl font-bold text-foreground font-mono">{loading ? "…" : todaysActivities}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Unique Users</div>
          <div className="text-2xl font-bold text-foreground font-mono">{loading ? "…" : uniqueUsers}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Critical Actions</div>
          <div className="text-2xl font-bold text-foreground font-mono">{loading ? "…" : criticalActions}</div>
        </div>
      </div>

      {/* Audit Log Table Wrapper */}
      <div className="bg-card rounded-lg shadow-xs border border-border/55 overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">System Activity Log</h2>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="bg-muted/20 border border-border/60 rounded-lg py-1.5 px-3 text-xs font-semibold outline-none appearance-none cursor-pointer text-foreground"
              >
                <option value="All">All Actions</option>
                <option value="LOGIN">Login, Logout & Security</option>
                <option value="SHIFT">Cashier Shifts & Drawers</option>
                <option value="SALE">Sales & POS</option>
                <option value="ADJUST">Inventory Audit</option>
                <option value="ORDER">Orders & Receiving</option>
                <option value="RETURN">Returns</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="ARCHIVE">Archive</option>
                <option value="RESTORE">Restore</option>
                <option value="DELETE">Delete</option>
                <option value="CLEAR">Clear Logs</option>
              </select>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-muted/20 border border-border/60 rounded-lg py-1.5 px-3 text-xs font-semibold outline-none appearance-none cursor-pointer text-foreground"
              >
                <option value="All">All Roles</option>
                <option value="System Administrator">System Administrator</option>
                <option value="Administrator">Administrator</option>
                <option value="Manager">Manager</option>
                <option value="Sales Staff">Sales Staff</option>
                <option value="Cashier">Cashier</option>
              </select>
              <ProtectedAction module="Audit Log" action="Export">
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 rounded-lg transition-colors border border-border/50 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </ProtectedAction>
              {canClearLogs && (
                <ProtectedAction module="Audit Log" action="Delete">
                  <button 
                    onClick={handleClearLogs}
                    disabled={isClearing}
                    className="px-3.5 py-1.5 bg-red-650 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {isClearing ? "Clearing..." : "Clear History"}
                  </button>
                </ProtectedAction>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Search by user, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-border/60 bg-muted/20 hover:bg-muted/40 focus:bg-card rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">User</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Role</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Action</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Activity Details</th>
                <th className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-24 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                    <p className="font-medium">No audit logs found</p>
                    <p className="text-xs text-muted-foreground mt-1">Activity will appear here as users perform actions in the system</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((log) => (
                  <tr key={log.log_id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      {new Date(log.timestamp).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-foreground">{log.username || 'System'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className="inline-flex items-center text-[10px] font-semibold text-muted-foreground uppercase">
                        {log.role || 'System'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase border border-border/50 rounded-md bg-muted/30">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          log.action.includes('CREATE') || log.action.includes('ADD') ? 'bg-emerald-500' :
                          log.action.includes('DELETE') || log.action.includes('DEACTIVATE') || log.action.includes('REJECT') || log.action.includes('CLEAR') || log.action.includes('LOCKOUT') || log.action.includes('FAILED') ? 'bg-red-500' :
                          log.action.includes('UPDATE') || log.action.includes('RESTORE') || log.action.includes('APPROVE') || log.action.includes('ADJUST') ? 'bg-blue-500' :
                          log.action.includes('ARCHIVE') || log.action.includes('LOGOUT') ? 'bg-amber-500' :
                          log.action.includes('LOGIN') ? 'bg-emerald-500' : 'bg-zinc-400'
                        )} />
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-foreground/90 font-medium whitespace-normal leading-relaxed">
                      {log.details || "No details provided"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <ProtectedAction module="Audit Log" action="Edit">
                          <button
                            onClick={() => handleEditLog(log)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Log"
                          >
                            <Edit className="w-3.5 h-3.5" />
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
        {!loading && (
          <OrdersStyleTablePagination
            itemCount={filteredLogs.length}
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

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Audit Log"
        filename={`InvenSight_AuditLog_${new Date().toISOString().split('T')[0]}`}
        data={auditLogs.map(log => ({
          id: log.log_id,
          "Timestamp": log.timestamp,
          "User": log.username,
          "Role": log.role || "System",
          "Action": log.action,
          "Activity Details": log.details || ""
        }))}
      />

      <EditAuditLogModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEditedLog}
        log={selectedLogForEdit}
      />
    </div>
  );
}
