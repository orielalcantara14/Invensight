import { Users, Shield, Settings, Activity, UserCheck, Clock, ArrowUpRight, Plus, FileText } from "lucide-react";
import { Link } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { AddUserModal } from "../modals/AddUserModal";
import { api, type AuditLogEntry } from "@/services/api";
import { getSession } from "@/auth/session";
import { ProtectedAction } from "../ProtectedAction";

export function UserManagement() {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [roleCount, setRoleCount] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);
  const [auditLogCount, setAuditLogCount] = useState(0);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const session = getSession();
  const currentRole = (session?.role ?? "").trim().toLowerCase();
  const isRootAdmin = (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo";
  const isAdministrator = currentRole === "administrator";
  const canManageAccounts = isRootAdmin || isAdministrator;
  const allowedCreateRoleKeys = isRootAdmin
    ? ["administrator", "manager", "sales staff", "cashier", "warehouse staff"]
    : isAdministrator
      ? ["manager", "sales staff", "cashier", "warehouse staff"]
      : [];

  const refreshCounts = useCallback(async () => {
    if (!session?.user_id) return;
    try {
      const [users, roles, stats, logs] = await Promise.all([
        api.getUsers(), 
        api.getRoles(),
        api.getUserManagementStats(session.user_id),
        api.getAuditLogs(session.user_id)
      ]);
      setUserCount(users.length);
      setRoleCount(roles.length);
      setRoleNames(roles.map((r) => r.name));
      setActiveSessions(stats.active_sessions);
      setAuditLogCount(stats.audit_log_count);
      setRecentLogs(logs.slice(0, 5));
    } catch {
      setRoleNames([]);
      setActiveSessions(0);
      setAuditLogCount(0);
    }
  }, [session?.user_id]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const handleAddUser = async (user: {
    username: string;
    fullName: string;
    email: string;
    password: string;
    role: string;
    status: "Active" | "Inactive";
    permissions?: Record<string, string[]>;
  }) => {
    if (!canManageAccounts) {
      setUserFormError("Only Root Admin and Administrators can create accounts.");
      return;
    }
    if (!session?.user_id) {
      setUserFormError("Session is missing actor context. Please sign in again.");
      return;
    }
    setUserFormError(null);
    setSavingUser(true);
    try {
      await api.createUser({
        username: user.username.trim(),
        full_name: user.fullName.trim(),
        email: user.email.trim() || null,
        password: user.password,
        role: user.role,
        permissions: user.permissions || {},
        is_active: user.status === "Active",
      }, session.user_id);
      setIsAddUserModalOpen(false);
      await refreshCounts();
    } catch (e) {
      setUserFormError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage users, roles, and system access with comprehensive audit trails</p>
          </div>
          <ProtectedAction module="User Management" action="Add">
            <button
              type="button"
              onClick={() => {
                setUserFormError(null);
                setIsAddUserModalOpen(true);
              }}
              disabled={!canManageAccounts}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </ProtectedAction>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Total Users</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-bold text-foreground">{userCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Active accounts</div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Active Sessions</span>
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-foreground">{activeSessions}</div>
          <div className="text-sm text-muted-foreground mt-1">Logged in today</div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">User Roles</span>
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-foreground">{roleCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Defined roles</div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Audit Logs</span>
            <Activity className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-foreground">{auditLogCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Recorded in audit log</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProtectedAction module="User Management" action="View">
          <Link to="/users" className="block group">
            <div className="bg-card p-6 rounded-lg shadow border border-border hover:border-primary transition-all hover:shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      Users & Roles
                    </h3>
                    <p className="text-sm text-muted-foreground">Access Control Management</p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-muted-foreground mb-4">
                Manage user accounts, assign roles, and configure permissions with role-based access control for secure system operations.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  <span>Create and manage user accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Define roles and permissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>Configure access controls</span>
                </div>
              </div>
            </div>
          </Link>
        </ProtectedAction>

        <ProtectedAction module="Audit Log" action="View">
          <Link to="/audit-log" className="block group">
            <div className="bg-card p-6 rounded-lg shadow border border-border hover:border-orange-500 transition-all hover:shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Activity className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-orange-600 transition-colors">
                      Audit Log
                    </h3>
                    <p className="text-sm text-muted-foreground">System Activity Tracking</p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground/70 group-hover:text-orange-600 transition-colors" />
              </div>
              <p className="text-muted-foreground mb-4">
                Comprehensive audit trail of all system activities, tracking user actions, data changes, and security events for compliance.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Track all user activities</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span>Monitor system events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span>Security and compliance logs</span>
                </div>
              </div>
            </div>
          </Link>
        </ProtectedAction>
      </div>

      <div className="mt-8 bg-card rounded-lg shadow border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <Link to="/audit-log" className="text-sm text-primary hover:text-primary/90 font-medium">
            View All Logs
          </Link>
        </div>
        
        {recentLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground/70">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-muted-foreground font-medium">No recent activities</p>
              <p className="text-sm text-muted-foreground/70 mt-1">User actions will appear here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {recentLogs.map((log) => (
              <div key={log.log_id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                <div className={`p-2 rounded-lg ${
                  log.action.includes('CREATE') ? 'bg-green-100 text-green-600' :
                  log.action.includes('DELETE') || log.action.includes('DEACTIVATE') ? 'bg-red-100 text-red-600' :
                  'bg-blue-100 text-primary'
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {log.username}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-primary">{log.action}</span>
                    {" • "}
                    {log.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => {
          setIsAddUserModalOpen(false);
          setUserFormError(null);
        }}
        onAddUser={handleAddUser}
        roleNames={roleNames.filter((name) =>
          allowedCreateRoleKeys.includes(name.trim().toLowerCase())
        )}
        error={userFormError}
        saving={savingUser}
      />
    </div>
  );
}
