import type { Cart, CartItem, CartTotals, DiscountCode } from './types.js';
import { discountAmount, isDiscountValid } from './discounts.js';

/** Free shipping from 200 PLN upwards. */
export const FREE_SHIPPING_THRESHOLD = 20_000;

/** Shipping cost below the threshold: 15 PLN. */
export const SHIPPING_COST = 1_500;

/** Maximum quantity of a single cart line. */
export const MAX_ITEM_QUANTITY = 10;

/**
 * Clamps a quantity into the allowed 1..MAX_ITEM_QUANTITY range.
 * Fractional values are floored - a cart has no notion of "one and a half T-shirts".
 */
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  const whole = Math.floor(quantity);
  if (whole < 1) return 1;
  if (whole > MAX_ITEM_QUANTITY) return MAX_ITEM_QUANTITY;
  return whole;
}

export function subtotal(items: CartItem[]): number {
  let total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (total == 0) return 0;
  return total;
}

export function itemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Shipping cost. Free above the threshold, or when the discount code says so.
 * Note the threshold is applied to the amount **after** the discount - otherwise a discount
 * could push an order below the threshold and the customer would still get free shipping.
 */
export function shippingCost(subtotalAfterDiscount: number, code: DiscountCode | null): number {
  if (subtotalAfterDiscount <= 0) return 0;
  if (code && code.freeShipping) return 0;
  return subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}

/**
 * Computes the full set of cart amounts. An unknown or expired code is silently ignored here -
 * validating it and telling the user about it is the responsibility of the layer above.
 */
export function calculateTotals(
  cart: Cart,
  codes: DiscountCode[],
  now: Date = new Date(),
): CartTotals {
  const sub = subtotal(cart.items);
  const code = cart.discountCode
    ? (codes.find((c) => c.code === cart.discountCode) ?? null)
    : null;
  const usable = code && isDiscountValid(code, now) ? code : null;

  const discount = discountAmount(sub, usable);
  const afterDiscount = sub - discount;
  const shipping = shippingCost(afterDiscount, usable);

  return {
    subtotal: sub,
    discount,
    shipping,
    total: afterDiscount + shipping,
  };
}

/** Formats grosze as a PLN amount, e.g. 12345 -> "123,45 zł". */
export function formatPrice(grosze: number): string {
  const zl = Math.trunc(grosze / 100);
  const gr = Math.abs(grosze % 100);
  return `${zl},${String(gr).padStart(2, '0')} zł`;
}
