import { getSession } from "@/auth/session";
import React from "react";

interface ProtectedActionProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on whether the current user 
 * has the specified permission for the given module.
 */
export function ProtectedAction({
  module,
  action,
  children,
  fallback = null,
}: ProtectedActionProps) {
  const session = getSession();
  
  // Root Admin has all permissions bypass
  const isRootAdmin = session?.username?.toLowerCase() === "rootadminnginamo";
  if (isRootAdmin) return <>{children}</>;

  const moduleKey = module.trim();
  const actionKey = action.trim().toLowerCase();

  const userPermissions = session?.permissions || {};
  const moduleActions = userPermissions[moduleKey] || [];
  
  const hasPermission = moduleActions.some(
    (a) => a.toLowerCase() === actionKey
  );

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
