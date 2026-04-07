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
  const method = options?.method?.toUpperCase() || "GET";
  const mutagenic = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };

  // Automatically attach actor ID if session exists
  if (!headers["X-Actor-User-Id"]) {
    const session = getSession();
    if (session?.user_id) {
      headers["X-Actor-User-Id"] = String(session.user_id);
    }
  }

  // Handle X-User-Id for specific routes like logout
  if (!headers["X-User-Id"] && path === "/api/logout") {
    const session = getSession();
    if (session?.user_id) {
      headers["X-User-Id"] = String(session.user_id);
    }
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
  status: 'Normal' | 'Low' | 'Out of Stock' | 'Archived';
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

export interface InventoryDiscrepancyPayload {
  quantity_change: number;
  reason: string;
}

// ── Supplier Returns ─────────────────────────────────────────────────────────

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

/** Matches `LoginResponse` from the API (snake_case). */
export interface LoginResult {
  user_id: number;
  username: string;
  full_name: string;
  employee_id: number;
  role: string;
  email?: string | null;
  permissions?: Record<string, string[]>;
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

export interface TopSellerOverview {
  name: string;
  revenue: number;
  category?: string;
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
  top_sellers: TopSellerOverview[];
  last_updated: string | null;
  model_status?: AnalyticsModelStatus;
  served_from_cache?: boolean;
  sales_forecast_engine?: string | null;
  stock_forecast_engine?: string | null;
  cache_generated_at?: string | null;
}

export interface AnalyticsModelStatus {
  model_key: string;
  status: string;
  engine: string;
  message: string;
  last_trained_at: string | null;
  next_scheduled_run: string | null;
  training_duration_ms: number | null;
}

export interface ForecastSeriesPoint {
  date: string;
  actual_sales: number;
  forecast_sales: number;
  lower_bound: number;
  upper_bound: number;
  trend_component?: number | null;
  weekly_component?: number | null;
  yearly_component?: number | null;
  seasonal_component?: number | null;
  holidays_component?: number | null;
  smoothed_sales?: number | null;
  event_icon?: string | null;
}

export interface ProductForecastItem {
  product_id: number;
  product_name: string;
  current_stock: number;
  predicted_demand_30d: number;
  reorder_by: string | null;
  confidence: number;
  days_to_stockout: number | null;
  reorder_level: number;
}

export interface SalesForecastResponse {
  next_period_forecast: number | null;
  forecast_accuracy: number | null;
  trend_direction: string;
  series: ForecastSeriesPoint[];
  product_forecasts: ProductForecastItem[];
  model_status?: AnalyticsModelStatus;
  served_from_cache?: boolean;
  forecast_engine?: string;
  cache_generated_at?: string | null;
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
  current_stock: number;
  supplier_id?: number;
  supplier_name?: string;
  stock_30d: number;
  stock_60d: number;
  stock_90d: number;
  recommended_order: number;
  urgency: "High" | "Medium" | "Low";
}

export interface CriticalStockItem {
  product_name: string;
  days_to_stockout: number | null;
  recommended_order: number;
}

export interface StockPredictionResponse {
  risk_stats: StockRiskStats;
  risk_analysis: StockRiskAnalysisPoint[];
  horizon_predictions: StockHorizonPrediction[];
  critical_items: CriticalStockItem[];
  model_status?: AnalyticsModelStatus;
  served_from_cache?: boolean;
  forecast_engine?: string;
  cache_generated_at?: string | null;
}

export interface AnalyticsModelStatusGroup {
  overview: AnalyticsModelStatus;
  forecast_30d: AnalyticsModelStatus;
  stock_prediction: AnalyticsModelStatus;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  put: <T>(path: string, body?: any) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  post: <T>(path: string, body?: any) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  
  getDashboardStats: (view?: string) => request<DashboardStats>(`/api/dashboard/stats${view ? `?view=${view}` : ""}`),
  getAnalyticsOverview: () => request<AnalyticsOverview>("/api/analytics/overview"),
  getSalesForecast: (days = 90, options?: { useCache?: boolean }) =>
    request<SalesForecastResponse>(
      `/api/analytics/forecast?days=${encodeURIComponent(String(days))}&use_cache=${options?.useCache !== false ? "true" : "false"}`
    ),
  getStockPrediction: (options?: { useCache?: boolean }) =>
    request<StockPredictionResponse>(
      `/api/analytics/stock-prediction?use_cache=${options?.useCache !== false ? "true" : "false"}`
    ),
  getAnalyticsModelStatus: () => request<AnalyticsModelStatusGroup>("/api/analytics/model-status"),
  retrainAnalyticsModels: () =>
    request<{ ok: boolean; message: string }>("/api/analytics/retrain", {
      method: "POST",
    }),
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
  logout: (userId: number) => requestWithUser<{ ok: boolean }>(userId, "/api/logout", { method: "POST" }),
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

  createPayMongoCheckoutSession: (payload: PayMongoCheckoutSessionPayload) =>
    request<{ data: any }>("/api/paymongo/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPayMongoCheckoutSession: (sessionId: string) =>
    request<{ data: any }>(`/api/paymongo/checkout-session/${sessionId}`),

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
  deleteUser: (userId: number, actorUserId: number) =>
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
  archiveSupplier: (supplierId: number) =>
    request<{ ok: boolean }>(`/api/suppliers/${supplierId}/archive`, {
      method: "PUT",
    }),

  getInventoryItems: () => request<InventoryItem[]>("/api/inventory/"),
  getInventoryTrace: (inventoryId: number) => request<InventoryStockEvent[]>(`/api/inventory/${inventoryId}/trace/`),
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
  addInventoryDiscrepancy: (inventoryId: number, payload: InventoryDiscrepancyPayload) =>
    request<{ ok: boolean }>(`/api/inventory/${inventoryId}/discrepancy/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteInventoryItem: (inventoryId: number) =>
    request<{ message: string }>(`/api/inventory/${inventoryId}/`, {
      method: "DELETE",
    }),

  getPurchaseOrders: () => request<any[]>("/api/purchase-orders/"),
  getPurchaseOrder: (orderId: string) => request<any>(`/api/purchase-orders/${orderId}`),
  getUpcomingDeliveries: () => request<{ deliveries: any[]; count: number }>("/api/purchase-orders/upcoming-deliveries"),
  createPurchaseOrder: (payload: { supplier_id: number; expected_delivery: string; items: Array<{ product_id: number; quantity: number; unit_price?: number }>; notes?: string }) =>
    request<{ ok: boolean; order_id: string }>("/api/purchase-orders/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  markOrderAsReceived: (orderId: string) =>
    request<{ ok: boolean }>(`/api/purchase-orders/${orderId}/receive`, {
      method: "PUT",
    }),
  deletePurchaseOrder: (orderId: string) =>
    request<{ ok: boolean }>(`/api/purchase-orders/${orderId}`, {
      method: "DELETE",
    }),
  archivePurchaseOrder: (orderId: string) =>
    request<{ ok: boolean }>(`/api/purchase-orders/${orderId}/archive`, {
      method: "PUT",
    }),

  getProductReturns: () => request<ProductReturn[]>("/api/product-returns/"),
  getProductReturn: (returnId: number) => request<ProductReturn>(`/api/product-returns/${returnId}`),
  createProductReturn: (payload: CreateProductReturnPayload) =>
    request<{ ok: boolean; return_id: number }>("/api/product-returns/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approveProductReturn: (returnId: number) =>
    request<{ ok: boolean }>(`/api/product-returns/${returnId}/approve`, {
      method: "PUT",
    }),
  rejectProductReturn: (returnId: number) =>
    request<{ ok: boolean }>(`/api/product-returns/${returnId}/reject`, {
      method: "PUT",
    }),
  archiveProductReturn: (returnId: number) =>
    request<{ ok: boolean }>(`/api/product-returns/${returnId}/archive`, {
      method: "PUT",
    }),

  // ──── Archive module ────────────────────────────────────────────────────
  getArchivedUsers: (actorUserId: number) =>
    requestAsActor<any[]>(actorUserId, "/api/archive/users"),
  restoreUser: (userId: number, actorUserId: number) =>
    requestAsActor<{ ok: boolean }>(actorUserId, `/api/archive/users/${userId}/restore`, {
      method: "PUT",
    }),
  permanentDeleteUser: (userId: number, actorUserId: number) =>
    requestAsActor<{ ok: boolean }>(actorUserId, `/api/archive/users/${userId}/permanent`, {
      method: "DELETE",
    }),
  getArchivedProducts: () => request<any[]>("/api/archive/products"),
  restoreProduct: (productId: number) =>
    request<{ ok: boolean }>(`/api/archive/products/${productId}/restore`, {
      method: "PUT",
    }),
  permanentDeleteProduct: (productId: number) =>
    request<{ ok: boolean }>(`/api/archive/products/${productId}/permanent`, {
      method: "DELETE",
    }),
  getArchivedSuppliers: () => request<any[]>("/api/archive/suppliers"),
  restoreSupplier: (supplierId: number) =>
    request<{ ok: boolean }>(`/api/archive/suppliers/${supplierId}/restore`, {
      method: "PUT",
    }),
  getArchivedOrders: () => request<any[]>("/api/archive/orders"),
  restoreOrder: (orderId: string) =>
    request<{ ok: boolean }>(`/api/archive/orders/${orderId}/restore`, {
      method: "PUT",
    }),
  getArchivedProductReturns: () => request<any[]>("/api/archive/product-returns"),
  restoreProductReturn: (returnId: number) =>
    request<{ ok: boolean }>(`/api/archive/product-returns/${returnId}/restore`, {
      method: "PUT",
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
