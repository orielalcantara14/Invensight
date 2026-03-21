from pydantic import BaseModel
from typing import List


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
