import { Users, Shield, Settings, Activity, UserCheck, UserX, Clock, ArrowUpRight, Plus } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { AddUserModal } from "../modals/AddUserModal";
import { AddRoleModal } from "../modals/AddRoleModal";
import { PermissionsModal } from "../modals/PermissionsModal";

export function UserManagement() {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [roleCount, setRoleCount] = useState(0);

  const handleAddUser = (user: { username: string; fullName: string; password: string; role: string }) => {
    console.log('Adding user:', user);
    setUserCount(prev => prev + 1);
  };

  const handleAddRole = (role: { name: string; permissions: string }) => {
    console.log('Adding role:', role);
    setRoleCount(prev => prev + 1);
  };

  const handleSavePermissions = (permissions: Record<string, string[]>) => {
    console.log('Saving permissions:', permissions);
  };
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage users, roles, and system access with comprehensive audit trails</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                console.log('Add User button clicked');
                alert('Button clicked!');
                setIsAddUserModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
            <button
              onClick={() => setIsAddRoleModalOpen(true)}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Add Role
            </button>
            <button
              onClick={() => setIsPermissionsModalOpen(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Permissions
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Users</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{userCount}</div>
          <div className="text-sm text-gray-500 mt-1">Active accounts</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Active Sessions</span>
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <div className="text-sm text-gray-500 mt-1">Currently logged in</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">User Roles</span>
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{roleCount}</div>
          <div className="text-sm text-gray-500 mt-1">Defined roles</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Audit Logs</span>
            <Activity className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <div className="text-sm text-gray-500 mt-1">Recent activities</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/users" className="block group">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-blue-500 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Users & Roles
                  </h3>
                  <p className="text-sm text-gray-500">Access Control Management</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="text-gray-600 mb-4">
              Manage user accounts, assign roles, and configure permissions with role-based access control for secure system operations.
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-600" />
                <span>Create and manage user accounts</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Define roles and permissions</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span>Configure access controls</span>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/audit-log" className="block group">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 hover:border-orange-500 transition-all hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Activity className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    Audit Log
                  </h3>
                  <p className="text-sm text-gray-500">System Activity Tracking</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
            </div>
            <p className="text-gray-600 mb-4">
              Comprehensive audit trail of all system activities, tracking user actions, data changes, and security events for compliance.
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Track all user activities</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-600" />
                <span>Monitor system events</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span>Security and compliance logs</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="flex items-center justify-center py-8 text-gray-400">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No recent activities</p>
            <p className="text-sm text-gray-400 mt-1">User actions will appear here</p>
          </div>
        </div>
      </div>
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onAddUser={handleAddUser}
      />

      <AddRoleModal
        isOpen={isAddRoleModalOpen}
        onClose={() => setIsAddRoleModalOpen(false)}
        onAddRole={handleAddRole}
      />

      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        onSave={handleSavePermissions}
      />
    </div>
  );
}
