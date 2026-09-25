import React, { type ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { getSession, clearSession, setSession, setLastActivity } from "@/auth/session";
import { api } from "@/services/api";
import { initTabTracker } from "@/utils/tabManager";

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
        const response = await api.verifySession(session.user_id);
        if (response && response.user) {
          const u = response.user;
          const current = getSession();
          if (
            !current ||
            current.full_name !== u.full_name ||
            current.email !== (u.email ?? null) ||
            current.role !== u.role ||
            current.avatar_url !== (u.avatar_url ?? null) ||
            JSON.stringify(current.permissions) !== JSON.stringify(u.permissions)
          ) {
            setSession({
              user_id: u.user_id,
              username: u.username,
              full_name: u.full_name,
              employee_id: u.employee_id,
              role: u.role,
              email: u.email ?? null,
              permissions: u.permissions,
              is_root_admin: u.is_root_admin,
              avatar_url: u.avatar_url ?? null,
            });
            window.dispatchEvent(new Event("invensight_profile_updated"));
          }
        }
        setLastActivity();
        setIsValid(true);
        // Pre-fetch system settings to populate localStorage for dynamic localization
        try {
          const sysSettings = await api.get<Record<string, string>>("/api/settings/system");
          if (sysSettings) {
            if (sysSettings.currency_symbol) localStorage.setItem("currency_symbol", sysSettings.currency_symbol);
            if (sysSettings.date_format) localStorage.setItem("date_format", sysSettings.date_format);
            if (sysSettings.pos_default_view) localStorage.setItem("pos_default_view", sysSettings.pos_default_view);
            if (sysSettings.pos_payment_methods) localStorage.setItem("pos_payment_methods", sysSettings.pos_payment_methods);
            if (sysSettings.tax_rate) localStorage.setItem("tax_rate", sysSettings.tax_rate);
            if (sysSettings.receipt_footer) localStorage.setItem("receipt_footer", sysSettings.receipt_footer);
            window.dispatchEvent(new Event("invensight_settings_updated"));
          }
        } catch (e) {
          console.error("Failed to pre-fetch system settings:", e);
        }
      } catch {
        clearSession();
        setIsValid(false);
      } finally {
        setIsVerifying(false);
      }
    };
    verify();
  }, [session?.user_id]);

  // Track active browser tabs and dispatch disconnect beacon when the last tab unloads
  useEffect(() => {
    if (!isValid || !session?.user_id) return;

    const cleanup = initTabTracker(() => {
      const current = getSession();
      if (current?.user_id) {
        api.sendDisconnectBeacon(current.user_id, current.session_token);
      }
    });

    return cleanup;
  }, [isValid, session?.user_id]);

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
