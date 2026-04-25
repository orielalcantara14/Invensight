import React, { type ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { getSession, clearSession } from "@/auth/session";
import { api } from "@/services/api";

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const session = getSession();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!session) {
        setIsVerifying(false);
        setIsValid(false);
        return;
      }
      try {
        await api.verifySession(session.user_id);
        setIsValid(true);
      } catch {
        clearSession();
        setIsValid(false);
      } finally {
        setIsVerifying(false);
      }
    };
    verify();
  }, [session]);

  if (isVerifying) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-muted/50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
