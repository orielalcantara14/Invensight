from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class CartItem(BaseModel):
    product_id: int
    quantity: int
    unit_price: float


class CreateSaleRequest(BaseModel):
    pos_terminal_id: int
    user_id: int
    customer_info: str = "Walk-in Customer"
    customer_name: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    payment_method: str = "Cash"
    cash_received: float
    items: List[CartItem]
    service_charge: float = 0.0
    paymongo_source_id: Optional[str] = None


class PayMongoSourceRequest(BaseModel):
    amount: int  # in centavos
    type: str = "gcash"
    currency: str = "PHP"
    description: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None


class PayMongoPaymentIntentRequest(BaseModel):
    amount: int  # in centavos
    currency: str = "PHP"
    payment_method_allowed: str = "paymaya"
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None


class CreatePosProductRequest(BaseModel):
    sku: str
    product_name: str
    image_url: Optional[str] = None
    specific_category: Optional[str] = Field(default=None, max_length=150)
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    unit_price: float
    pos_price: Optional[float] = None
    unit_of_measurement: Optional[str] = None
    stock: int
    status: str = "Active"


class UpdatePosProductRequest(BaseModel):
    sku: str
    product_name: str
    image_url: Optional[str] = None
    specific_category: Optional[str] = Field(default=None, max_length=150)
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    unit_price: float
    pos_price: Optional[float] = None
    unit_of_measurement: Optional[str] = None
    stock: int
    status: str


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    employee_id: int
    role: str
    is_active: bool
    last_login: Optional[str] = None
    email: Optional[str] = None


class UpdateUserRequest(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    role: str
    is_active: bool
    new_password: Optional[str] = None
    permissions: Optional[Dict[str, List[str]]] = None


class CreateUserRequest(BaseModel):
    username: str
    full_name: str
    password: str
    role: str
    permissions: Dict[str, List[str]] = Field(default_factory=dict)
    email: Optional[str] = None
    is_active: bool = True


class RoleResponse(BaseModel):
    id: int
    name: str
    permissions: str
    user_count: int


class UserManagementStatsResponse(BaseModel):
    """KPIs for the User Management dashboard."""

    active_sessions: int
    audit_log_count: int


class CreateRoleRequest(BaseModel):
    name: str
    permissions: str = ""


class UpdateRoleRequest(BaseModel):
    name: str
    permissions: str = ""


class LoginRequest(BaseModel):
    """`username` may be the account username, numeric employee id, or e.g. EMP-0001."""

    username: str
    password: str


class LoginResponse(BaseModel):
    user_id: int
    username: str
    full_name: str
    employee_id: int
    role: str
    email: Optional[str] = None


class ProfileResponse(BaseModel):
    user_id: int
    username: str
    full_name: str
    email: Optional[str] = None
    role: str
    address: Optional[str] = None
    employee_id: int
    created_date: Optional[str] = None
    last_login: Optional[str] = None
    password_changed_at: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ActivityItem(BaseModel):
    log_id: int
    action: str
    details: Optional[str] = None
    timestamp: str


class CategoryResponse(BaseModel):
    category_id: int
    category_name: str
    is_active: bool


class CreateCategoryRequest(BaseModel):
    category_name: str
    is_active: bool = True


class UpdateCategoryRequest(BaseModel):
    category_name: str
    is_active: bool


class SupplierResponse(BaseModel):
    supplier_id: int
    supplier_name: str
    address: Optional[str] = None
    email: Optional[str] = None
    contact_number: Optional[str] = None
    product_supplied: Optional[str] = None
    total_orders: int
    status: str = "Active"


class CreateSupplierRequest(BaseModel):
    supplier_name: str
    address: Optional[str] = None
    email: Optional[str] = None
    contact_number: Optional[str] = None
    product_supplied: Optional[str] = None
    status: str = "Active"


class UpdateSupplierRequest(BaseModel):
    supplier_name: str
    address: Optional[str] = None
    email: Optional[str] = None
    contact_number: Optional[str] = None
    product_supplied: Optional[str] = None
    status: str


class InventoryResponse(BaseModel):
    inventory_id: int
    product_id: int
    product_name: str
    sku: str
    category_id: Optional[int] = None
    category_name: str
    specific_category: Optional[str] = None
    unit_of_measurement: Optional[str] = None
    supplier_name: Optional[str] = None
    quantity: int
    expected: int
    actual: int
    difference: int
    reorder_level: int
    unit_price: float
    status: str
    last_updated: str
    reason_adjustment: str


class CreateInventoryRequest(BaseModel):
    product_name: str
    sku: str
    supplier_name: Optional[str] = None
    category_id: Optional[int] = None
    specific_category: Optional[str] = None
    unit_of_measurement: Optional[str] = None
    quantity: int
    expected: int
    reorder_level: int


class UpdateInventoryRequest(BaseModel):
    product_name: str
    sku: str
    supplier_name: Optional[str] = None
    category_id: Optional[int] = None
    specific_category: Optional[str] = None
    unit_of_measurement: Optional[str] = None
    quantity: int
    expected: int
    reorder_level: int
    actual: int
    reason_adjustment: str


class PurchaseOrderItemRequest(BaseModel):
    product_id: int
    quantity: int
    unit_price: Optional[float] = None


class CreatePurchaseOrderRequest(BaseModel):
    supplier_id: int
    expected_delivery: str
    items: List[PurchaseOrderItemRequest]
    notes: Optional[str] = None


class PurchaseOrderItemResponse(BaseModel):
    item_id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    unit_price: Optional[float] = None


class PurchaseOrderResponse(BaseModel):
    order_id: str
    supplier_id: int
    supplier_name: Optional[str] = None
    user_id: Optional[int] = None
    status: str
    expected_delivery: Optional[str] = None
    created_at: Optional[str] = None
    received_at: Optional[str] = None
    total_items: int
    notes: Optional[str] = None
    items: Optional[List[PurchaseOrderItemResponse]] = None


class ProductReturnItemRequest(BaseModel):
    product_id: int
    quantity: int


class CreateProductReturnRequest(BaseModel):
    supplier_id: int
    items: List[ProductReturnItemRequest]
    reason: Optional[str] = ""


class ProductReturnItemResponse(BaseModel):
    item_id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: int


class ProductReturnResponse(BaseModel):
    return_id: int
    supplier_id: int
    supplier_name: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    approved_at: Optional[str] = None
    rejected_at: Optional[str] = None
    reason: Optional[str] = None
    items: Optional[List[ProductReturnItemResponse]] = None
    total_quantity: int


class AuditLogEntryResponse(BaseModel):
    log_id: int
    user_id: int
    username: str
    action: str
    entity_type: str
    entity_id: int
    timestamp: str
    details: Optional[str] = None


class SalesTrendItem(BaseModel):
    month: str
    actual_sales: float
    forecast_sales: float


class SalesPerformancePoint(BaseModel):
    label: str
    revenue: float
    transactions: int


class SalesByCategoryItem(BaseModel):
    category: str
    value: float
    percentage: float


class TopProductItem(BaseModel):
    name: str
    units_sold: int
    current_stock: int
    status: str


class DashboardStatsResponse(BaseModel):
    total_revenue: float
    total_transactions: int
    completed_sales: int
    failed_payments: int
    sales_performance: List[SalesPerformancePoint]
    sales_trend: List[SalesTrendItem]
    sales_by_category: List[SalesByCategoryItem]
    top_products: List[TopProductItem]
