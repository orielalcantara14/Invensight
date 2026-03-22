const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Product {
  product_id: number;
  product_name: string;
  unit_price: number;
  sku: string;
  description: string;
  image_url: string;
  category_name: string;
  category_id: number;
}

export interface Category {
  category_id: number;
  category_name: string;
}

export interface Terminal {
  terminal_id: number;
  terminal_name: string;
  location: string;
}

export interface PosProduct {
  pos_id: number;
  product_id: number;
  sku: string;
  product_name: string;
  description: string;
  image_url: string;
  price_modified: boolean;
  category_id: number | null;
  category: string;
  stock: number;
  pos_price: number;
  status: "Active" | "Archived";
}

export interface PosProductPayload {
  sku: string;
  product_name: string;
  description: string;
  image_url: string | null;
  category_id: number | null;
  pos_price: number;
  stock: number;
  status: "Active" | "Archived";
}

export interface CartItemPayload {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreateSalePayload {
  pos_terminal_id: number;
  user_id: number;
  customer_info: string;
  cash_received: number;
  items: CartItemPayload[];
  service_charge: number;
}

export interface SaleResult {
  invoice_id: number;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  cash_received: number;
  change: number;
  transaction_timestamp: string;
}

function formatApiError(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item !== null && "msg" in item
          ? String((item as { msg: string }).msg)
          : JSON.stringify(item)
      )
      .join("; ");
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: string }).message);
  }
  return "Request failed";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(formatApiError(err.detail));
  }
  return res.json() as Promise<T>;
}

async function requestWithUser<T>(
  userId: number,
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(userId),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(formatApiError(err.detail));
  }
  return res.json() as Promise<T>;
}

export interface ApiUser {
  id: number;
  username: string;
  full_name: string;
  employee_id: number;
  role: string;
  is_active: boolean;
  last_login: string | null;
  email?: string | null;
}

export interface CreateUserPayload {
  username: string;
  full_name: string;
  password: string;
  role: string;
  permissions: Record<string, string[]>;
  email?: string | null;
  is_active?: boolean;
}

export interface UpdateUserPayload {
  username: string;
  full_name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  new_password?: string;
}

export interface ApiRole {
  id: number;
  name: string;
  permissions: string;
  user_count: number;
}

export interface CreateRolePayload {
  name: string;
  permissions: string;
}

export interface UpdateRolePayload {
  name: string;
  permissions: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

/** Matches `LoginResponse` from the API (snake_case). */
export interface LoginResult {
  user_id: number;
  username: string;
  full_name: string;
  employee_id: number;
  role: string;
  email?: string | null;
}

export interface Profile {
  user_id: number;
  username: string;
  full_name: string;
  email: string | null;
  role: string;
  phone: string | null;
  address: string | null;
  bio: string | null;
  employee_id: number;
  created_date: string | null;
  last_login: string | null;
  password_changed_at: string | null;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
}

export interface ProfileActivityItem {
  log_id: number;
  action: string;
  details: string | null;
  timestamp: string;
}

export interface UserManagementStats {
  active_sessions: number;
  audit_log_count: number;
}

export const api = {
  getProducts: () => request<Product[]>("/api/products"),
  getCategories: () => request<Category[]>("/api/categories"),
  getTerminals: () => request<Terminal[]>("/api/pos-terminals"),
  getPosProducts: () => request<PosProduct[]>("/api/pos-products"),
  createPosProduct: (payload: PosProductPayload) =>
    request<{ pos_id: number }>("/api/pos-products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updatePosProduct: (posId: number, payload: PosProductPayload) =>
    request<{ ok: boolean }>(`/api/pos-products/${posId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  updatePosProductStatus: (posId: number, status: "Active" | "Archived") =>
    request<{ ok: boolean }>(
      `/api/pos-products/${posId}/status?status=${encodeURIComponent(status)}`,
      {
        method: "PATCH",
      }
    ),
  deletePosProduct: (posId: number) =>
    request<{ ok: boolean }>(`/api/pos-products/${posId}`, {
      method: "DELETE",
    }),
  createSale: (payload: CreateSalePayload) =>
    request<SaleResult>("/api/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getUsers: () => request<ApiUser[]>("/api/users"),
  getUserManagementStats: () =>
    request<UserManagementStats>("/api/user-management-stats"),
  createUser: (payload: CreateUserPayload) =>
    request<ApiUser>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUser: (userId: number, payload: UpdateUserPayload) =>
    request<ApiUser>(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deactivateUser: (userId: number) =>
    request<{ ok: boolean }>(`/api/users/${userId}`, { method: "DELETE" }),

  getRoles: () => request<ApiRole[]>("/api/roles"),
  createRole: (payload: CreateRolePayload) =>
    request<ApiRole>("/api/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRole: (roleId: number, payload: UpdateRolePayload) =>
    request<ApiRole>(`/api/roles/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<LoginResult>("/api/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getProfile: (userId: number) =>
    requestWithUser<Profile>(userId, "/api/profile"),
  updateProfile: (userId: number, payload: ProfileUpdatePayload) =>
    requestWithUser<Profile>(userId, "/api/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  changePassword: (
    userId: number,
    payload: { current_password: string; new_password: string }
  ) =>
    requestWithUser<{ ok: boolean }>(userId, "/api/profile/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getProfileActivity: (userId: number, limit = 10) =>
    requestWithUser<ProfileActivityItem[]>(
      userId,
      `/api/profile/activity?limit=${encodeURIComponent(String(limit))}`
    ),
};
