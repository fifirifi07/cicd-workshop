import { randomUUID } from 'node:crypto';
import type { Cart, CartItem, Order, Product, Size } from '../shared/types.js';
import { clampQuantity } from '../shared/cart.js';
import { PRODUCTS } from './data/products.js';

/**
 * In-process storage. There is no database here and that is a design decision:
 * the workshop is about CI/CD, not about schema migrations. Restart means a clean,
 * repeatable state, which is what keeps parallel test runs from contaminating each other.
 *
 * This module is shaped as a repository, so swapping the `Map` for a real database
 * would not touch the routes or the tests.
 */
const carts = new Map<string, Cart>();
const orders = new Map<string, Order>();

export function listProducts(): Product[] {
  return PRODUCTS;
}

export function findProduct(id: string): Product | null {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

export function createCart(): Cart {
  const cart: Cart = { id: randomUUID(), items: [], discountCode: null };
  carts.set(cart.id, cart);
  return cart;
}

export function findCart(id: string): Cart | null {
  return carts.get(id) ?? null;
}

export type AddItemError = 'product-not-found' | 'out-of-stock' | 'size-required';

export type AddItemResult = { ok: true; cart: Cart } | { ok: false; error: AddItemError };

/**
 * Adds a line to the cart. The same product/size pair increases the quantity instead of
 * creating a second row - otherwise the cart would degenerate into an event log.
 */
export function addItem(
  cart: Cart,
  productId: string,
  size: Size | null,
  quantity: number,
): AddItemResult {
  const product = findProduct(productId);
  if (!product) return { ok: false, error: 'product-not-found' };
  if (product.stock <= 0) return { ok: false, error: 'out-of-stock' };
  if (product.sizes.length > 0 && (size === null || !product.sizes.includes(size))) {
    return { ok: false, error: 'size-required' };
  }

  const existing = cart.items.find((i) => i.productId === productId && i.size === size);
  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + quantity);
  } else {
    const item: CartItem = {
      id: randomUUID(),
      productId: product.id,
      name: product.name,
      price: product.price,
      size: product.sizes.length > 0 ? size : null,
      quantity: clampQuantity(quantity),
    };
    cart.items.push(item);
  }

  return { ok: true, cart };
}

export function updateItemQuantity(cart: Cart, itemId: string, quantity: number): boolean {
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) return false;
  item.quantity = clampQuantity(quantity);
  return true;
}

export function removeItem(cart: Cart, itemId: string): boolean {
  const index = cart.items.findIndex((i) => i.id === itemId);
  if (index === -1) return false;
  cart.items.splice(index, 1);
  return true;
}

export function saveOrder(order: Order): Order {
  orders.set(order.id, order);
  return order;
}

export function findOrder(id: string): Order | null {
  return orders.get(id) ?? null;
}

export function newOrderId(): string {
  return `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
}

/** Used by tests only, to isolate runs from one another. */
export function resetStore(): void {
  carts.clear();
  orders.clear();
}
