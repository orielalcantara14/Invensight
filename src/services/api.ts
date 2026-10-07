/// <reference types="vite/client" />
import { getSession, getDeviceId } from "@/auth/session";

const _env_api_url = (import.meta as any).env?.VITE_API_URL;
export const API_URL = _env_api_url !== undefined ? _env_api_url : "http://localhost:8000";

export interface Product {
  product_id: number;
  product_name: string;
  unit_price: number;
  pos_price?: number;
  sku: string;
  category_name: string;
  category_id: number;
  supplier_id?: number | null;
  supplier_name?: string;
  unit_of_measurement?: string;
  quantity?: number;
  reorder_level?: number;
  is_service?: boolean;
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

export interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person?: string;
  address?: string | null;
  email?: string | null;
  contact_number?: string | null;
  product_supplied?: string | null;
  total_orders?: number;
  status?: string;
}

export interface PosProduct {
  pos_id: number;
  product_id: number;
  sku: string;
  product_name: string;
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
  mechanic_name?: string;
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
  cash_amount?: number;
  ewallet_amount?: number;
  payment_status?: string;
  failure_reason?: string;
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

export interface PayMongoCheckoutSessionPayload {
  amount: number; // in centavos
  currency: "PHP";
  description: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  success_url?: string;
  cancel_url?: string;
  items?: Array<{
    name: string;
    amount: number;
    quantity: number;
    currency?: string;
    description?: string;
  }>;
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
  permissions: Record<string, string[]>;
  user_count: number;
}

export interface CreateRolePayload {
  name: string;
  permissions: Record<string, string[]>;
}

export interface UpdateRolePayload {
  name: string;
  permissions: Record<string, string[]>;
}

export interface LoginPayload {
  username: string;
  password: string;
  force_disconnect?: boolean;
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
  difference: number;
  reorder_level: number;
  unit_price: number;
  status: 'Normal' | 'Low' | 'Out of Stock' | 'Archived' | 'Deleted' | 'Active';
  last_updated: string;
  reason_adjustment: string;
}

export interface InventoryStockEvent {
  event_id: number;
  created_at: string;
  event_type: string;
  reference_type: string;
  reference_id: string;
  reason: string;
  quantity_before: number;
  quantity_after: number;
  expected_before: number;
  expected_after: number;
  actual_before: number;
  actual_after: number;
  quantity_delta: number;
  expected_delta: number;
  actual_delta: number;
  difference_before: number;
  difference_after: number;
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
  unit_price: number;
  pos_price?: number;
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
  unit_price: number;
  pos_price?: number;
}

export interface InventoryDiscrepancyPayload {
  quantity_change: number;
  reason: string;
}

export interface BulkRestockItemPayload {
  inventory_id: number;
  quantity_to_add: number;
  reason_adjustment: string;
}

export interface BulkRestockPayload {
  items: BulkRestockItemPayload[];
}

export interface ProductReturnItem {
  item_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
}

export interface ProductReturn {
  return_id: number;
  supplier_id?: number;
  supplier_name?: string;
  status: "Pending" | "Approved" | "Rejected" | string;
  created_at?: string;
  approved_at?: string;
  rejected_at?: string;
  reason?: string | null;
  total_quantity: number;
  items?: ProductReturnItem[];
}

export interface CreateProductReturnPayload {
  supplier_id: number;
  items: Array<{ product_id: number; quantity: number }>;
  reason?: string;
}

export interface MarkOrderReceivedPayload {
  receipt_number: string;
  notes?: string;
  items: Array<{
    product_id: number;
    received_quantity?: number;
    damage_count: number;
    damage_unit?: string;
  }>;
}

export interface CustomerReturnItem {
  item_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  is_defective: boolean;
  is_damaged: boolean;
}

export interface CustomerReturn {
  return_id: number;
  rma_number: string;
  sale_id: number;
  customer_name: string;
  contact_number: string;
  return_date: string;
  return_type: string;
  status: string;
  reason?: string;
  refund_amount: number;
  items: CustomerReturnItem[];
}

export interface CreateCustomerReturnPayload {
  sale_id: number;
  return_type: string;
  reason?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    is_defective: boolean;
    is_damaged: boolean;
  }>;
}

export interface LoginResult {
  user_id: number;
  username: string;
  full_name: string;
  employee_id: number;
  role: string;
  email?: string | null;
  permissions?: Record<string, string[]>;
  mfa_required?: boolean;
  mfa_method?: "email" | "totp";
  totp_enabled?: boolean;
  must_change_password?: boolean;
  avatar_url?: string | null;
  session_token?: string | null;
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
  avatar_url?: string | null;
  temp_email?: string | null;
  email_verification_required?: boolean;
  totp_enabled?: boolean;
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
  user_id: number | null;
  username: string;
  role: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  timestamp: string;
  details: string | null;
}

export interface DashboardStats {
  total_revenue: number;
  total_transactions: number;
  completed_sales: number;
  failed_payments: number;
  refunded_sales: number;
  out_of_stock_count: number;
  low_stock_count: number;
  sales_performance: Array<{ label: string; revenue: number; transactions: number }>;
  sales_trend: Array<{ month: string; actual_sales: number; forecast_sales: number }>;
  sales_by_category: Array<{ category: string; value: number; percentage: number }>;
  top_products: Array<{ name: string; units_sold: number; revenue: number; current_stock: number; status: string }>;
}

export interface AnalyticsOverview {
  forecast_accuracy: number | null;
  today_sales_total: number;
  items_out: number;
  items_low: number;
  items_ok: number;
  low_stock_alerts: number;
  critical_stock_count: number;
  low_stock_count: number;
  prediction_models: number;
  top_sellers: Array<{ name: string; revenue: number; category?: string }>;
  top_mechanics?: Array<{ name: string; services_count: number; revenue: number }>;
  last_updated: string | null;
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Device-Id": getDeviceId(),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const session = getSession();
  if (session?.user_id && !headers["X-Actor-User-Id"]) {
    headers["X-Actor-User-Id"] = String(session.user_id);
  }
  if (session?.session_token && !headers["X-Session-Token"]) {
    headers["X-Session-Token"] = String(session.session_token);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
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
  const session = getSession();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Actor-User-Id": String(actorUserId),
      "X-Device-Id": getDeviceId(),
      ...(session?.session_token ? { "X-Session-Token": session.session_token } : {}),
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
  const session = getSession();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(userId),
      "X-Device-Id": getDeviceId(),
      ...(session?.session_token ? { "X-Session-Token": session.session_token } : {}),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(formatApiError(err.detail));
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  put: <T>(path: string, body?: any) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  post: <T>(path: string, body?: any) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  
  uploadLoginBackground: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    const session = getSession();
    if (session?.user_id) {
      headers["X-Actor-User-Id"] = String(session.user_id);
    }
    return fetch(`${API_URL}/api/settings/login-background`, {
      method: "POST",
      body: formData,
      headers,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(formatApiError(err.detail));
      }
      return res.json() as Promise<{ status: string; login_background_url: string }>;
    });
  },
  resetLoginBackground: () => {
    return request<{ status: string; message: string }>("/api/settings/login-background", { method: "DELETE" });
  },

  getDashboardStats: (view?: string) => request<DashboardStats>(`/api/dashboard/stats${view ? `?view=${view}` : ""}`),
  getAnalyticsOverview: () => request<AnalyticsOverview>("/api/analytics/overview"),
  getSalesForecast: (days = 90) => request<any>(`/api/analytics/forecast?days=${days}`),
  getStockPrediction: (params?: { useCache?: boolean }) => {
    const query = params?.useCache === false ? "?use_cache=false" : "";
    return request<any>(`/api/analytics/stock-prediction${query}`);
  },
  getAnalyticsModelStatus: () => request<any>("/api/analytics/model-status"),
  retrainAnalyticsModels: () => request<{ ok: boolean }>("/api/analytics/retrain", { method: "POST" }),
  importHistoricalSales: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    const session = getSession();
    if (session?.user_id) {
      headers["X-Actor-User-Id"] = String(session.user_id);
    }
    return fetch(`${API_URL}/api/analytics/import-historical`, {
      method: "POST",
      body: formData,
      headers,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Import failed" }));
        throw new Error(formatApiError(err.detail));
      }
      return res.json() as Promise<{ ok: boolean; message: string; sales_count: number; items_count: number }>;
    });
  },
  importSales: (file: File, deductInventory: boolean = true) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    const session = getSession();
    if (session?.user_id) {
      headers["X-Actor-User-Id"] = String(session.user_id);
    }
    return fetch(`${API_URL}/api/sales/import?deduct_inventory=${deductInventory}`, {
      method: "POST",
      body: formData,
      headers,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Import failed" }));
        throw new Error(formatApiError(err.detail));
      }
      return res.json() as Promise<{ ok: boolean; message: string; sales_count: number; items_count: number }>;
    });
  },

  getProducts: () => request<Product[]>("/api/products"),
  getCategories: () => request<Category[]>("/api/categories"),
  createCategory: (payload: { category_name: string; is_active: boolean }) =>
    request<Category>("/api/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (categoryId: number, payload: { category_name: string; is_active: boolean }) =>
    request<Category>(`/api/categories/${categoryId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (categoryId: number) => request<{ message: string }>(`/api/categories/${categoryId}`, { method: "DELETE" }),

  getTerminals: () => request<Terminal[]>("/api/pos-terminals"),
  getPosProducts: () => request<PosProduct[]>("/api/pos-products"),
  createPosProduct: (payload: PosProductPayload) => request<{ pos_id: number }>("/api/pos-products", { method: "POST", body: JSON.stringify(payload) }),
  updatePosProduct: (posId: number, payload: PosProductPayload) => request<{ ok: boolean }>(`/api/pos-products/${posId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePosProduct: (posId: number) => request<{ ok: boolean }>(`/api/pos-products/${posId}`, { method: "DELETE" }),

  createSale: (payload: CreateSalePayload) => request<SaleResult>("/api/sales", { method: "POST", body: JSON.stringify(payload) }),
  getSales: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const query = params.toString();
    return request<{ sales: any[] }>(`/api/sales${query ? `?${query}` : ""}`);
  },
  getSale: (invoiceId: number) => request<any>(`/api/sales/${invoiceId}`),

  getUsers: () => request<ApiUser[]>("/api/users"),
  getUserManagementStats: (actorUserId: number) => requestAsActor<UserManagementStats>(actorUserId, "/api/user-management-stats"),
  getAuditLogs: (actorUserId: number) => requestAsActor<AuditLogEntry[]>(actorUserId, "/api/audit-logs"),
  updateAuditLog: (actorUserId: number, logId: number, payload: Partial<AuditLogEntry>) => requestAsActor<{ ok: boolean }>(actorUserId, `/api/audit-logs/${logId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAuditLogs: (actorUserId: number) => requestAsActor<{ ok: boolean }>(actorUserId, "/api/audit-logs", { method: "DELETE" }),
  createUser: (payload: CreateUserPayload, actorUserId: number) => requestAsActor<ApiUser>(actorUserId, "/api/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (userId: number, payload: UpdateUserPayload, actorUserId: number) => requestAsActor<ApiUser>(actorUserId, `/api/users/${userId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteUser: (userId: number, actorUserId: number) => requestAsActor<{ ok: boolean }>(actorUserId, `/api/users/${userId}`, { method: "DELETE" }),

  getRoles: () => request<ApiRole[]>("/api/roles"),
  createRole: (payload: CreateRolePayload, actorUserId: number) => requestAsActor<ApiRole>(actorUserId, "/api/roles", { method: "POST", body: JSON.stringify(payload) }),
  updateRole: (roleId: number, payload: UpdateRolePayload, actorUserId: number) => requestAsActor<ApiRole>(actorUserId, `/api/roles/${roleId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteRole: (roleId: number, actorUserId: number) => requestAsActor<{ ok: boolean }>(actorUserId, `/api/roles/${roleId}`, { method: "DELETE" }),

  getSuppliers: () => request<Supplier[]>("/api/suppliers/"),
  createSupplier: (payload: SupplierPayload) => request<Supplier>("/api/suppliers/", { method: "POST", body: JSON.stringify(payload) }),
  updateSupplier: (supplierId: number, payload: SupplierPayload) => request<Supplier>(`/api/suppliers/${supplierId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSupplier: (supplierId: number) => request<{ message: string }>(`/api/suppliers/${supplierId}`, { method: "DELETE" }),
  archiveSupplier: (supplierId: number) => request<{ ok: boolean }>(`/api/suppliers/${supplierId}/archive`, { method: "PUT" }),

  getInventoryItems: () => request<InventoryItem[]>("/api/inventory/"),
  getInventoryTrace: (inventoryId: number) => request<InventoryStockEvent[]>(`/api/inventory/${inventoryId}/trace/`),
  addInventoryItem: (payload: InventoryPayload) => request<InventoryItem>("/api/inventory/", { method: "POST", body: JSON.stringify(payload) }),
  updateInventoryItem: (inventoryId: number, payload: UpdateInventoryPayload) => request<InventoryItem>(`/api/inventory/${inventoryId}/`, { method: "PUT", body: JSON.stringify(payload) }),
  addInventoryDiscrepancy: (inventoryId: number, payload: InventoryDiscrepancyPayload) => request<{ ok: boolean }>(`/api/inventory/${inventoryId}/discrepancy/`, { method: "POST", body: JSON.stringify(payload) }),
  deleteInventoryItem: (inventoryId: number) => request<{ message: string }>(`/api/inventory/${inventoryId}/`, { method: "DELETE" }),
  bulkRestock: (payload: BulkRestockPayload) => request<{ ok: boolean }>("/api/inventory/bulk-restock", { method: "POST", body: JSON.stringify(payload) }),

  getPurchaseOrders: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const query = params.toString();
    return request<any[]>(`/api/purchase-orders/${query ? `?${query}` : ""}`);
  },
  getPurchaseOrder: (orderId: string) => request<any>(`/api/purchase-orders/${orderId}`),
  getUpcomingDeliveries: () => request<{ deliveries: any[]; count: number }>("/api/purchase-orders/upcoming-deliveries"),
  createPurchaseOrder: (payload: any) => request<any>("/api/purchase-orders/", { method: "POST", body: JSON.stringify(payload) }),
  createReplacementPurchaseOrder: (payload: {
    reference_order_id: string;
    supplier_id: number;
    expected_delivery: string;
    replacement_reason: string;
    replacement_type?: string;
    items: Array<{ 
      product_id: number; 
      quantity: number; 
      unit_price?: number | null;
      purchase_unit?: string;
      conversion?: string;
      conversion_rate?: number;
    }>;
    notes?: string;
  }) => request<any>("/api/purchase-orders/replacement", { method: "POST", body: JSON.stringify(payload) }),
  markOrderAsReceived: (orderId: string, payload: MarkOrderReceivedPayload) => 
    request<{ ok: boolean }>(`/api/purchase-orders/${orderId}/receive`, { method: "PUT", body: JSON.stringify(payload) }),
  markOrderAsNotReceived: (orderId: string, payload: { notes: string }) => 
    request<{ ok: boolean; message?: string }>(`/api/purchase-orders/${orderId}/not-received`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePurchaseOrder: (orderId: string) => request<{ ok: boolean }>(`/api/purchase-orders/${orderId}`, { method: "DELETE" }),
  archivePurchaseOrder: (orderId: string) => request<{ ok: boolean }>(`/api/purchase-orders/${orderId}/archive`, { method: "PUT" }),

  getProductReturns: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const query = params.toString();
    return request<ProductReturn[]>(`/api/product-returns/${query ? `?${query}` : ""}`);
  },
  getProductReturn: (returnId: number) => request<ProductReturn>(`/api/product-returns/${returnId}`),
  createProductReturn: (payload: CreateProductReturnPayload) => request<{ ok: boolean; return_id: number }>("/api/product-returns/", { method: "POST", body: JSON.stringify(payload) }),
  approveProductReturn: (returnId: number) => request<{ ok: boolean }>(`/api/product-returns/${returnId}/approve`, { method: "PUT" }),
  rejectProductReturn: (returnId: number) => request<{ ok: boolean }>(`/api/product-returns/${returnId}/reject`, { method: "PUT" }),
  archiveProductReturn: (returnId: number) => request<{ ok: boolean }>(`/api/product-returns/${returnId}/archive`, { method: "PUT" }),

  // ──── TWO-STAGE ARCHIVE MODULE ──────────────────────────────────────────
  getArchivedUsers: (actorUserId: number, stage = "Archived") => requestAsActor<any[]>(actorUserId, `/api/archive/users?stage=${stage}`),
  moveUserToTrash: (userId: number, actorUserId: number) => requestAsActor<{ ok: boolean }>(actorUserId, `/api/archive/users/${userId}/move-to-trash`, { method: "PUT" }),
  restoreUser: (userId: number, actorUserId: number) => requestAsActor<{ ok: boolean }>(actorUserId, `/api/archive/users/${userId}/restore`, { method: "PUT" }),
  permanentDeleteUser: (userId: number, actorUserId: number) => requestAsActor<{ ok: boolean }>(actorUserId, `/api/archive/users/${userId}/permanent`, { method: "DELETE" }),

  getArchivedInventory: (stage = "Archived") => request<InventoryItem[]>(`/api/archive/inventory?stage=${stage}`),
  moveInventoryToTrash: (inventoryId: number) => request<{ ok: boolean }>(`/api/archive/inventory/${inventoryId}/move-to-trash`, { method: "PUT" }),
  restoreInventory: (inventoryId: number) => request<{ ok: boolean }>(`/api/archive/inventory/${inventoryId}/restore`, { method: "PUT" }),
  permanentDeleteInventory: (inventoryId: number) => request<{ ok: boolean }>(`/api/archive/inventory/${inventoryId}/permanent`, { method: "DELETE" }),

  getArchivedProducts: (stage = "Archived") => request<any[]>(`/api/archive/products?stage=${stage}`),
  moveProductToTrash: (productId: number) => request<{ ok: boolean }>(`/api/archive/products/${productId}/move-to-trash`, { method: "PUT" }),
  restoreProduct: (productId: number) => request<{ ok: boolean }>(`/api/archive/products/${productId}/restore`, { method: "PUT" }),
  permanentDeleteProduct: (productId: number) => request<{ ok: boolean }>(`/api/archive/products/${productId}/permanent`, { method: "DELETE" }),

  getArchivedSuppliers: (stage = "Archived") => request<any[]>(`/api/archive/suppliers?stage=${stage}`),
  moveSupplierToTrash: (supplierId: number) => request<{ ok: boolean }>(`/api/archive/suppliers/${supplierId}/move-to-trash`, { method: "PUT" }),
  restoreSupplier: (supplierId: number) => request<{ ok: boolean }>(`/api/archive/suppliers/${supplierId}/restore`, { method: "PUT" }),
  permanentDeleteSupplier: (supplierId: number) => request<{ ok: boolean }>(`/api/archive/suppliers/${supplierId}/permanent`, { method: "DELETE" }),

  getArchivedOrders: (stage = "Archived") => request<any[]>(`/api/archive/orders?stage=${stage}`),
  moveOrderToTrash: (orderId: string) => request<{ ok: boolean }>(`/api/archive/orders/${orderId}/move-to-trash`, { method: "PUT" }),
  restoreOrder: (orderId: string) => request<{ ok: boolean }>(`/api/archive/orders/${orderId}/restore`, { method: "PUT" }),
  permanentDeleteOrder: (orderId: string) => request<{ ok: boolean }>(`/api/archive/orders/${orderId}/permanent`, { method: "DELETE" }),

  getArchivedProductReturns: (stage = "Archived") => request<any[]>(`/api/archive/product-returns?stage=${stage}`),
  moveReturnToTrash: (returnId: number) => request<{ ok: boolean }>(`/api/archive/product-returns/${returnId}/move-to-trash`, { method: "PUT" }),
  restoreProductReturn: (returnId: number) => request<{ ok: boolean }>(`/api/archive/product-returns/${returnId}/restore`, { method: "PUT" }),
  permanentDeleteProductReturn: (returnId: number) => request<{ ok: boolean }>(`/api/archive/product-returns/${returnId}/permanent`, { method: "DELETE" }),

  getArchivedMechanics: (stage = "Archived") => request<any[]>(`/api/archive/mechanics?stage=${stage}`),
  moveMechanicToTrash: (mechanicId: number, actorUserId?: number) => requestAsActor<{ ok: boolean }>(actorUserId ?? 0, `/api/archive/mechanics/${mechanicId}/move-to-trash`, { method: "PUT" }),
  restoreMechanic: (mechanicId: number, actorUserId?: number) => requestAsActor<{ ok: boolean }>(actorUserId ?? 0, `/api/archive/mechanics/${mechanicId}/restore`, { method: "PUT" }),
  permanentDeleteMechanic: (mechanicId: number, actorUserId?: number) => requestAsActor<{ ok: boolean }>(actorUserId ?? 0, `/api/archive/mechanics/${mechanicId}/permanent`, { method: "DELETE" }),

  archiveRole: (roleId: number, actorUserId?: number) => requestAsActor<{ ok: boolean }>(actorUserId ?? 0, `/api/archive/roles/${roleId}/archive`, { method: "PUT" }),
  getArchivedRoles: (stage = "Archived") => request<any[]>(`/api/archive/roles?stage=${stage}`),
  moveRoleToTrash: (roleId: number, actorUserId?: number) => requestAsActor<{ ok: boolean }>(actorUserId ?? 0, `/api/archive/roles/${roleId}/move-to-trash`, { method: "PUT" }),
  restoreRole: (roleId: number, actorUserId?: number) => requestAsActor<{ ok: boolean }>(actorUserId ?? 0, `/api/archive/roles/${roleId}/restore`, { method: "PUT" }),
  permanentDeleteRole: (roleId: number, actorUserId?: number) => requestAsActor<{ ok: boolean }>(actorUserId ?? 0, `/api/archive/roles/${roleId}/permanent`, { method: "DELETE" }),

  getRetentionSetting: () => request<{ retention_days: number; auto_delete_enabled: boolean }>("/api/archive/retention"),
  updateRetentionSetting: (retention_days: number) => request<{ retention_days: number; auto_delete_enabled: boolean }>("/api/archive/retention", { method: "PUT", body: JSON.stringify({ retention_days }) }),
  autoCleanupDeletedFolder: () => request<{ purged_count: number; retention_days: number; message: string }>("/api/archive/auto-cleanup", { method: "POST" }),

  login: (payload: LoginPayload) => request<LoginResult>("/api/login", { method: "POST", body: JSON.stringify(payload) }),
  verifyOTP: (payload: { user_id: number; otp: string; force_disconnect?: boolean }) => request<LoginResult>("/api/verify-otp", { method: "POST", body: JSON.stringify(payload) }),
  resendOTP: (userId: number) => request<{ ok: boolean; message: string }>("/api/resend-otp", { method: "POST", body: JSON.stringify({ user_id: userId }) }),
  setupTOTP: (userId: number) => request<{ secret: string; qr_code: string; otpauth_url: string }>("/api/totp/setup", { method: "POST", body: JSON.stringify({ user_id: userId }) }),
  enableTOTP: (payload: { user_id: number; secret: string; totp_code: string }) => request<{ ok: boolean; message: string }>("/api/totp/enable", { method: "POST", body: JSON.stringify(payload) }),
  disableTOTP: (payload: { user_id: number; password: string }) => request<{ ok: boolean; message: string }>("/api/totp/disable", { method: "POST", body: JSON.stringify(payload) }),
  changePassword: (payloadOrUserId: any, userIdOrPayload?: any) => {
    let payload: { current_password?: string; new_password: string };
    let uid: number;
    if (typeof payloadOrUserId === "number") {
      uid = payloadOrUserId;
      payload = userIdOrPayload;
    } else {
      payload = payloadOrUserId;
      uid = userIdOrPayload || getSession()?.user_id;
    }
    return requestWithUser<{ ok: boolean }>(uid, "/api/change-password", { method: "POST", body: JSON.stringify(payload) });
  },
  forgotPassword: (username: string, email: string) => request<{ ok: boolean; user_id?: number; username?: string; otp?: string }>("/api/forgot-password", { method: "POST", body: JSON.stringify({ username, email }) }),
  resetPassword: (payload: any) => request<{ ok: boolean }>("/api/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  verifySession: (userId: number) => requestWithUser<{ ok: boolean; user: any }>(userId, "/api/auth/verify"),
  heartbeat: (userId: number) => requestWithUser<{ ok: boolean; status: string }>(userId, "/api/auth/heartbeat", { method: "POST" }),
  sendDisconnectBeacon: (userId: number, sessionToken?: string | null) => {
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ user_id: userId, session_token: sessionToken || null })], {
          type: "application/json",
        });
        navigator.sendBeacon(`${API_URL}/api/auth/disconnect-beacon`, blob);
      }
    } catch {}
  },
  logout: async (userId?: number, reason?: string) => {
    const session = getSession();
    const uid = userId || session?.user_id;
    if (!uid) return { ok: true };
    
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ user_id: uid, reason: reason || "Manual logout" })], {
          type: "application/json",
        });
        navigator.sendBeacon(`${API_URL}/api/auth/logout`, blob);
      }
    } catch {}

    try {
      return await requestWithUser<{ ok: boolean }>(uid, "/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ user_id: uid, reason: reason || "Manual logout" }),
      });
    } catch {
      return { ok: true };
    }
  },
  getProfile: (userId: number) => requestWithUser<Profile>(userId, "/api/profile"),
  updateProfile: (userId: number, payload: ProfileUpdatePayload) => requestWithUser<Profile>(userId, "/api/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  verifyEmail: (userId: number, otp: string) => requestWithUser<Profile>(userId, "/api/profile/verify-email", { method: "POST", body: JSON.stringify({ otp }) }),
  uploadAvatar: async (userId: number, file: File): Promise<Profile> => {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {
      "X-User-Id": String(userId),
    };
    
    const session = getSession();
    if (session?.user_id) {
      headers["X-Actor-User-Id"] = String(session.user_id);
    }

    const res = await fetch(`${API_URL}/api/profile/avatar`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(formatApiError(err.detail));
    }
    return res.json() as Promise<Profile>;
  },
  getProfileActivity: (userId: number, limit = 10) => requestWithUser<ProfileActivityItem[]>(userId, `/api/profile/activity?limit=${limit}`),
  getSecurityLogs: (userId: number) => requestWithUser<ProfileActivityItem[]>(userId, "/api/profile/security-logs"),

  getCustomerReturns: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const query = params.toString();
    return request<CustomerReturn[]>(`/api/customer-returns/${query ? `?${query}` : ""}`);
  },
  getCustomerReturnBySaleId: (saleId: number) => request<CustomerReturn>(`/api/customer-returns/sale/${saleId}`),
  createCustomerReturn: (payload: CreateCustomerReturnPayload) => request<{ ok: boolean; rma_number: string }>("/api/customer-returns/", { method: "POST", body: JSON.stringify(payload) }),
  markCustomerReturnToSupplier: (returnId: number) => request<{ ok: boolean }>(`/api/customer-returns/${returnId}/to-supplier`, { method: "PUT" }),
  markCustomerReturnAsLoss: (returnId: number) => request<{ ok: boolean }>(`/api/customer-returns/${returnId}/mark-loss`, { method: "PUT" }),

  getReportHistory: () => request<GeneratedReport[]>("/api/reports/history"),
  generateReport: (payload: { 
    report_type: string; 
    start_date?: string; 
    end_date?: string;
    category_id?: number;
    supplier_id?: number;
    product_id?: number;
    product_ids?: number[];
    status?: string;
  }) => 
    request<{ report_id: number; report_data: any }>("/api/reports/generate", { method: "POST", body: JSON.stringify(payload) }),
  deleteReport: (reportId: number) => request<{ status: string }>(`/api/reports/${reportId}`, { method: "DELETE" }),
  createPayMongoCheckoutSession: (payload: PayMongoCheckoutSessionPayload) => request<any>("/api/paymongo/checkout", { method: "POST", body: JSON.stringify(payload) }),
  getPayMongoPaymentStatus: (sourceId: string) => request<any>(`/api/paymongo/status/${sourceId}`),

  downloadBackup: async (): Promise<Blob> => {
    const headers: Record<string, string> = {};
    const session = getSession();
    if (session?.user_id) {
      headers["X-Actor-User-Id"] = String(session.user_id);
    }
    const res = await fetch(`${API_URL}/api/settings/backup`, {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Backup failed" }));
      throw new Error(formatApiError(err.detail));
    }
    return res.blob();
  },
  restoreBackup: async (file: File): Promise<{ ok: boolean; message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    const session = getSession();
    if (session?.user_id) {
      headers["X-Actor-User-Id"] = String(session.user_id);
    }
    const res = await fetch(`${API_URL}/api/settings/restore`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Restore failed" }));
      throw new Error(formatApiError(err.detail));
    }
    return res.json();
  },
  importProductsCSV: async (file: File): Promise<{ ok: boolean; message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    const session = getSession();
    if (session?.user_id) {
      headers["X-Actor-User-Id"] = String(session.user_id);
    }
    const res = await fetch(`${API_URL}/api/products/import`, {
      method: "POST",
      body: formData,
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Import failed" }));
      throw new Error(formatApiError(err.detail));
    }
    return res.json();
  },

  getMechanics: () => request<GetMechanicsResponse>("/api/mechanics/"),
  createMechanic: (payload: { name: string; status?: string }) => request<Mechanic>("/api/mechanics/", { method: "POST", body: JSON.stringify(payload) }),
  updateMechanic: (mechanic_id: number, payload: { name: string; status: string; total_earnings?: number }) => request<Mechanic>(`/api/mechanics/${mechanic_id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMechanic: (mechanic_id: number) => request<{ ok: boolean }>(`/api/mechanics/${mechanic_id}`, { method: "DELETE" }),
  updateMechanicSettings: (payload: { commission_rate: number }) => request<{ ok: boolean, mechanic_commission_rate: number }>("/api/mechanics/settings", { method: "POST", body: JSON.stringify(payload) }),
  releaseMechanicPayout: (mechanic_id: number, payload: { notes?: string }) => request<{ ok: boolean, payout_amount: number, payout_id: number }>(`/api/mechanics/${mechanic_id}/payout`, { method: "POST", body: JSON.stringify(payload) }),
  getMechanicPayouts: (mechanic_id: number) => request<MechanicPayout[]>(`/api/mechanics/${mechanic_id}/payouts`),
  getMechanicServices: (mechanic_id: number) => request<MechanicServicesResponse>(`/api/mechanics/${mechanic_id}/services`),
  importMechanics: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    const session = getSession();
    if (session?.user_id) {
      headers["X-Actor-User-Id"] = String(session.user_id);
    }
    return fetch(`${API_URL}/api/mechanics/import`, {
      method: "POST",
      body: formData,
      headers,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Import failed" }));
        throw new Error(formatApiError(err.detail));
      }
      return res.json() as Promise<{ ok: boolean; message: string }>;
    });
  },

  getCurrentShift: () => {
    const session = getSession();
    if (!session?.user_id) return Promise.resolve({ active: false, shift: null } as CurrentShiftResponse);
    return requestAsActor<CurrentShiftResponse>(session.user_id, "/api/shifts/current");
  },
  startShift: (startingCash: number, terminalId = 1, notes?: string) => {
    const session = getSession();
    if (!session?.user_id) throw new Error("Not authenticated");
    return requestAsActor<{ ok: boolean; message: string; shift_id: number }>(
      session.user_id,
      "/api/shifts/start",
      { method: "POST", body: JSON.stringify({ starting_cash: startingCash, terminal_id: terminalId, notes }) }
    );
  },
  endShift: (shiftId: number, endingCash?: number, notes?: string) => {
    const session = getSession();
    if (!session?.user_id) throw new Error("Not authenticated");
    return requestAsActor<{ ok: boolean; message: string }>(
      session.user_id,
      "/api/shifts/end",
      { method: "POST", body: JSON.stringify({ shift_id: shiftId, ending_cash: endingCash, notes }) }
    );
  },
  getAllShifts: (status?: string) => {
    const query = status ? `?status=${status}` : "";
    return request<PosShift[]>(`/api/shifts/${query}`);
  },
  updateShiftNotes: (shiftId: number, data: { notes?: string | null; start_notes?: string | null; end_notes?: string | null } | string | null) => {
    const session = getSession();
    if (!session?.user_id) throw new Error("Not authenticated");
    const payload = typeof data === "string" || data === null ? { notes: data } : data;
    return requestAsActor<{ ok: boolean; message: string; shift_id: number; notes: string | null; start_notes: string | null; end_notes: string | null }>(
      session.user_id,
      `/api/shifts/${shiftId}/notes`,
      { method: "PUT", body: JSON.stringify(payload) }
    );
  },
  getShiftTransactions: (shiftId: number) => {
    return request<ShiftTransactionsResponse>(`/api/shifts/${shiftId}/transactions`);
  },
};

export interface PosShift {
  shift_id: number;
  user_id: number;
  terminal_id: number;
  starting_cash: number;
  cash_sales: number;
  total_expected_cash: number;
  ending_cash?: number | null;
  status: "OPEN" | "CLOSED";
  opened_at: string;
  closed_at?: string | null;
  notes?: string | null;
  start_notes?: string | null;
  end_notes?: string | null;
  username?: string;
  cashier_name?: string;
  role?: string;
}

export interface ShiftTransactionItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_service: boolean;
  mechanic_name?: string | null;
}

export interface ShiftTransaction {
  invoice_id: number;
  invoice_date: string;
  transaction_timestamp: string;
  total_amount: number;
  tax_amount: number;
  service_charge: number;
  customer_info: string;
  contact_number?: string | null;
  payment_status: string;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  cashier_name: string;
  items: ShiftTransactionItem[];
}

export interface ShiftTransactionsResponse {
  shift: PosShift;
  transactions: ShiftTransaction[];
  summary: {
    transaction_count: number;
    total_sales: number;
    cash_sales: number;
    cashless_sales: number;
    refunded_sales: number;
    items_sold_count: number;
  };
}

export interface CurrentShiftResponse {
  active: boolean;
  shift: PosShift | null;
}

export interface GeneratedReport {
  id: number;
  reportType: string;
  dateRange: string;
  generatedDate: string;
  generatedBy: string;
  reportData?: any;
}

export interface SalesReportData {
  summary: {
    total_revenue_gross: number;
    total_revenue_net: number;
    refunded_total: number;
  };
  trends: {
    annual: Array<{ month: string; sales: number }>;
  };
  top_products: Array<{ product_name: string; units_sold: number; revenue: number }>;
  lowest_products: Array<{ product_name: string; units_sold: number }>;
}

export interface InventoryReportData {
  breakdown: Array<{ status: string; count: number }>;
  critical_frequency: Array<{ product_name: string; incident_count: number }>;
  detailed_inventory: Array<{
    product_name: string;
    sku: string;
    expected: number;
    actual: number;
    difference: number;
    reorder_level: number;
  }>;
}

export interface ProductCategoryReportData {
  products: Array<{
    category: string;
    product_name: string;
    sku: string;
    unit_cost: number;
    srp: number;
    stock: number;
    total_cost: number;
  }>;
  investment_summary: Array<{ category: string; total_category_cost: number }>;
}

export interface SupplierReportData {
  suppliers: Array<{
    supplier_name: string;
    status: string;
    contact_number: string;
    email: string;
    po_count: number;
    total_spent: number;
    avg_lead_time: number | null;
  }>;
}

export interface OrdersReturnsReportData {
  purchase_orders: Array<{
    order_id: string;
    created_at: string;
    status: string;
    expected_delivery: string;
  }>;
  customer_returns: Array<{
    rma_number: string;
    sale_id: number;
    customer_name: string;
    return_type: string;
    reason: string;
  }>;
  supplier_returns?: Array<{
    return_id: number;
    supplier_name: string;
    status: string;
    created_at: string;
    reason: string;
    total_quantity: number;
  }>;
}

export interface StockRiskStats {
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  avg_days_to_stockout: number | null;
}

export interface StockRiskAnalysisPoint {
  product_name: string;
  days_to_stockout: number | null;
  predicted_demand_30d: number;
  current_stock: number;
  confidence: number;
}

export interface StockHorizonPrediction {
  product_id: number;
  product_name: string;
  supplier_id: number | null;
  supplier_name: string;
  current_stock: number;
  stock_30d: number;
  stock_60d: number;
  stock_90d: number;
  recommended_order: number;
  urgency: "High" | "Medium" | "Low";
  unit_price: number;
  reorder_level?: number;
}

export interface CriticalStockItem {
  product_name: string;
  days_to_stockout: number;
  recommended_order: number;
}

export interface StockPredictionResponse {
  risk_stats: StockRiskStats;
  risk_analysis: StockRiskAnalysisPoint[];
  horizon_predictions: StockHorizonPrediction[];
  critical_items: CriticalStockItem[];
  model_status: any;
  served_from_cache: boolean;
  forecast_engine: string;
  cache_generated_at: string | null;
}

export interface ServicesReportData {
  summary: {
    total_count: number;
    total_revenue: number;
    mechanic_commission_rate?: number;
    total_mechanic_share?: number;
    total_store_share?: number;
  };
  top_mechanics: Array<{
    mechanic_name: string;
    services_count: number;
    revenue: number;
    mechanic_share?: number;
    store_share?: number;
  }>;
  services_breakdown: Array<{
    service_name: string;
    count: number;
    revenue: number;
  }>;
}

export interface Mechanic {
  mechanic_id: number;
  name: string;
  earnings_adjustment: number;
  calculated_revenue: number;
  mechanic_share: number;
  store_share: number;
  total_earnings: number;
  status: string;
}

export interface GetMechanicsResponse {
  mechanics: Mechanic[];
  mechanic_commission_rate: number;
}

export interface MechanicPayout {
  payout_id: number;
  mechanic_id: number;
  amount: number;
  payout_date: string;
  processed_by: number | null;
  processed_by_name?: string;
  notes?: string;
}

export interface MechanicServiceJob {
  sold_item_id: number;
  invoice_id: number;
  service_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  mechanic_share: number;
  store_share: number;
  mechanic_payout_status: "Unpaid" | "Paid" | string;
  service_date: string;
  service_timestamp?: string | null;
  customer_name?: string | null;
  payment_method?: string | null;
}

export interface MechanicServicesResponse {
  mechanic_id: number;
  mechanic_name: string;
  status: string;
  commission_rate: number;
  summary: {
    total_services_count: number;
    total_gross_revenue: number;
    total_mechanic_earned: number;
    unpaid_services_count: number;
    unpaid_mechanic_share: number;
    paid_services_count: number;
    paid_mechanic_share: number;
  };
  services: MechanicServiceJob[];
}


