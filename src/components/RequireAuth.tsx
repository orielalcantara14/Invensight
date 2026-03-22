import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { getSession } from "@/auth/session";

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!getSession()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
