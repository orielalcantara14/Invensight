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
export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded' | 'Exchanged';

export interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_service?: boolean;
  mechanic_name?: string;
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

export type OrderStatus = 'Pending' | 'Processing' | 'Delivered' | 'Cancelled' | 'Received' | 'Archived';
export type ReturnStatus = 'Pending' | 'Approved' | 'Rejected';

// (Outdated PurchaseOrder removed to fix duplicate declaration)

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
export type UserStatus = 'Active' | 'Archived';

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
  permissions: Record<string, string[]>;
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

// ── Purchase Orders ───────────────────────────────────────────────────────────

export type POStatus = 'Pending' | 'Received' | 'Not Received' | 'Cancelled' | 'Archived' | 'Voided';

export interface PurchaseOrderItem {
  item_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number | null;
  damage_count: number;
  purchase_unit?: string;
  conversion?: string;
  conversion_rate?: number;
  unit_of_measurement?: string;
  received_quantity?: number;
}

export interface PurchaseOrder {
  order_id: string;
  supplier_id: number;
  supplier_name: string;
  user_id: number | null;
  status: POStatus;
  expected_delivery: string | null;
  created_at: string | null;
  received_at: string | null;
  total_items: number;
  notes: string | null;
  receipt_number: string | null;
  reference_po_id?: string | null;
  replaced_by_po_id?: string | null;
  replacement_reason?: string | null;
  replacement_type?: string | null;
  voided_at?: string | null;
  voided_by_user_id?: number | null;
  voided_by_name?: string | null;
  origin_po_id?: string | null;
  origin_chain_ids?: string[];
  replacement_depth?: number;
  origin_chain?: Array<{
    order_id: string;
    status: POStatus;
    created_at?: string | null;
    voided_at?: string | null;
    void_reason?: string | null;
    replacement_reason?: string | null;
    replacement_type?: string | null;
    reference_po_id?: string | null;
    replaced_by_po_id?: string | null;
    total_items?: number;
    created_by_name?: string | null;
    voided_by_name?: string | null;
  }>;
  forward_chain?: Array<{
    order_id: string;
    status: POStatus;
    created_at?: string | null;
    voided_at?: string | null;
    void_reason?: string | null;
    replacement_reason?: string | null;
    replacement_type?: string | null;
    replaced_by_po_id?: string | null;
    total_items?: number;
    created_by_name?: string | null;
  }>;
  latest_po_id?: string | null;
  items?: PurchaseOrderItem[];
}
