import React from "react";
import { Navigate } from "react-router";
import { getSession } from "@/auth/session";

interface ModuleGuardProps {
  module: string;
  children: React.ReactNode;
}

export function ModuleGuard({ module, children }: ModuleGuardProps) {
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Root Admin bypass
  if (session.is_root_admin) {
    return <>{children}</>;
  }

  const currentRole = (session.role ?? "").trim().toLowerCase();

  // Cashiers are restricted solely to POS terminal
  if (currentRole === "cashier") {
    if (module === "Sales") return <>{children}</>;
    return <Navigate to="/pos" replace />;
  }

  // Check view permission
  const userPermissions = session.permissions || {};
  const actions = userPermissions[module] || [];
  const hasView = actions.some((a) => a.toLowerCase() === "view");

  if (!hasView) {
    // Find first module they have "View" permission for to redirect safely
    const fallbackModule = Object.keys(userPermissions).find((m) =>
      userPermissions[m]?.some((a) => a.toLowerCase() === "view")
    );

    if (fallbackModule) {
      const pathMap: Record<string, string> = {
        "Dashboard": "/dashboard",
        "Sales": "/sales",
        "Inventory": "/inventory",
        "Products": "/products",
        "Suppliers": "/suppliers",
        "Orders": "/orders",
        "Supplier Returns": "/orders",
        "Customer Returns": "/orders",
        "Forecasting": "/forecasting",
        "Stock Prediction": "/stock-prediction",
        "Reports": "/reports",
        "User Management": "/users",
        "Role Permissions": "/users",
        "Mechanic Services": "/mechanics",
        "Audit Log": "/audit-log",
        "Archive": "/archive",
      };
      const fallbackPath = pathMap[fallbackModule];
      if (fallbackPath && fallbackPath !== `/${module.toLowerCase()}`) {
        return <Navigate to={fallbackPath} replace />;
      }
    }

    // Final fallback is profile page
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
