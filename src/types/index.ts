// ── Inventory ────────────────────────────────────────────────────────────────

export type StockStatus = 'Normal' | 'Low' | 'Critical';

export interface InventoryItem {
  id: string;
  productName: string;
  category: string;
  supplier: string;
  stock: number;
  reorderLevel: number;
  price: number;
  status: StockStatus;
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  reorderLevel: number;
  dateAdded: string;
}

export interface ProductCategory {
  id: number;
  name: string;
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export type SaleType = 'Service' | 'Product Sale';
export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded';

export interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface SaleRecord {
  invoice_id: number;
  invoice_date: string;
  total_amount: number;
  customer_info: string;
  contact_number?: string;
  payment_method: string;
  payment_status: string;
  cash_received: number;
  change_amount: number;
  transaction_timestamp: string;
  items: SaleItem[];
}

export interface SaleDetail extends SaleRecord {
  tax_amount: number;
  service_charge: number;
  cash_given: number;
}

export interface MonthlySales {
  month: string;
  sales: number;
  forecast: number;
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export type SupplierStatus = 'Active' | 'Inactive';

export interface Supplier {
  id: string;
  name: string;
  address: string;
  email: string;
  contactInfo: string;
  productsSupplied: number;
  totalOrders: number;
  status: SupplierStatus;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export type OrderStatus = 'Pending' | 'Processing' | 'Delivered' | 'Cancelled';
export type ReturnStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PurchaseOrder {
  id: string;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  totalCost: number;
  status: OrderStatus;
}

export interface ProductReturn {
  id: string;
  productName: string;
  supplier: string;
  returnDate: string;
  quantity: number;
  reason: string;
  status: ReturnStatus;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditEntity = 'Product' | 'Sale' | 'User' | 'Inventory' | 'Order';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string;
  details: string;
}

// ── Users ─────────────────────────────────────────────────────────────────────

/** Display label for a user’s assigned role (may be any name from the roles table). */
export type UserRole = string;
export type UserStatus = 'Active' | 'Inactive';

export interface User {
  id: number;
  username: string;
  fullName: string;
  employeeId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
  permissions?: Record<string, string[]>;
}

export interface Role {
  id: number;
  name: string;
  permissions: string;
  userCount: number;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface GeneratedReport {
  id: string;
  reportType: string;
  dateRange: string;
  generatedDate: string;
  generatedBy: string;
}
