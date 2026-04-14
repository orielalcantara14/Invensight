import { Search, Download, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import type { AuditLogEntry } from "@/services/api";
import { api } from "@/services/api";
import { getSession } from "@/auth/session";
import { ExportPreviewModal } from "../modals/ExportPreviewModal";
import { exportToExcel } from "@/utils/export";

export function AuditLog() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("All");
  const [filterEntity, setFilterEntity] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isClearing, setIsClearing] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === "All" || 
      log.action.toLowerCase().includes(filterAction.toLowerCase());
    
    // Entity type can be 'user', 'User', 'product', 'Product', etc.
    const matchesEntity = filterEntity === "All" || 
      log.entity_type.toLowerCase() === filterEntity.toLowerCase();
    
    const matchesRole = filterRole === "All" || 
      (log.role?.toLowerCase() === filterRole.toLowerCase());
    
    return matchesSearch && matchesAction && matchesEntity && matchesRole;
  });

  const handleClearLogs = async () => {
    if (!session?.user_id) return;
    if (!window.confirm("Are you sure you want to clear all audit logs? Activity from the Root Admin will be preserved for security purposes.")) {
      return;
    }

    setIsClearing(true);
    try {
      await api.deleteAuditLogs(session.user_id);
      // Refresh logs
      const logs = await api.getAuditLogs(session.user_id);
      setAuditLogs(logs);
      alert("Logs cleared successfully.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to clear logs");
    } finally {
      setIsClearing(false);
    }
  };

  const handleExport = () => {
    const data = filteredLogs.map(log => ({
      "Timestamp": log.timestamp,
      "User": log.username,
      "Role": log.role || "System",
      "Action": log.action,
      "Entity Type": log.entity_type,
      "Entity ID": log.entity_id,
      "Details": log.details || ""
    }));
    exportToExcel(data, "AuditLog_Export");
  };

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const criticalActions = auditLogs.filter(log => 
    ['DELETE', 'DEACTIVATE_USER', 'DELETE_ROLE', 'PERMANENT_DELETE', 'ARCHIVE_PRODUCT', 'ARCHIVE_SUPPLIER', 'DELETE_ORDER'].includes(log.action)
  ).length;

  const today = new Date().toISOString().split('T')[0];
  const todaysActivities = auditLogs.filter(log => 
    log.timestamp.startsWith(today)
  ).length;

  const uniqueUsers = new Set(auditLogs.map(log => log.user_id)).size;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAction, filterEntity, filterRole]);

  const canClearLogs = session?.role?.toLowerCase() === 'administrator' || session?.role?.toLowerCase() === 'root admin';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-600 mt-1">Track all system activities and changes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Activities</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "…" : auditLogs.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Today's Activities</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "…" : todaysActivities}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Unique Users</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "…" : uniqueUsers}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Critical Actions</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "…" : criticalActions}</div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">System Activity Log</h2>
            <div className="flex items-center gap-3">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="ARCHIVE">Archive</option>
                <option value="RESTORE">Restore</option>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
                <option value="RECEIVE">Receive</option>
              </select>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Entities</option>
                <option value="Product">Product</option>
                <option value="Sale">Sale</option>
                <option value="User">User</option>
                <option value="Inventory">Inventory</option>
                <option value="Order">Order</option>
                <option value="Supplier">Supplier</option>
                <option value="Return">Return</option>
                <option value="Role">Role</option>
                <option value="Category">Category</option>
              </select>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Roles</option>
                <option value="Administrator">Administrator</option>
                <option value="Manager">Manager</option>
                <option value="Sales Staff">Sales Staff</option>
                <option value="Cashier">Cashier</option>
              </select>
              <button 
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export Audit Log
              </button>
              {canClearLogs && (
                <button 
                  onClick={handleClearLogs}
                  disabled={isClearing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isClearing ? "Clearing..." : "Clear History"}
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  {/* Header checkbox removed */}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading audit logs…
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No audit logs available</p>
                    <p className="text-sm text-gray-400 mt-1">System activities will be tracked here</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Row selection handled in Export Wizard */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.username || 'System'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                        log.role?.toLowerCase() === 'administrator' ? 'bg-purple-50 text-purple-700' :
                        log.role?.toLowerCase() === 'manager' ? 'bg-indigo-50 text-indigo-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {log.role || 'System'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                        log.action.includes('CREATE') || log.action.includes('ADD') ? 'bg-green-50 text-green-700 border-green-200' :
                        log.action.includes('DELETE') || log.action.includes('DEACTIVATE') || log.action.includes('REJECT') || log.action.includes('CLEAR') ? 'bg-red-50 text-red-700 border-red-200' :
                        log.action.includes('UPDATE') || log.action.includes('RESTORE') || log.action.includes('APPROVE') || log.action.includes('ADJUST') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        log.action.includes('ARCHIVE') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>{log.action.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{log.entity_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.entity_id ? `#${log.entity_id}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs" title={log.details || ""}>
                      <div className="line-clamp-2 md:line-clamp-none whitespace-pre-wrap break-words">
                        {log.details || "No details provided"}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredLogs.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-100 text-gray-700"
                >
                  {"<"}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded border text-sm ${
                      page === currentPage
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-100 text-gray-700"
                >
                  {">"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Audit Log"
        filename={`InvenSight_AuditLog_${new Date().toISOString().split('T')[0]}`}
        data={auditLogs.map(log => ({
          id: log.log_id,
          "Timestamp": log.timestamp, // Field for date filtering
          "User": log.username,
          "Role": log.role || "System",
          "Action": log.action,
          "Entity Type": log.entity_type,
          "Entity ID": log.entity_id || "-",
          "Details": log.details || ""
        }))}
      />
    </div>
  );
}
