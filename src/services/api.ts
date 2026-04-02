const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Product {
  product_id: number;
  product_name: string;
  unit_price: number;
  pos_price?: number;
  sku: string;
  image_url: string;
  category_name: string;
  category_id: number;
  supplier_name?: string;
  unit_of_measurement?: string;
  quantity?: number;
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
  image_url: string;
  price_modified: boolean;
  category_id: number | null;
  specific_category?: string;
  supplier_id: number | null;
  supplier_name?: string;
  unit_of_measurement?: string;
  category: string;
  stock: number;
  unit_price: number;
  pos_price: number;
  status: "Active" | "Archived";
  reorder_level: number;
  date_added: string | null;
}

export interface PosProductPayload {
  sku: string;
  product_name: string;
  image_url: string | null;
  category_id: number | null;
  specific_category?: string;
  supplier_id: number | null;
  unit_price: number;
  pos_price?: number;
  unit_of_measurement?: string;
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
  customer_name?: string;
  contact_number?: string;
  address?: string;
  payment_method: string;
  cash_received: number;
  items: CartItemPayload[];
  service_charge: number;
  paymongo_source_id?: string;
}

export interface PayMongoSourcePayload {
  amount: number; // in centavos
  type: "gcash";
  currency: "PHP";
  description: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

export interface PayMongoPaymentIntentPayload {
  amount: number; // in centavos
  currency: "PHP";
  payment_method_allowed: string;
  customer_name?: string;
  customer_phone?: string;
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

async function requestAsActor<T>(
  actorUserId: number,
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Actor-User-Id": String(actorUserId),
      ...(options?.headers as Record<string, string> | undefined),
    },
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
  permissions_json?: Record<string, string[]>;
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
  permissions?: Record<string, string[]>;
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

export interface Supplier {
  supplier_id: number;
  supplier_name: string;
  address: string | null;
  email: string | null;
  contact_number: string | null;
  product_supplied: string | null;
  total_orders: number;
  status: string;
}

export interface SupplierPayload {
  supplier_name: string;
  address: string | null;
  email: string | null;
  contact_number: string | null;
  product_supplied: string | null;
  status: string;
}

export interface InventoryItem {
  inventory_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  category_id?: number | null;
  category_name: string;
  specific_category?: string | null;
  unit_of_measurement?: string | null;
  supplier_name?: string | null;
  quantity: number;
  expected: number;
  actual: number;
  reorder_level: number;
  unit_price: number;
  status: 'Normal' | 'Low' | 'Critical';
  last_updated: string;
  reason_adjustment: string;
}

export interface InventoryPayload {
  product_name: string;
  sku: string;
  supplier_name?: string | null;
  category_id?: number | null;
  specific_category?: string | null;
  unit_of_measurement?: string | null;
  quantity: number;
  expected: number;
  reorder_level: number;
}

export interface UpdateInventoryPayload {
  product_name: string;
  sku: string;
  supplier_name?: string | null;
  category_id?: number | null;
  specific_category?: string | null;
  unit_of_measurement?: string | null;
  quantity: number;
  expected: number;
  reorder_level: number;
  actual: number;
  reason_adjustment: string;
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
  address: string | null;
  employee_id: number;
  created_date: string | null;
  last_login: string | null;
  password_changed_at: string | null;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  email?: string | null;
  address?: string | null;
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

export interface AuditLogEntry {
  log_id: number;
  user_id: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id: number;
  timestamp: string;
  details: string | null;
}

export interface TopProductItem {
  name: string;
  units_sold: number;
  current_stock: number;
  status: string;
}

export interface DashboardStats {
  total_revenue: number;
  total_transactions: number;
  completed_sales: number;
  failed_payments: number;
  sales_performance: Array<{ label: string; revenue: number; transactions: number }>;
  sales_trend: Array<{ month: string; actual_sales: number; forecast_sales: number }>;
  sales_by_category: Array<{ category: string; value: number; percentage: number }>;
  top_products: TopProductItem[];
}

export const api = {
  getDashboardStats: (view?: string) => request<DashboardStats>(`/api/dashboard/stats${view ? `?view=${view}` : ""}`),
  getProducts: () => request<Product[]>("/api/products"),
  getCategories: () => request<Category[]>("/api/categories"),
  createCategory: (payload: { category_name: string; is_active: boolean }) =>
    request<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCategory: (
    categoryId: number,
    payload: { category_name: string; is_active: boolean }
  ) =>
    request<Category>(`/api/categories/${categoryId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCategory: (categoryId: number) =>
    request<{ message: string }>(`/api/categories/${categoryId}`, {
      method: "DELETE",
    }),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<{ url: string }>;
    });
  },
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
  deletePosProduct: (posId: number) =>
    request<{ ok: boolean }>(`/api/pos-products/${posId}`, {
      method: "DELETE",
    }),
  createSale: (payload: CreateSalePayload) =>
    request<SaleResult>("/api/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSales: () => request<{ sales: import("@/types").SaleRecord[] }>("/api/sales"),
  getSale: (invoiceId: number) => request<import("@/types").SaleDetail>(`/api/sales/${invoiceId}`),

  createPayMongoSource: (payload: PayMongoSourcePayload) =>
    request<{ data: any }>("/api/paymongo/create-source", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPayMongoSource: (sourceId: string) =>
    request<{ data: any }>(`/api/paymongo/source/${sourceId}`),

  createPayMongoPaymentIntent: (payload: PayMongoPaymentIntentPayload) =>
    request<{ data: any }>("/api/paymongo/create-payment-intent", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPayMongoPaymentIntent: (paymentIntentId: string) =>
    request<{ data: any }>(`/api/paymongo/payment-intent/${paymentIntentId}`),

  getUsers: () => request<ApiUser[]>("/api/users"),
  getUserManagementStats: (actorUserId: number) =>
    requestAsActor<UserManagementStats>(actorUserId, "/api/user-management-stats"),
  getAuditLogs: (actorUserId: number) =>
    requestAsActor<AuditLogEntry[]>(actorUserId, "/api/audit-logs"),
  createUser: (payload: CreateUserPayload, actorUserId: number) =>
    requestAsActor<ApiUser>(actorUserId, "/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateUser: (userId: number, payload: UpdateUserPayload, actorUserId: number) =>
    requestAsActor<ApiUser>(actorUserId, `/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deactivateUser: (userId: number, actorUserId: number) =>
    requestAsActor<{ ok: boolean }>(actorUserId, `/api/users/${userId}`, {
      method: "DELETE",
    }),

  getRoles: () => request<ApiRole[]>("/api/roles"),
  createRole: (payload: CreateRolePayload, actorUserId: number) =>
    requestAsActor<ApiRole>(actorUserId, "/api/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRole: (roleId: number, payload: UpdateRolePayload, actorUserId: number) =>
    requestAsActor<ApiRole>(actorUserId, `/api/roles/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteRole: (roleId: number, actorUserId: number) =>
    requestAsActor<{ ok: boolean }>(actorUserId, `/api/roles/${roleId}`, {
      method: "DELETE",
    }),

  getSuppliers: () => request<Supplier[]>("/api/suppliers"),
  createSupplier: (payload: SupplierPayload) =>
    request<Supplier>("/api/suppliers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateSupplier: (supplierId: number, payload: SupplierPayload) =>
    request<Supplier>(`/api/suppliers/${supplierId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteSupplier: (supplierId: number) =>
    request<{ message: string }>(`/api/suppliers/${supplierId}`, {
      method: "DELETE",
    }),

  getInventoryItems: () => request<InventoryItem[]>("/api/inventory/"),
  addInventoryItem: (payload: InventoryPayload) =>
    request<InventoryItem>("/api/inventory/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateInventoryItem: (inventoryId: number, payload: UpdateInventoryPayload) =>
    request<InventoryItem>(`/api/inventory/${inventoryId}/`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteInventoryItem: (inventoryId: number) =>
    request<{ message: string }>(`/api/inventory/${inventoryId}/`, {
      method: "DELETE",
    }),

  login: (payload: LoginPayload) =>
    request<LoginResult>("/api/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  verifySession: (userId: number) =>
    requestWithUser<{ ok: boolean; user: any }>(userId, "/api/auth/verify"),

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
