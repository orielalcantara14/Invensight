import { Search, Download, Plus, Shield, User as UserIcon, Users as UsersIcon, Pencil, Archive } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { AddUserModal } from "../modals/AddUserModal";
import { AddRoleModal } from "../modals/AddRoleModal";
import { EditRoleModal } from "../modals/EditRoleModal";
import { EditUserModal } from "../modals/EditUserModal";
import { ViewRoleUsersModal } from "../modals/ViewRoleUsersModal";
import { ExportPreviewModal } from "../modals/ExportPreviewModal";
import type { User, Role } from "@/types";
import { api, type ApiUser, type ApiRole, type UpdateUserPayload } from "@/services/api";
import { getSession } from "@/auth/session";

function mapApiUser(u: ApiUser): User {
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    employeeId: `EMP-${String(u.employee_id).padStart(4, "0")}`,
    email: u.email ?? "",
    role: u.role,
    status: u.is_active ? "Active" : "Inactive",
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
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<Record<string, string[]>>({});
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
  const [pendingNewUser, setPendingNewUser] = useState<PendingNewUser | null>(null);
  const [savingPermissionsStep, setSavingPermissionsStep] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const session = getSession();
  const currentRole = (session?.role ?? "").trim().toLowerCase();
  const isRootAdmin = (session?.username ?? "").trim().toLowerCase() === "rootadminnginamo";
  const isAdministrator = currentRole === "administrator";
  const isSuperAdmin = currentRole === "super admin";
  const canManageAccounts = isRootAdmin || isAdministrator || isSuperAdmin;

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
      const newUser = await api.createUser({
        username: user.username.trim(),
        full_name: user.fullName.trim(),
        email: user.email.trim() || null,
        password: user.password,
        role: user.role,
        permissions: user.permissions || {},
        is_active: user.status === "Active",
      }, session.user_id);
      
      // Do NOT close modal here; AddUserModal handles its own success step (Step 3)
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
      setEditError(e instanceof Error ? e.message : "Failed to update user");
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

  const handleDeleteRole = async (role: Role) => {
    if (!window.confirm(`Archive role "${role.name}"? This will restrict its use but keep historical data.`)) {
      return;
    }
    try {
      if (!session?.user_id) {
        setListError("Session is missing actor context. Please sign in again.");
        return;
      }
      await api.deleteRole(role.id, session.user_id);
      await refreshData();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to delete role");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("Archive this user? They will be moved to the Archive module and can be restored later.")) {
      return;
    }
    try {
      if (!session?.user_id) {
        setListError("Session is missing actor context. Please sign in again.");
        return;
      }
      await api.deleteUser(userId, session.user_id);
      await refreshData();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Failed to delete user");
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();
    return (
      String(user.id).includes(q) ||
      user.username?.toLowerCase().includes(q) ||
      user.fullName?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.employeeId?.toLowerCase().includes(q)
    );
  });

  const allowedCreateRoleKeys = isRootAdmin
    ? ["administrator", "manager", "sales staff", "cashier", "super admin"]
    : isSuperAdmin
      ? ["administrator", "manager", "sales staff", "cashier"]
      : isAdministrator
        ? ["manager", "sales staff", "cashier"]
        : [];
  const roleNames = roles
    .filter((r) => allowedCreateRoleKeys.includes(r.name.trim().toLowerCase()))
    .map((r) => r.name);
  const inactiveCount = users.filter((u) => u.status === "Inactive").length;
  const canManageTargetUser = (user: User) => {
    if (isRootAdmin) return true;
    const roleKey = (user.role ?? "").trim().toLowerCase();
    if (isSuperAdmin) {
      return ["administrator", "manager", "sales staff", "cashier"].includes(roleKey);
    }
    if (!isAdministrator) return false;
    return ["manager", "sales staff", "cashier"].includes(roleKey);
  };

  return (
    <div className="p-8">
      {listError ? (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage users and role-based access control</p>
          </div>
          <button
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="text-sm text-muted-foreground mb-1">Total Users</div>
          <div className="text-2xl font-bold text-foreground">{loading ? "…" : users.length}</div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="text-sm text-muted-foreground mb-1">Active Users</div>
          <div className="text-2xl font-bold text-foreground">
            {loading ? "…" : users.filter((u) => u.status === "Active").length}
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="text-sm text-muted-foreground mb-1">User Roles</div>
          <div className="text-2xl font-bold text-foreground">{loading ? "…" : roles.length}</div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <div className="text-sm text-muted-foreground mb-1">Inactive Users</div>
          <div className="text-2xl font-bold text-foreground">{loading ? "…" : inactiveCount}</div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow border border-border">
        <div className="border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "users"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Users
              </div>
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === "roles"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Roles & Permissions
              </div>
            </button>
          </div>
        </div>

        {activeTab === "users" && (
          <>
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-foreground">All Users</h2>
                  {/* Selection counter removed */}
                </div>
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export Users
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground/70" />
                <input
                  type="text"
                  placeholder="Search by username, name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      {/* Header checkbox removed */}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Full Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                        Loading users…
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <UsersIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-muted-foreground font-medium">No users available</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Add users to manage system access</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Row selection handled in Export Wizard */}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {user.username || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{user.fullName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {user.email || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{user.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.lastLogin}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {canManageTargetUser(user) ? (
                            <>
                              <button
                                type="button"
                                className="mr-2 inline-flex items-center justify-center rounded p-1 text-primary hover:bg-primary/10 hover:text-blue-900"
                                title="Edit user"
                                onClick={() => {
                                  setEditError(null);
                                  setEditingUser(user);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {user.id !== session?.user_id && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-900 font-medium text-sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  title="Archive user (moves to Archive)"
                                >
                                  <Archive className="h-4 w-4" />
                                  Archive
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground/70">No access</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "roles" && (
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">User Roles</h2>
              <button
                type="button"
                onClick={() => {
                  setRoleFormError(null);
                  setIsAddRoleModalOpen(true);
                }}
                disabled={!canManageAccounts}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Role
              </button>
            </div>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading roles…</p>
            ) : roles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No roles yet. Add a role to get started.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="border border-border rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">{role.name}</h3>
                      </div>
                      <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                        {role.userCount} users
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 text-ellipsis overflow-hidden break-words line-clamp-2">
                       {role.permissions && Object.keys(role.permissions).length > 0
                         ? Object.keys(role.permissions).join(", ")
                         : "—"}
                    </p>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        className="text-sm font-medium text-primary hover:text-blue-800"
                        disabled={!canManageAccounts}
                        onClick={() => {
                          setEditRoleError(null);
                          setEditingRole(role);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => setViewUsersForRole(role)}
                      >
                        View Users
                      </button>
                      <button
                        type="button"
                        className="text-sm font-medium text-orange-600 hover:text-orange-800"
                        disabled={!canManageAccounts}
                        onClick={() => handleDeleteRole(role)}
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          "Last Login": u.lastLogin // Used for date filtering inside modal
        }))}
      />
    </div>
  );
}
