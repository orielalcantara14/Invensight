/// <reference types="vite/client" />
import { getSession } from "@/auth/session";

const _env_api_url = (import.meta as any).env?.VITE_API_URL;
const API_URL = _env_api_url !== undefined ? _env_api_url : "http://localhost:8000";

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
    damage_count: number;
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
  must_change_password?: boolean;
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
    ...(options?.headers as Record<string, string> | undefined),
  };

  const session = getSession();
  if (session?.user_id && !headers["X-Actor-User-Id"]) {
    headers["X-Actor-User-Id"] = String(session.user_id);
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

export const api = {
  get: <T>(path: string) => request<T>(path),
  put: <T>(path: string, body?: any) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  post: <T>(path: string, body?: any) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  
  getDashboardStats: (view?: string) => request<DashboardStats>(`/api/dashboard/stats${view ? `?view=${view}` : ""}`),
  getAnalyticsOverview: () => request<AnalyticsOverview>("/api/analytics/overview"),
  getSalesForecast: (days = 90) => request<any>(`/api/analytics/forecast?days=${days}`),
  getStockPrediction: (params?: { useCache?: boolean }) => {
    const query = params?.useCache === false ? "?use_cache=false" : "";
    return request<any>(`/api/analytics/stock-prediction${query}`);
  },
  getAnalyticsModelStatus: () => request<any>("/api/analytics/model-status"),
  retrainAnalyticsModels: () => request<{ ok: boolean }>("/api/analytics/retrain", { method: "POST" }),

  getProducts: () => request<Product[]>("/api/products"),
  getCategories: () => request<Category[]>("/api/categories"),
  createCategory: (payload: { category_name: string; is_active: boolean }) =>
    request<Category>("/api/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (categoryId: number, payload: { category_name: string; is_active: boolean }) =>
    request<Category>(`/api/categories/${categoryId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (categoryId: number) => request<{ message: string }>(`/api/categories/${categoryId}`, { method: "DELETE" }),

  logout: (userId: number) => requestWithUser<{ ok: boolean }>(userId, "/api/logout", { method: "POST" }),
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
  markOrderAsReceived: (orderId: string, payload: MarkOrderReceivedPayload) => 
    request<{ ok: boolean }>(`/api/purchase-orders/${orderId}/receive`, { method: "PUT", body: JSON.stringify(payload) }),
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
  getArchivedUsers: (actorUserId: number) => requestAsActor<any[]>(actorUserId, "/api/archive/users"),
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

  login: (payload: LoginPayload) => request<LoginResult>("/api/login", { method: "POST", body: JSON.stringify(payload) }),
  verifyOTP: (payload: { user_id: number; otp: string }) => request<LoginResult>("/api/verify-otp", { method: "POST", body: JSON.stringify(payload) }),
  changePassword: (payload: { current_password?: string; new_password: string }, userId: number) => 
    requestWithUser<{ ok: boolean }>(userId, "/api/change-password", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: (email: string) => request<{ ok: boolean; user_id?: number; username?: string; otp?: string }>("/api/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (payload: any) => request<{ ok: boolean }>("/api/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  verifySession: (userId: number) => requestWithUser<{ ok: boolean; user: any }>(userId, "/api/auth/verify"),
  getProfile: (userId: number) => requestWithUser<Profile>(userId, "/api/profile"),
  updateProfile: (userId: number, payload: ProfileUpdatePayload) => requestWithUser<Profile>(userId, "/api/profile", { method: "PATCH", body: JSON.stringify(payload) }),
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

  getReportHistory: () => request<GeneratedReport[]>("/api/reports/history"),
  generateReport: (payload: { 
    report_type: string; 
    start_date?: string; 
    end_date?: string;
    category_id?: number;
    supplier_id?: number;
    status?: string;
  }) => 
    request<{ report_id: number; report_data: any }>("/api/reports/generate", { method: "POST", body: JSON.stringify(payload) }),
  deleteReport: (reportId: number) => request<{ status: string }>(`/api/reports/${reportId}`, { method: "DELETE" }),
  createPayMongoCheckoutSession: (payload: PayMongoCheckoutSessionPayload) => request<any>("/api/paymongo/checkout", { method: "POST", body: JSON.stringify(payload) }),
  getPayMongoPaymentStatus: (sourceId: string) => request<any>(`/api/paymongo/status/${sourceId}`),
};

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
