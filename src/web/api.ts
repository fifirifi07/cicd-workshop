import type {
  Cart,
  CartTotals,
  CustomerDetails,
  Order,
  Product,
  ProductQuery,
  Size,
} from '../shared/types.js';
import type { Slice } from '../shared/filters.js';

export type CartWithTotals = Cart & { totals: CartTotals };

const CART_STORAGE_KEY = 'cicd-workshop:cartId';

/**
 * Error carrying the machine-readable code returned by the API.
 *
 * The API speaks English because its contract is public and documented in OpenAPI;
 * the user interface is Polish. `code` is what lets the UI translate a failure instead
 * of echoing a backend string at the customer.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; reason?: string };
    throw new ApiError(
      body.error ?? `Request failed (${response.status})`,
      body.reason ?? null,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function fetchProducts(query: ProductQuery): Promise<Slice<Product>> {
  const params = new URLSearchParams();
  if (query.category) params.set('category', query.category);
  if (query.search) params.set('search', query.search);
  if (query.sort) params.set('sort', query.sort);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.offset) params.set('offset', String(query.offset));
  return request<Slice<Product>>(`/api/products?${params.toString()}`);
}

export function fetchProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${id}`);
}

/**
 * Returns the cart stored in localStorage, or creates a new one.
 * If the stored cart no longer exists (for example the server restarted), we quietly
 * create another one - there is no reason to show the user an error for that.
 */
export async function ensureCart(): Promise<CartWithTotals> {
  const stored = readStoredCartId();

  if (stored) {
    try {
      return await request<CartWithTotals>(`/api/cart/${stored}`);
    } catch {
      // The stored cart is gone; a new one is created below.
    }
  }

  const created = await request<CartWithTotals>('/api/cart', { method: 'POST' });
  writeStoredCartId(created.id);
  return created;
}

export function addToCart(
  cartId: string,
  productId: string,
  size: Size | null,
  quantity: number,
): Promise<CartWithTotals> {
  return request<CartWithTotals>(`/api/cart/${cartId}/items`, {
    method: 'POST',
    body: JSON.stringify({ productId, size, quantity }),
  });
}

export function changeQuantity(
  cartId: string,
  itemId: string,
  quantity: number,
): Promise<CartWithTotals> {
  return request<CartWithTotals>(`/api/cart/${cartId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export function removeFromCart(cartId: string, itemId: string): Promise<CartWithTotals> {
  return request<CartWithTotals>(`/api/cart/${cartId}/items/${itemId}`, { method: 'DELETE' });
}

export function applyDiscount(cartId: string, code: string): Promise<CartWithTotals> {
  return request<CartWithTotals>(`/api/cart/${cartId}/discount`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function placeOrder(cartId: string, customer: CustomerDetails): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ cartId, customer }),
  });
}

export function fetchOrder(id: string): Promise<Order> {
  return request<Order>(`/api/orders/${id}`);
}

function readStoredCartId(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredCartId(id: string): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, id);
  } catch {
    // Private mode or blocked site data: the application must keep working regardless.
  }
}
