import { Search, Download, Plus, Shield, User as UserIcon, Users as UsersIcon, Pencil, Archive, RotateCcw, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { AddUserModal } from "../modals/AddUserModal";
import { AddRoleModal } from "../modals/AddRoleModal";
import { EditRoleModal } from "../modals/EditRoleModal";
import { EditUserModal } from "../modals/EditUserModal";
import { ViewRoleUsersModal } from "../modals/ViewRoleUsersModal";
import { ExportPreviewModal } from "../modals/ExportPreviewModal";
import { ArchiveConfirmationModal } from "../modals/ArchiveConfirmationModal";
import { OrdersStyleTablePagination } from "@/components/OrdersStyleTablePagination";
import type { User, Role } from "@/types";
import { api, type ApiUser, type ApiRole, type UpdateUserPayload } from "@/services/api";
import { getSession } from "@/auth/session";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProtectedAction } from "../ProtectedAction";

function mapApiUser(u: ApiUser): User {
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    employeeId: `EMP-${String(u.employee_id).padStart(4, "0")}`,
    email: u.email ?? "",
    role: u.role,
    status: u.is_active ? "Active" : "Archived",
    lastLogin: u.last_login ? u.last_login.slice(0, 10) : "Never",
    permissions: u.permissions_json,
  };
}

function mapApiRole(r: ApiRole): Role {
  return {
    id: r.id,
    name: r.name,
    permissions: r.permissions,
    userCount: r.user_count,
  };
}

export function Users() {
  type PendingNewUser = {
    username: string;
    fullName: string;
    email: string;
    password: string;
    role: string;
    status: "Active" | "Inactive";
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesPerPage, setRolesPerPage] = useState(6);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [userToArchive, setUserToArchive] = useState<User | null>(null);
  const [isArchivingUser, setIsArchivingUser] = useState(false);
  const [userToTrash, setUserToTrash] = useState<User | null>(null);
  const [isTrashingUser, setIsTrashingUser] = useState(false);
  const [roleToArchive, setRoleToArchive] = useState<Role | null>(null);
  const [isArchivingRole, setIsArchivingRole] = useState(false);
  const [roleToTrash, setRoleToTrash] = useState<Role | null>(null);
  const [isTrashingRole, setIsTrashingRole] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [viewUsersForRole, setViewUsersForRole] = useState<Role | null>(null);
  const [editRoleError, setEditRoleError] = useState<string | null>(null);
  const [savingEditRole, setSavingEditRole] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const session = getSession();
  const currentRole = (session?.role ?? "").trim().toLowerCase();
  const isRootAdmin = (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo";
  const isSystemAdmin = currentRole === "system administrator" || currentRole === "super admin";
  const isAdministrator = currentRole === "administrator";
  const isManager = currentRole === "manager";
  const canManageAccounts = isRootAdmin || isSystemAdmin || isAdministrator || isManager;

  const refreshData = useCallback(async () => {
    setListError(null);
    try {
      const [u, r] = await Promise.all([api.getUsers(), api.getRoles()]);
      setUsers(u.map(mapApiUser));
      setRoles(r.map(mapApiRole));
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to load users and roles");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshData();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshData]);

  const closeAddUserModal = () => {
    setIsAddUserModalOpen(false);
    setUserFormError(null);
  };

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
      
      await refreshData();
      return mapApiUser(newUser);
    } catch (e) {
      setUserFormError(e instanceof Error ? e.message : "Failed to create user");
      throw e;
    } finally {
      setSavingUser(false);
    }
  };

  const handleAddRole = async (role: { name: string; permissions: Record<string, string[]> }) => {
    if (!session?.user_id) {
      setRoleFormError("Session is missing actor context. Please sign in again.");
      return;
    }
    setRoleFormError(null);
    setSavingRole(true);
    try {
      await api.createRole({
        name: role.name.trim(),
        permissions: role.permissions,
      }, session.user_id);
      setIsAddRoleModalOpen(false);
      await refreshData();
    } catch (e) {
      setRoleFormError(e instanceof Error ? e.message : "Failed to create role");
    } finally {
      setSavingRole(false);
    }
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditError(null);
  };

  const handleSaveEditUser = async (userId: number, payload: UpdateUserPayload) => {
    if (!session?.user_id) {
      setEditError("Session is missing actor context. Please sign in again.");
      return;
    }
    setEditError(null);
    setSavingEdit(true);
    try {
      await api.updateUser(userId, payload, session.user_id);
      closeEditModal();
      await refreshData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update user";
      setEditError(msg);
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const closeEditRoleModal = () => {
    setEditingRole(null);
    setEditRoleError(null);
  };

  const handleSaveEditRole = async (roleId: number, data: { name: string; permissions: Record<string, string[]> }) => {
    if (!session?.user_id) {
      setEditRoleError("Session is missing actor context. Please sign in again.");
      return;
    }
    setEditRoleError(null);
    setSavingEditRole(true);
    try {
      await api.updateRole(roleId, {
        name: data.name,
        permissions: data.permissions,
      }, session.user_id);
      closeEditRoleModal();
      await refreshData();
    } catch (e) {
      setEditRoleError(e instanceof Error ? e.message : "Failed to update role");
    } finally {
      setSavingEditRole(false);
    }
  };

  const handleRoleArchiveClick = (role: Role) => {
    if (role.userCount > 0) {
      toast.error(`Cannot archive role "${role.name}" because ${role.userCount} user(s) are currently assigned to it. Please reassign the user(s) first.`);
      return;
    }
    setRoleToArchive(role);
  };

  const handleRoleDeleteClick = (role: Role) => {
    if (role.userCount > 0) {
      toast.error(`Cannot delete role "${role.name}" because ${role.userCount} user(s) are currently assigned to it. Please reassign the user(s) first.`);
      return;
    }
    setRoleToTrash(role);
  };

  const confirmArchiveRole = async () => {
    if (!roleToArchive) return;
    setIsArchivingRole(true);
    try {
      if (!session?.user_id) {
        setListError("Session is missing actor context. Please sign in again.");
        return;
      }
      await api.archiveRole(roleToArchive.id, session.user_id);
      toast.success(`Role "${roleToArchive.name}" moved to archive successfully`);
      setRoleToArchive(null);
      await refreshData();
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : "Failed to archive role");
    } finally {
      setIsArchivingRole(false);
    }
  };

  const confirmDeleteRole = async () => {
    if (!roleToTrash) return;
    setIsTrashingRole(true);
    try {
      if (!session?.user_id) {
        setListError("Session is missing actor context. Please sign in again.");
        return;
      }
      await api.deleteRole(roleToTrash.id, session.user_id);
      toast.success(`Role "${roleToTrash.name}" deleted successfully`);
      setRoleToTrash(null);
      await refreshData();
    } catch (e: any) {
      toast.error(e instanceof Error ? e.message : "Failed to delete role");
    } finally {
      setIsTrashingRole(false);
    }
  };

  const confirmArchiveUser = async () => {
    if (!userToArchive) return;
    setIsArchivingUser(true);
    try {
      if (!session?.user_id) {
        setListError("Session is missing actor context. Please sign in again.");
        return;
      }
      await api.deleteUser(userToArchive.id, session.user_id);
      toast.success(`User "${userToArchive.fullName}" archived successfully`);
      setUserToArchive(null);
      await refreshData();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to archive user");
    } finally {
      setIsArchivingUser(false);
    }
  };

  const confirmTrashUser = async () => {
    if (!userToTrash) return;
    setIsTrashingUser(true);
    try {
      if (!session?.user_id) {
        setListError("Session is missing actor context. Please sign in again.");
        return;
      }
      await api.moveUserToTrash(userToTrash.id, session.user_id);
      toast.success(`User "${userToTrash.fullName}" moved to Deleted Folder`);
      setUserToTrash(null);
      await refreshData();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to move user to Deleted Folder");
    } finally {
      setIsTrashingUser(false);
    }
  };

  const filteredUsers = users
    .filter((u) => u.status === "Active" && u.id !== session?.user_id)
    .filter((user) => {
      const q = searchTerm.toLowerCase();
      return (
        String(user.id).includes(q) ||
        user.username?.toLowerCase().includes(q) ||
        user.fullName?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.employeeId?.toLowerCase().includes(q) ||
        user.role?.toLowerCase().includes(q)
      );
    });

  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * usersPerPage,
    usersPage * usersPerPage
  );

  const paginatedRoles = roles.slice(
    (rolesPage - 1) * rolesPerPage,
    rolesPage * rolesPerPage
  );

  const getRoleLevel = (roleName: string | undefined | null) => {
    const norm = (roleName ?? "").trim().toLowerCase();
    if (norm === "system administrator" || norm === "super admin") return 80;
    if (norm === "administrator") return 60;
    if (norm === "manager") return 40;
    if (norm === "sales staff" || norm === "cashier") return 20;
    return 30; // custom roles
  };

  const allowedCreateRoleKeys = isRootAdmin
    ? roles.map((r) => r.name.trim().toLowerCase())
    : isSystemAdmin
      ? roles.filter((r) => getRoleLevel(r.name) < 80).map((r) => r.name.trim().toLowerCase())
      : isAdministrator
        ? roles.filter((r) => getRoleLevel(r.name) < 60).map((r) => r.name.trim().toLowerCase())
        : isManager
          ? ["sales staff", "cashier"]
          : [];
  const roleNames = roles
    .filter((r) => allowedCreateRoleKeys.includes(r.name.trim().toLowerCase()))
    .map((r) => r.name);
  const archivedCount = users.filter((u) => u.status === "Archived").length;
  const canManageTargetUser = (user: User) => {
    if (isRootAdmin) return true;
    if ((user.username ?? "").trim().toLowerCase() === "rootadminnginamo") return false;
    if (user.id === session?.user_id) return false;
    
    const targetLevel = getRoleLevel(user.role);
    if (isSystemAdmin) {
      return targetLevel < 80; // System Administrator can manage Administrator (60), Manager (40), Cashier (20), etc.
    }
    if (isAdministrator) {
      return targetLevel < 60; // Administrator can manage Manager (40), Cashier (20), etc.
    }
    if (isManager) {
      return targetLevel < 40; // Manager can manage Sales Staff and Cashier (20)
    }
    return false;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {listError ? (
        <div
          className="mb-4 rounded-lg border border-red-200/50 bg-red-500/5 px-4 py-3 text-xs font-semibold text-red-650"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage users and role-based access control</p>
        </div>
        <ProtectedAction module="User Management" action="Add">
          <button
            onClick={() => {
              setUserFormError(null);
              setIsAddUserModalOpen(true);
            }}
            disabled={!canManageAccounts}
            className="flex items-center gap-2 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add User
          </button>
        </ProtectedAction>
      </div>

      {/* Stats KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Users</div>
          <div className="text-2xl font-bold text-foreground font-mono">{loading ? "…" : users.length}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Active Users</div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {loading ? "…" : users.filter((u) => u.status === "Active").length}
          </div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">User Roles</div>
          <div className="text-2xl font-bold text-foreground font-mono">{loading ? "…" : roles.length}</div>
        </div>
        <div className="bg-card p-4 sm:p-5 rounded-lg border border-border/50 shadow-xs">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Archived Users</div>
          <div className="text-2xl font-bold text-foreground font-mono">{loading ? "…" : archivedCount}</div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-xs border border-border/55 overflow-hidden">
        <div className="flex border-b border-border/50 overflow-x-auto overflow-y-hidden no-scrollbar bg-muted/5 gap-1">
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-2 px-5 py-4 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap -mb-px",
              activeTab === "users"
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50 bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/5"
            )}
          >
            <UserIcon className="w-3.5 h-3.5" />
            Users
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={cn(
              "flex items-center gap-2 px-5 py-4 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap -mb-px",
              activeTab === "roles"
                ? "border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50 bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/5"
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            Roles & Permissions
          </button>
        </div>

        {activeTab === "users" && (
          <>
            <div className="p-5 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All Users</h2>
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 rounded-lg transition-colors border border-border/50 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Users
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input
                  type="text"
                  placeholder="Search by username, name, or email..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setUsersPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-border/60 bg-muted/20 hover:bg-muted/40 focus:bg-card rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-foreground transition-all"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">User ID</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-32 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 bg-card">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground text-xs italic">Loading users…</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        <UsersIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="font-semibold text-xs">No users available</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr key={user.id} className="group hover:bg-muted/20 dark:hover:bg-zinc-900/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-foreground">{user.username || "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground font-medium">{user.fullName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">{user.email || "—"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground font-medium">{user.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-semibold",
                            user.status === "Active" ? "text-emerald-650 dark:text-emerald-500" : "text-muted-foreground"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              user.status === "Active" ? "bg-emerald-500" : "bg-zinc-400"
                            )} />
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">{user.lastLogin}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {canManageTargetUser(user) ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <ProtectedAction module="User Management" action="Edit">
                                <button
                                  type="button"
                                  className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                  title="Edit"
                                  onClick={() => {
                                    setEditError(null);
                                    setEditingUser(user);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </ProtectedAction>
                              {user.id !== session?.user_id && (
                                <>
                                  <ProtectedAction module="User Management" action="Delete">
                                    <button
                                      type="button"
                                      className="p-1.5 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                      onClick={() => setUserToArchive(user)}
                                      title="Archive"
                                    >
                                      <Archive className="h-3.5 w-3.5" />
                                    </button>
                                  </ProtectedAction>
                                  <ProtectedAction module="User Management" action="Delete">
                                    <button
                                      type="button"
                                      className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                                      onClick={() => setUserToTrash(user)}
                                      title="Move to Trash"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </ProtectedAction>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase">No access</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <OrdersStyleTablePagination
              itemCount={filteredUsers.length}
              currentPage={usersPage}
              itemsPerPage={usersPerPage}
              onPageChange={setUsersPage}
              onItemsPerPageChange={(val) => {
                setUsersPerPage(val);
                setUsersPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </>
        )}

        {activeTab === "roles" && (
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">User Roles</h2>
              <ProtectedAction module="Role Permissions" action="Add">
                <button
                  type="button"
                  onClick={() => {
                    setRoleFormError(null);
                    setIsAddRoleModalOpen(true);
                  }}
                  disabled={!canManageAccounts}
                  className="flex items-center gap-2 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors border border-border/50 shadow-xs disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Role
                </button>
              </ProtectedAction>
            </div>
            {loading ? (
              <p className="text-muted-foreground text-center py-8 text-xs italic">Loading roles…</p>
            ) : roles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-xs italic">No roles yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedRoles.map((role) => {
                  const roleNameLower = (role.name || "").trim().toLowerCase();
                  const roleLevel = getRoleLevel(role.name);
                  const CORE_ROLES = ["system administrator", "super admin", "administrator", "manager", "sales staff", "cashier"];
                  const isCoreRole = CORE_ROLES.includes(roleNameLower);
                  const isCurrentUsersRole = roleNameLower === currentRole;
                  const rolePermissions = session?.permissions?.["Role Permissions"] || session?.permissions?.["role permissions"] || [];
                  const userMgmtPermissions = session?.permissions?.["User Management"] || session?.permissions?.["user management"] || [];
                  const hasRoleDeletePerm = isRootAdmin || isSystemAdmin || rolePermissions.some((a: string) => ["delete"].includes(a.toLowerCase())) || userMgmtPermissions.some((a: string) => ["delete"].includes(a.toLowerCase()));
                  const hasRoleEditPerm = isRootAdmin || isSystemAdmin || rolePermissions.some((a: string) => ["edit", "add"].includes(a.toLowerCase())) || userMgmtPermissions.some((a: string) => ["edit", "add"].includes(a.toLowerCase()));

                  const isRoleEditable = isRootAdmin
                    ? true
                    : isSystemAdmin
                      ? !isCurrentUsersRole && hasRoleEditPerm
                      : isAdministrator
                        ? roleLevel < 60 && hasRoleEditPerm
                        : false;
                  const isRoleDeletable = (
                    isRootAdmin
                      ? true
                      : isSystemAdmin
                        ? !isCurrentUsersRole && hasRoleDeletePerm
                        : isAdministrator
                          ? roleLevel < 60 && hasRoleDeletePerm
                          : false
                  ) && role.userCount === 0;

                  return (
                    <div
                      key={role.id}
                      className="border border-border/50 rounded-xl p-4 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors bg-card/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-bold text-xs text-foreground uppercase">{role.name}</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isCurrentUsersRole && (
                            <span className="px-2 py-0.5 border border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded text-[9px] font-bold uppercase tracking-wider">
                              Your Role
                            </span>
                          )}
                          {isCoreRole && (
                            <span className="px-2 py-0.5 border border-primary/25 bg-primary/5 text-primary rounded text-[9px] font-bold uppercase tracking-wider">
                              System Role
                            </span>
                          )}
                          <span className="px-2 py-0.5 border border-border/50 text-muted-foreground rounded text-[10px] font-mono font-bold">
                            {role.userCount} users
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground/80 mb-3 truncate">
                         {role.permissions && Object.keys(role.permissions).length > 0
                           ? Object.keys(role.permissions).join(", ")
                           : "—"}
                      </p>
                      <div className="flex gap-4 border-t border-border/50 pt-3 mt-3">
                        {isRoleEditable && (
                          <ProtectedAction module="Role Permissions" action="Edit">
                            <button
                              type="button"
                              className="text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                              disabled={!canManageAccounts}
                              onClick={() => {
                                setEditRoleError(null);
                                setEditingRole(role);
                              }}
                            >
                              Edit
                            </button>
                          </ProtectedAction>
                        )}
                        <button
                          type="button"
                          className="text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                          onClick={() => setViewUsersForRole(role)}
                        >
                          View Users
                        </button>
                        {isRoleDeletable && (
                          <div className="ml-auto flex items-center gap-3">
                            <ProtectedAction module="Role Permissions" action="Delete">
                              <button
                                type="button"
                                className="text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 cursor-pointer flex items-center gap-1"
                                disabled={!canManageAccounts}
                                onClick={() => handleRoleArchiveClick(role)}
                                title={role.userCount > 0 ? `Cannot archive role while ${role.userCount} user(s) are assigned` : "Archive this role (moves to Archive module)"}
                              >
                                <Archive className="w-3.5 h-3.5" />
                                Archive
                              </button>
                            </ProtectedAction>
                            <ProtectedAction module="Role Permissions" action="Delete">
                              <button
                                type="button"
                                className="text-xs font-bold uppercase tracking-wider text-red-650 hover:text-red-700 cursor-pointer flex items-center gap-1"
                                disabled={!canManageAccounts}
                                onClick={() => handleRoleDeleteClick(role)}
                                title={role.userCount > 0 ? `Cannot delete role while ${role.userCount} user(s) are assigned` : "Delete this role"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </ProtectedAction>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <OrdersStyleTablePagination
              itemCount={roles.length}
              currentPage={rolesPage}
              itemsPerPage={rolesPerPage}
              onPageChange={setRolesPage}
              onItemsPerPageChange={(val) => {
                setRolesPerPage(val);
                setRolesPage(1);
              }}
              pageSizeOptions={[4, 6, 10, 20]}
            />
          </div>
        )}
      </div>
      
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={closeAddUserModal}
        onAddUser={handleAddUser}
        roleNames={roleNames}
        roles={roles}
        error={userFormError}
        saving={savingUser}
      />
      <AddRoleModal
        isOpen={isAddRoleModalOpen}
        onClose={() => {
          setIsAddRoleModalOpen(false);
          setRoleFormError(null);
        }}
        onAddRole={handleAddRole}
        error={roleFormError}
        saving={savingRole}
      />

      <EditUserModal
        isOpen={editingUser !== null}
        user={editingUser}
        onClose={closeEditModal}
        onSave={handleSaveEditUser}
        roleNames={
          editingUser && !roleNames.includes(editingUser.role)
            ? [...roleNames, editingUser.role]
            : roleNames
        }
        roles={roles}
        error={editError}
        saving={savingEdit}
      />
      <EditRoleModal
        isOpen={editingRole !== null}
        role={editingRole}
        onClose={closeEditRoleModal}
        onSave={handleSaveEditRole}
        error={editRoleError}
        saving={savingEditRole}
      />
      <ViewRoleUsersModal
        isOpen={viewUsersForRole !== null}
        onClose={() => setViewUsersForRole(null)}
        roleName={viewUsersForRole?.name ?? ""}
        users={viewUsersForRole ? users.filter((u) => u.role === viewUsersForRole.name) : []}
      />

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Users"
        filename={`InvenSight_Users_${new Date().toISOString().split('T')[0]}`}
        data={users.map(u => ({
          id: u.id,
          "Employee ID": u.employeeId,
          "Username": u.username,
          "Full Name": u.fullName,
          "Email": u.email,
          "Role": u.role,
          "Status": u.status,
          "Last Login": u.lastLogin
        }))}
      />
      <ArchiveConfirmationModal
        isOpen={userToArchive !== null}
        onClose={() => setUserToArchive(null)}
        onConfirm={confirmArchiveUser}
        title="Archive User"
        itemName={userToArchive?.fullName}
        message="Archive this user? They will be moved to the Archive module and can be restored later."
        isArchiving={isArchivingUser}
        confirmText="Archive"
        confirmLoadingText="Archiving..."
        icon={<Archive className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />}
      />

      <ArchiveConfirmationModal
        isOpen={userToTrash !== null}
        onClose={() => setUserToTrash(null)}
        onConfirm={confirmTrashUser}
        title="Move User to Deleted Folder"
        itemName={userToTrash?.fullName}
        message="Move this user to the Deleted Folder? They will be retained for 30 days before permanent deletion."
        isArchiving={isTrashingUser}
        confirmText="Move to Trash"
        confirmLoadingText="Moving to Trash..."
        confirmButtonClassName="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
        icon={<Trash2 className="w-6 h-6 text-red-650 dark:text-red-500" />}
      />

      <ArchiveConfirmationModal
        isOpen={roleToArchive !== null}
        onClose={() => setRoleToArchive(null)}
        onConfirm={confirmArchiveRole}
        title="Archive Role"
        itemName={roleToArchive?.name}
        message={`Move role "${roleToArchive?.name}" to the Archive module? You can restore it later from the Archive page.`}
        isArchiving={isArchivingRole}
        confirmText="Archive Role"
        confirmLoadingText="Archiving..."
        icon={<Archive className="w-6 h-6 text-amber-600 dark:text-amber-500" />}
      />

      <ArchiveConfirmationModal
        isOpen={roleToTrash !== null}
        onClose={() => setRoleToTrash(null)}
        onConfirm={confirmDeleteRole}
        title="Delete Role"
        itemName={roleToTrash?.name}
        message={`Are you sure you want to permanently delete role "${roleToTrash?.name}"? This action cannot be undone.`}
        isArchiving={isTrashingRole}
        confirmText="Delete Role"
        confirmLoadingText="Deleting Role..."
        confirmButtonClassName="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
        icon={<Trash2 className="w-6 h-6 text-red-650 dark:text-red-500" />}
      />
    </div>
  );
}
