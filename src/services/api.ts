const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface Product {
  product_id: number;
  product_name: string;
  unit_price: number;
  sku: string;
  description: string;
  category_name: string;
  category_id: number;
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

export interface CartItemPayload {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreateSalePayload {
  pos_terminal_id: number;
  user_id: number;
  customer_info: string;
  cash_received: number;
  items: CartItemPayload[];
  service_charge: number;
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  getProducts: () => request<Product[]>("/api/products"),
  getCategories: () => request<Category[]>("/api/categories"),
  getTerminals: () => request<Terminal[]>("/api/pos-terminals"),
  createSale: (payload: CreateSalePayload) =>
    request<SaleResult>("/api/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
