import { Users, Shield, Settings, Activity, UserCheck, Clock, ArrowUpRight, Plus, FileText } from "lucide-react";
import { Link } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { AddUserModal } from "../modals/AddUserModal";
import { api, type AuditLogEntry } from "@/services/api";
import { getSession } from "@/auth/session";
import { ProtectedAction } from "../ProtectedAction";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const isSystemAdmin = currentRole === "system administrator" || currentRole === "super admin";
  const isAdministrator = currentRole === "administrator" || currentRole === "admin";
  const canManageAccounts = isRootAdmin || isSystemAdmin || isAdministrator;

  const getRoleLevel = (roleName: string) => {
    const norm = (roleName || "").trim().toLowerCase();
    if (norm === "system administrator" || norm === "super admin" || norm === "system admin") return 80;
    if (norm === "administrator" || norm === "admin") return 60;
    if (norm === "manager") return 40;
    if (norm === "sales staff" || norm === "cashier") return 20;
    return 30;
  };

  const allowedRoleNames = isRootAdmin
    ? roleNames
    : isSystemAdmin
      ? roleNames.filter((name) => getRoleLevel(name) < 80)
      : isAdministrator
        ? roleNames.filter((name) => getRoleLevel(name) < 60)
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
      setUserFormError("Only Root Admin, System Admins, and Administrators can create accounts.");
      return;
    }
    if (!session?.user_id) {
      setUserFormError("Session is missing actor context. Please sign in again.");
      return;
    }
    setUserFormError(null);
    setSavingUser(true);
    try {
      const newUser = await api.createUser({
        username: user.username.trim(),
        full_name: user.fullName.trim(),
        email: user.email.trim() || null,
        password: user.password,
        role: user.role,
        permissions: user.permissions || {},
        is_active: user.status === "Active",
      }, session.user_id);
      await refreshCounts();
      toast.success("User created successfully.");
      return {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.full_name,
        employeeId: `EMP-${String(newUser.employee_id).padStart(4, "0")}`,
        email: newUser.email ?? "",
        role: newUser.role,
        status: (newUser.is_active ? "Active" : "Archived") as "Active" | "Archived",
        lastLogin: newUser.last_login ? newUser.last_login.slice(0, 10) : "Never",
        permissions: newUser.permissions_json,
      };
    } catch (e) {
      setUserFormError(e instanceof Error ? e.message : "Failed to create user");
      throw e;
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">User Management</h1>
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
              className="flex items-center gap-2 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors border border-border/50 shadow-xs disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add User
            </button>
          </ProtectedAction>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-muted-foreground/75" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">{userCount}</div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Active accounts</div>
        </div>

        <div className="bg-card p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Sessions</span>
            <UserCheck className="w-4 h-4 text-muted-foreground/75" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">{activeSessions}</div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Logged in today</div>
        </div>

        <div className="bg-card p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">User Roles</span>
            <Shield className="w-4 h-4 text-muted-foreground/75" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">{roleCount}</div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Defined roles</div>
        </div>

        <div className="bg-card p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Audit Logs</span>
            <Activity className="w-4 h-4 text-muted-foreground/75" />
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">{auditLogCount}</div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Recorded in audit log</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProtectedAction module="User Management" action="View">
          <Link to="/users" className="block group">
            <div className="bg-card p-6 rounded-lg border border-border/50 hover:border-zinc-800 dark:hover:border-zinc-200 hover:bg-muted/10 transition-all shadow-xs">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-muted rounded-lg border border-border/50 text-muted-foreground group-hover:text-foreground transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                      Users & Roles
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">Access Control Management</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight leading-relaxed mb-4">
                Manage user accounts, assign roles, and configure permissions with role-based access control for secure system operations.
              </p>
              <div className="space-y-2 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Create and manage user accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Define roles and permissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configure access controls</span>
                </div>
              </div>
            </div>
          </Link>
        </ProtectedAction>

        <ProtectedAction module="Audit Log" action="View">
          <Link to="/audit-log" className="block group">
            <div className="bg-card p-6 rounded-lg border border-border/50 hover:border-zinc-800 dark:hover:border-zinc-200 hover:bg-muted/10 transition-all shadow-xs">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-muted rounded-lg border border-border/50 text-muted-foreground group-hover:text-foreground transition-colors">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                      Audit Log
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">System Activity Tracking</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight leading-relaxed mb-4">
                Comprehensive audit trail of all system activities, tracking user actions, data changes, and security events for compliance.
              </p>
              <div className="space-y-2 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Track all user activities</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Monitor system events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Security and compliance logs</span>
                </div>
              </div>
            </div>
          </Link>
        </ProtectedAction>
      </div>

      <div className="mt-6 bg-card rounded-lg border border-border/55 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h2>
          <Link to="/audit-log" className="text-xs text-zinc-900 dark:text-zinc-50 hover:underline font-bold uppercase tracking-wider">
            View All
          </Link>
        </div>
        
        {recentLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-20 text-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider">No recent activities</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {recentLogs.map((log) => (
              <div key={log.log_id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0 group">
                <div className="p-2 rounded-lg bg-muted border border-border/50 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-foreground">
                      {log.username}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap ml-2">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase border border-border/50 rounded bg-muted/20 mr-1.5">
                      <span className={cn(
                        "w-1 h-1 rounded-full",
                        log.action.includes('CREATE') || log.action.includes('ADD') ? 'bg-emerald-500' :
                        log.action.includes('DELETE') || log.action.includes('DEACTIVATE') ? 'bg-red-500' :
                        'bg-blue-500'
                      )} />
                      {log.action}
                    </span>
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
        roleNames={allowedRoleNames}
        error={userFormError}
        saving={savingUser}
      />
    </div>
  );
}
