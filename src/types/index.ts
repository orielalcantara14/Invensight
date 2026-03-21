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
  description: string;
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

export interface SaleRecord {
  id: string;
  date: string;
  type: SaleType;
  customer: string;
  description: string;
  items: number;
  total: number;
  payment: string;
  status: PaymentStatus;
  mechanicAssigned?: string;
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

// ── Stock Movements ───────────────────────────────────────────────────────────

export type MovementType = 'In' | 'Out' | 'Adjustment' | 'Return';

export interface StockMovement {
  id: string;
  date: string;
  productName: string;
  type: MovementType;
  quantity: number;
  reference: string;
  notes: string;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  reorderLevel: number;
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

export type UserRole = 'Administrator' | 'Manager' | 'Sales Staff' | 'Warehouse Staff';
export type UserStatus = 'Active' | 'Inactive';

export interface User {
  id: number;
  username: string;
  fullName: string;
  employeeId: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
}

export interface Role {
  id: number;
  name: UserRole;
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
