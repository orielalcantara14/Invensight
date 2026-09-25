import React from "react";
import { BaseModal } from "./BaseModal";
import { User as UserIcon } from "lucide-react";
import type { User } from "@/types";

interface ViewRoleUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleName: string;
  users: User[];
}

export function ViewRoleUsersModal({
  isOpen,
  onClose,
  roleName,
  users,
}: ViewRoleUsersModalProps) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={`Users — ${roleName}`} maxWidth="lg">
      <p className="mb-4 text-sm text-muted-foreground">
        Accounts assigned the <span className="font-medium text-foreground">{roleName}</span> role.
      </p>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <UserIcon className="mb-2 h-10 w-10 text-gray-300" />
          <p className="font-medium text-muted-foreground">No users with this role</p>
          <p className="mt-1 text-sm text-muted-foreground">Assign this role when adding or editing a user.</p>
        </div>
      ) : (
        <div className="max-h-[min(60vh,420px)] overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Full name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.id}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                    {u.username || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{u.fullName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.status === "Active"
                          ? "bg-green-100 text-green-800"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex justify-end border-t border-border pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Close
        </button>
      </div>
    </BaseModal>
  );
}
