const STORAGE_KEY = "invensight_session";
const ACTIVITY_KEY = "invensight_last_activity";
const TIMEOUT_KEY = "invensight_session_timeout";

export const DEFAULT_TIMEOUT_BY_ROLE: Record<string, number> = {
  "cashier": 15,
  "sales staff": 15,
  "warehouse staff": 30,
  "manager": 60,
  "administrator": 120,
  "system administrator": 120,
  "system_administrator": 120,
  "super admin": 120,
  "super_admin": 120,
  "admin": 120,
};

export interface SessionUser {
  user_id: number;
  username: string;
  full_name: string;
  employee_id: number;
  role: string;
  email?: string | null;
  permissions?: Record<string, string[]>;
  is_root_admin?: boolean;
  avatar_url?: string | null;
  session_token?: string | null;
}

export function getSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionUser;
    if (typeof data?.user_id !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser): void {
  // Always mark activity when session is set or refreshed
  setLastActivity();

  try {
    const sessionUser = { ...user };
    // Prevent excessively large (>500KB) data URIs from exhausting the 5MB browser sessionStorage quota
    if (sessionUser.avatar_url && sessionUser.avatar_url.startsWith("data:") && sessionUser.avatar_url.length > 500000) {
      sessionUser.avatar_url = null;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
  } catch (err) {
    // If quota exceeded or storage blocked, clear non-critical data and save minimal session
    try {
      sessionStorage.removeItem("invensight_last_route");
      const minimalUser: SessionUser = {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        employee_id: user.employee_id,
        role: user.role,
        email: user.email,
        permissions: user.permissions,
        is_root_admin: user.is_root_admin,
        session_token: user.session_token,
        avatar_url: user.avatar_url,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(minimalUser));
    } catch (innerErr) {
      console.error("Storage error while setting session:", innerErr);
    }
  }
  // Ensure no persistent storage leaks across browser closures
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem("invensight_last_route");
  localStorage.removeItem(ACTIVITY_KEY);
  localStorage.removeItem(TIMEOUT_KEY);
  localStorage.removeItem("invensight_active_tabs");
}

export function getLastActivity(): number {
  try {
    const val = localStorage.getItem(ACTIVITY_KEY);
    const parsed = val ? parseInt(val, 10) : NaN;
    return !isNaN(parsed) && parsed > 0 ? parsed : Date.now();
  } catch {
    return Date.now();
  }
}

export function setLastActivity(): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
  } catch {}
}

export function getStoredTimeout(): number | null {
  try {
    const val = localStorage.getItem(TIMEOUT_KEY);
    if (val === null || val === undefined || val === "") return null;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

export function setStoredTimeout(minutes: number): void {
  try {
    localStorage.setItem(TIMEOUT_KEY, minutes.toString());
  } catch {}
}

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem("invensight_device_id");
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
      localStorage.setItem("invensight_device_id", id);
    }
    return id;
  } catch {
    return "unknown_device";
  }
}
