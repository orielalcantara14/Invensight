const STORAGE_KEY = "invensight_session";
const ACTIVITY_KEY = "invensight_last_activity";
const TIMEOUT_KEY = "invensight_session_timeout";

export interface SessionUser {
  user_id: number;
  username: string;
  full_name: string;
  employee_id: number;
  role: string;
  email?: string | null;
  permissions?: Record<string, string[]>;
}

export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionUser;
    if (typeof data?.user_id !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
  localStorage.removeItem(TIMEOUT_KEY);
}

export function getLastActivity(): number {
  const val = localStorage.getItem(ACTIVITY_KEY);
  return val ? parseInt(val) : Date.now();
}

export function setLastActivity(): void {
  localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
}

export function getStoredTimeout(): number {
  const val = localStorage.getItem(TIMEOUT_KEY);
  return val ? parseInt(val) : 0;
}

export function setStoredTimeout(minutes: number): void {
  localStorage.setItem(TIMEOUT_KEY, minutes.toString());
}
