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
    cash_received: float
    items: List[CartItem]
    service_charge: float = 0.0


class CreatePosProductRequest(BaseModel):
    sku: str
    product_name: str
    description: str = ""
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    pos_price: float
    stock: int
    status: str = "Active"


class UpdatePosProductRequest(BaseModel):
    sku: str
    product_name: str
    description: str = ""
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    pos_price: float
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
