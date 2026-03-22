const STORAGE_KEY = "invensight_session";

export interface SessionUser {
  user_id: number;
  username: string;
  full_name: string;
  employee_id: number;
  role: string;
  email?: string | null;
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
}
