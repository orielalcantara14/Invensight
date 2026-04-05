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

    @field_validator("customer_name", "customer_info", "address")
    @classmethod
    def sanitize_text_fields(cls, v):
        if v is None:
            return v
        return sanitize_string(v)

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v):
        allowed = {"Cash", "GCash", "PayMaya"}
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


class PayMongoPaymentIntentRequest(BaseModel):
    amount: int  # in centavos
    currency: str = "PHP"
    payment_method_allowed: str = "paymaya"
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None


class CreatePosProductRequest(BaseModel):
    sku: str
    product_name: str
    specific_category: Optional[str] = Field(default=None, max_length=150)
    category_id: Optional[int] = None
    supplier_id: int
    unit_price: float
    pos_price: Optional[float] = None
    unit_of_measurement: Optional[str] = None
    stock: int
    status: str = "Active"


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
        if len(v) > 200:
            raise ValueError("Password exceeds maximum length")
        return v


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


class InventoryDiscrepancyRequest(BaseModel):
    quantity_change: int
    reason: str


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


class AnalyticsModelStatus(BaseModel):
    model_key: str
    status: str
    engine: str
    message: str
    last_trained_at: Optional[str] = None
    next_scheduled_run: Optional[str] = None
    training_duration_ms: Optional[int] = None


class AnalyticsOverviewResponse(BaseModel):
    forecast_accuracy: Optional[float] = None
    low_stock_alerts: int
    critical_stock_count: int
    low_stock_count: int
    prediction_models: int
    last_updated: Optional[str] = None
    model_status: Optional[AnalyticsModelStatus] = None
    served_from_cache: bool = False
    sales_forecast_engine: Optional[str] = None
    stock_forecast_engine: Optional[str] = None
    cache_generated_at: Optional[str] = None


class ForecastSeriesPoint(BaseModel):
    date: str
    actual_sales: float
    forecast_sales: float
    lower_bound: float
    upper_bound: float
    trend_component: Optional[float] = None
    weekly_component: Optional[float] = None


class ProductForecastItem(BaseModel):
    product_id: int
    product_name: str
    current_stock: int
    predicted_demand_30d: float
    reorder_by: Optional[str] = None
    confidence: float
    days_to_stockout: Optional[float] = None
    reorder_level: int


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
    current_stock: int
    stock_30d: float
    stock_60d: float
    stock_90d: float
    recommended_order: int
    urgency: Literal["High", "Medium", "Low"]


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
