from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Literal
import re


def sanitize_string(value: str) -> str:
    if not value:
        return value
    value = value.strip()
    value = re.sub(r'<[^>]*>', '', value)
    value = re.sub(r'[\'";\\]', '', value)
    return value[:500]


class CartItem(BaseModel):
    product_id: int
    quantity: int

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v):
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        if v > 10000:
            raise ValueError("Quantity exceeds maximum allowed")
        return v
    unit_price: float
    is_service: Optional[bool] = False
    mechanic_name: Optional[str] = None


class CreateSaleRequest(BaseModel):
    pos_terminal_id: int
    user_id: int
    customer_info: str = "Walk In customer"
    customer_name: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    payment_method: str = "Cash"
    cash_received: float
    items: List[CartItem]
    service_charge: float = 0.0
    paymongo_source_id: Optional[str] = None
    cash_amount: float = 0.0
    ewallet_amount: float = 0.0
    payment_status: Optional[str] = "Paid"
    failure_reason: Optional[str] = None

    @field_validator("customer_name", "customer_info", "address")
    @classmethod
    def sanitize_text_fields(cls, v):
        if v is None:
            return v
        return sanitize_string(v)

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v):
        allowed = {"Cash", "GCash", "PayMaya", "Split"}
        if v not in allowed:
            raise ValueError(f"Payment method must be one of: {', '.join(allowed)}")
        return v

    @field_validator("cash_received")
    @classmethod
    def validate_cash_received(cls, v):
        if v < 0:
            raise ValueError("Cash received cannot be negative")
        if v > 1000000:
            raise ValueError("Cash received exceeds maximum allowed amount")
        return v


class PayMongoSourceRequest(BaseModel):
    amount: int  # in centavos
    type: str = "gcash"
    currency: str = "PHP"
    description: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class PayMongoPaymentIntentRequest(BaseModel):
    amount: int  # in centavos
    currency: str = "PHP"
    payment_method_allowed: str = "paymaya"
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

class PayMongoCheckoutSessionRequest(BaseModel):
    amount: int  # in centavos
    currency: str = "PHP"
    description: str = "POS Sale"
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    items: List[Dict] = Field(default_factory=list)


class CreatePosProductRequest(BaseModel):
    sku: Optional[str] = None
    product_name: str
    specific_category: Optional[str] = Field(default=None, max_length=150)
    category_id: Optional[int] = None
    supplier_id: int
    unit_price: float
    pos_price: Optional[float] = None
    unit_of_measurement: Optional[str] = None
    stock: int
    status: str = "Active"
    serial_start: Optional[str] = None
    is_service: Optional[bool] = False

    @field_validator("product_name", "specific_category", "unit_of_measurement")
    @classmethod
    def sanitize_product_fields(cls, v):
        if v is None: return v
        return sanitize_string(v)


class UpdatePosProductRequest(BaseModel):
    sku: str
    product_name: str
    specific_category: Optional[str] = Field(default=None, max_length=150)
    category_id: Optional[int] = None
    supplier_id: Optional[int] = None
    unit_price: float
    pos_price: Optional[float] = None
    unit_of_measurement: Optional[str] = None
    stock: int
    status: str
    is_service: Optional[bool] = False


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    employee_id: int
    role: str
    is_active: bool
    last_login: Optional[str] = None
    email: Optional[str] = None
    permissions_json: Optional[Dict[str, List[str]]] = None
    avatar_url: Optional[str] = None


class UpdateUserRequest(BaseModel):
    username: str
    full_name: str
    role: str
    is_active: bool
    new_password: Optional[str] = None
    permissions: Optional[Dict[str, List[str]]] = None
    email: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Full name is required")
        return sanitize_string(v)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if not v or not v.strip():
            raise ValueError("Username is required")
        return v.strip().lower()


class CreateUserRequest(BaseModel):
    username: str
    full_name: str
    password: str
    role: str
    permissions: Dict[str, List[str]] = Field(default_factory=dict)
    email: Optional[str] = None
    is_active: bool = True

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if not v or not v.strip():
            raise ValueError("Username is required")
        if len(v) > 100:
            raise ValueError("Username exceeds maximum length")
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        return v.strip()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Full name is required")
        if len(v) > 200:
            raise ValueError("Full name exceeds maximum length")
        return sanitize_string(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if not v:
            raise ValueError("Password is required")
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 200:
            raise ValueError("Password exceeds maximum length")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return v
        if len(v) > 255:
            raise ValueError("Email exceeds maximum length")
        if v and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError("Invalid email format")
        return v.strip().lower()


class RoleResponse(BaseModel):
    id: int
    name: str
    permissions: Dict[str, List[str]]
    user_count: int


class UserManagementStatsResponse(BaseModel):
    """KPIs for the User Management dashboard."""

    active_sessions: int
    audit_log_count: int


class CreateRoleRequest(BaseModel):
    name: str
    permissions: Optional[Dict[str, List[str]]] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Role name is required")
        return sanitize_string(v)


class UpdateRoleRequest(BaseModel):
    name: str
    permissions: Optional[Dict[str, List[str]]] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Role name is required")
        return sanitize_string(v)


class LoginRequest(BaseModel):
    """`username` may be the account username, numeric employee id, or e.g. EMP-0001."""

    username: str
    password: str
    force_disconnect: bool = False

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if not v or not v.strip():
            raise ValueError("Username is required")
        if len(v) > 100:
            raise ValueError("Username exceeds maximum length")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if not v:
            raise ValueError("Password is required")
        if len(v) > 200:
            raise ValueError("Password exceeds maximum length")
        return v


class LoginResponse(BaseModel):
    user_id: int
    username: str
    full_name: str
    employee_id: int
    role: str
    email: Optional[str] = None
    permissions: Optional[Dict[str, List[str]]] = None
    mfa_required: bool = False
    mfa_method: Optional[Literal["email", "totp"]] = "email"
    totp_enabled: Optional[bool] = False
    must_change_password: bool = False
    otp: Optional[str] = None
    avatar_url: Optional[str] = None
    session_token: Optional[str] = None


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
    avatar_url: Optional[str] = None
    temp_email: Optional[str] = None
    email_verification_required: Optional[bool] = False
    totp_enabled: Optional[bool] = False


class SetupTOTPRequest(BaseModel):
    user_id: int


class SetupTOTPResponse(BaseModel):
    secret: str
    qr_code: str
    otpauth_url: str


class EnableTOTPRequest(BaseModel):
    user_id: int
    secret: str
    totp_code: str


class DisableTOTPRequest(BaseModel):
    user_id: int
    password: str


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

    @field_validator("full_name", "address")
    @classmethod
    def sanitize_text_fields(cls, v):
        if v is None:
            return v
        return sanitize_string(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return v
        if len(v) > 255:
            raise ValueError("Email exceeds maximum length")
        if v and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError("Invalid email format")
        return v.strip().lower()


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v):
        if not v:
            raise ValueError("New password is required")
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r'[A-Z]', v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r'\d', v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r'[!@#$%^&*]', v):
            raise ValueError("Password must contain at least one special character (!@#$%^&*)")
        return v

class VerifyOTPRequest(BaseModel):
    user_id: int
    otp: str
    force_disconnect: bool = False

class ResendOTPRequest(BaseModel):
    user_id: int

class VerifyEmailRequest(BaseModel):
    otp: str

class ForgotPasswordRequest(BaseModel):
    email: str
    username: str

class ResetPasswordRequest(BaseModel):
    email: str
    username: str
    otp: str
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
    serial_start: Optional[str] = None
    serial_end: Optional[str] = None


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
    serial_start: Optional[str] = None
    serial_end: Optional[str] = None
    unit_price: float = 0.0
    pos_price: Optional[float] = None


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
    serial_start: Optional[str] = None
    serial_end: Optional[str] = None
    unit_price: float = 0.0
    pos_price: Optional[float] = None


class InventoryDiscrepancyRequest(BaseModel):
    quantity_change: int
    reason: str


class BulkRestockItemRequest(BaseModel):
    inventory_id: int
    quantity_to_add: int
    reason_adjustment: Optional[str] = "Restock"

    @field_validator("quantity_to_add")
    @classmethod
    def validate_qty(cls, v):
        if v <= 0:
            raise ValueError("Quantity to add must be greater than 0")
        return v


class BulkRestockRequest(BaseModel):
    items: List[BulkRestockItemRequest]



class PurchaseOrderItemRequest(BaseModel):
    product_id: int
    quantity: int
    unit_price: Optional[float] = None
    purchase_unit: Optional[str] = "PCS"
    conversion: Optional[str] = "1 PCS / UNIT"
    conversion_rate: Optional[int] = 1


class CreatePurchaseOrderRequest(BaseModel):
    supplier_id: int
    expected_delivery: str
    items: List[PurchaseOrderItemRequest]
    notes: Optional[str] = None


class CreateReplacementPurchaseOrderRequest(BaseModel):
    reference_order_id: str
    supplier_id: int
    expected_delivery: str
    replacement_reason: str
    replacement_type: str = "Price Change"
    items: List[PurchaseOrderItemRequest]
    notes: Optional[str] = None


class PurchaseOrderItemResponse(BaseModel):
    item_id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    unit_price: Optional[float] = None
    damage_count: int = 0
    purchase_unit: Optional[str] = "PCS"
    conversion: Optional[str] = "1 PCS / UNIT"
    conversion_rate: Optional[int] = 1
    unit_of_measurement: Optional[str] = None


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
    receipt_number: Optional[str] = None
    reference_po_id: Optional[str] = None
    replaced_by_po_id: Optional[str] = None
    replacement_reason: Optional[str] = None
    replacement_type: Optional[str] = None
    voided_at: Optional[str] = None
    voided_by_user_id: Optional[int] = None
    voided_by_name: Optional[str] = None
    void_reason: Optional[str] = None
    items: Optional[List[PurchaseOrderItemResponse]] = None


class MarkOrderReceivedItem(BaseModel):
    product_id: int
    received_quantity: Optional[int] = None
    damage_count: int = 0
    damage_unit: Optional[str] = "PCS"

class MarkOrderReceivedRequest(BaseModel):
    receipt_number: str
    notes: Optional[str] = None
    items: List[MarkOrderReceivedItem]


class MarkOrderNotReceivedRequest(BaseModel):
    notes: str


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


class CustomerReturnItemRequest(BaseModel):
    product_id: int
    quantity: int
    is_defective: bool = False
    is_damaged: bool = False


class CreateCustomerReturnRequest(BaseModel):
    sale_id: int
    return_type: str  # 'Refund' or 'Exchange'
    reason: Optional[str] = None
    items: List[CustomerReturnItemRequest]


class CustomerReturnItemResponse(BaseModel):
    item_id: int
    product_id: int
    product_name: str
    quantity: int
    is_defective: bool
    is_damaged: bool


class CustomerReturnResponse(BaseModel):
    return_id: int
    rma_number: str
    sale_id: int
    customer_name: Optional[str] = None
    contact_number: Optional[str] = None
    return_date: str
    return_type: str
    status: str
    reason: Optional[str] = None
    items: List[CustomerReturnItemResponse]


class AuditLogEntryResponse(BaseModel):
    log_id: int
    user_id: Optional[int] = None
    username: str
    role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    timestamp: str
    details: Optional[str] = None


class UpdateAuditLogRequest(BaseModel):
    action: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    timestamp: Optional[str] = None
    details: Optional[str] = None


class SalesTrendItem(BaseModel):
    month: str
    actual_sales: float
    forecast_sales: float


class SalesPerformancePoint(BaseModel):
    label: str
    revenue: float
    profit: float
    transactions: int


class SalesByCategoryItem(BaseModel):
    category: str
    value: float
    percentage: float


class TopProductItem(BaseModel):
    name: str
    units_sold: int
    revenue: float
    current_stock: int
    status: str


class DashboardStatsResponse(BaseModel):
    total_revenue: float
    total_profit: float
    total_transactions: int
    completed_sales: int
    failed_payments: int
    refunded_sales: int
    out_of_stock_count: int
    low_stock_count: int
    sales_performance: List[SalesPerformancePoint]
    sales_trend: List[SalesTrendItem]
    sales_by_category: List[SalesByCategoryItem]
    top_products: List[TopProductItem]


class AnalyticsModelStatus(BaseModel):
    model_key: str
    status: str
    engine: str
    message: str
    last_trained_at: Optional[str] = None
    next_scheduled_run: Optional[str] = None
    training_duration_ms: Optional[int] = None


class TopSeller(BaseModel):
    name: str
    revenue: float
    category: Optional[str] = None


class TopMechanic(BaseModel):
    name: str
    services_count: int
    revenue: float


class AnalyticsOverviewResponse(BaseModel):
    forecast_accuracy: Optional[float] = None
    today_sales_total: float = 0.0
    items_out: int = 0
    items_low: int = 0
    items_ok: int = 0
    low_stock_alerts: int
    critical_stock_count: int
    low_stock_count: int
    prediction_models: int
    top_sellers: List[TopSeller] = Field(default_factory=list)
    top_mechanics: List[TopMechanic] = Field(default_factory=list)
    last_updated: Optional[str] = None
    model_status: Optional[AnalyticsModelStatus] = None
    served_from_cache: bool = False
    sales_forecast_engine: Optional[str] = None
    stock_forecast_engine: Optional[str] = None
    cache_generated_at: Optional[str] = None

    @field_validator("top_sellers")
    @classmethod
    def sanitize_top_sellers(cls, v):
        for item in v:
            if hasattr(item, "name"):
                item.name = sanitize_string(item.name)
            if hasattr(item, "category"):
                item.category = sanitize_string(item.category)
        return v

    @field_validator("today_sales_total")
    @classmethod
    def validate_positive_revenue(cls, v):
        return max(0.0, v or 0.0)


class ForecastSeriesPoint(BaseModel):
    date: str
    actual_sales: Optional[float] = None
    forecast_sales: Optional[float] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    trend_component: Optional[float] = None
    weekly_component: Optional[float] = None
    yearly_component: Optional[float] = None
    seasonal_component: Optional[float] = None
    holidays_component: Optional[float] = None
    smoothed_sales: Optional[float] = None
    event_icon: Optional[str] = None


class ProductForecastItem(BaseModel):
    product_id: int
    product_name: str
    current_stock: int
    predicted_demand_30d: float
    reorder_by: Optional[str] = None
    confidence: float
    days_to_stockout: Optional[float] = None
    reorder_level: int

    @field_validator("product_name")
    @classmethod
    def sanitize_product_name(cls, v):
        return sanitize_string(v)


class SalesForecastResponse(BaseModel):
    next_period_forecast: Optional[float] = None
    forecast_accuracy: Optional[float] = None
    trend_direction: str
    series: List[ForecastSeriesPoint]
    product_forecasts: List[ProductForecastItem]
    model_status: Optional[AnalyticsModelStatus] = None
    served_from_cache: bool = False
    forecast_engine: str = "rolling_mean"
    cache_generated_at: Optional[str] = None


class StockRiskStats(BaseModel):
    high_risk: int
    medium_risk: int
    low_risk: int
    avg_days_to_stockout: Optional[float] = None


class StockRiskAnalysisPoint(BaseModel):
    product_name: str
    days_to_stockout: Optional[float] = None
    predicted_demand_30d: float
    current_stock: int
    confidence: float


class StockHorizonPrediction(BaseModel):
    product_id: int
    product_name: str
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    current_stock: int
    stock_30d: float
    stock_60d: float
    stock_90d: float
    recommended_order: int
    urgency: Literal["High", "Medium", "Low"]
    unit_price: float = 0.0
    reorder_level: int = 10


class CriticalStockItem(BaseModel):
    product_name: str
    days_to_stockout: Optional[float] = None
    recommended_order: int


class StockPredictionResponse(BaseModel):
    risk_stats: StockRiskStats
    risk_analysis: List[StockRiskAnalysisPoint]
    horizon_predictions: List[StockHorizonPrediction]
    critical_items: List[CriticalStockItem]
    model_status: Optional[AnalyticsModelStatus] = None
    served_from_cache: bool = False
    forecast_engine: str = "rolling_average"
    cache_generated_at: Optional[str] = None


class AnalyticsModelStatusGroupResponse(BaseModel):
    overview: AnalyticsModelStatus
    forecast_30d: AnalyticsModelStatus
    stock_prediction: AnalyticsModelStatus


class AnalyticsRetrainResponse(BaseModel):
    ok: bool
    message: str


class CreateMechanicRequest(BaseModel):
    name: str
    status: Optional[str] = "Active"

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Mechanic name is required")
        return sanitize_string(v)


class UpdateMechanicRequest(BaseModel):
    name: str
    status: str
    total_earnings: Optional[float] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Mechanic name is required")
        return sanitize_string(v)

