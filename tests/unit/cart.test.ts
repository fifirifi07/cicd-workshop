import { describe, expect, it } from 'vitest';
import {
  FREE_SHIPPING_THRESHOLD,
  MAX_ITEM_QUANTITY,
  SHIPPING_COST,
  calculateTotals,
  clampQuantity,
  formatPrice,
  itemCount,
  shippingCost,
  subtotal,
} from '../../src/shared/cart.js';
import { DISCOUNT_CODES } from '../../src/shared/discounts.js';
import type { Cart, CartItem } from '../../src/shared/types.js';

function cartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'i-1',
    productId: 'p-001',
    name: 'Koszulka Debugger',
    price: 8900,
    size: 'M',
    quantity: 1,
    ...overrides,
  };
}

function cartOf(items: CartItem[], discountCode: string | null = null): Cart {
  return { id: 'c-1', items, discountCode };
}

/** A date inside the validity window of the evergreen codes, and after SUMMER20 expired. */
const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('clampQuantity', () => {
  it('raises values below one to 1', () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
  });

  it('clamps values above the limit', () => {
    expect(clampQuantity(11)).toBe(MAX_ITEM_QUANTITY);
    expect(clampQuantity(999)).toBe(MAX_ITEM_QUANTITY);
  });

  it('floors fractional values', () => {
    expect(clampQuantity(3.9)).toBe(3);
  });

  it('treats any non-finite value as 1', () => {
    // A safe default rather than the maximum: Infinity in a quantity field is a symptom
    // of a bug, not a customer's wish.
    expect(clampQuantity(Number.NaN)).toBe(1);
    expect(clampQuantity(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clampQuantity(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});

describe('subtotal and itemCount', () => {
  it('an empty cart is worth zero', () => {
    expect(subtotal([])).toBe(0);
    expect(itemCount([])).toBe(0);
  });

  it('multiplies price by quantity and sums the lines', () => {
    const items = [cartItem({ quantity: 2 }), cartItem({ id: 'i-2', price: 1900, quantity: 3 })];
    expect(subtotal(items)).toBe(8900 * 2 + 1900 * 3);
    expect(itemCount(items)).toBe(5);
  });
});

describe('shippingCost', () => {
  it('charges shipping below the threshold', () => {
    expect(shippingCost(FREE_SHIPPING_THRESHOLD - 1, null)).toBe(SHIPPING_COST);
  });

  it('shipping is free exactly at the threshold', () => {
    expect(shippingCost(FREE_SHIPPING_THRESHOLD, null)).toBe(0);
  });

  it('shipping is free above the threshold', () => {
    expect(shippingCost(FREE_SHIPPING_THRESHOLD + 10_000, null)).toBe(0);
  });

  it('a free-shipping code waives the fee regardless of the amount', () => {
    const code = DISCOUNT_CODES.find((c) => c.code === 'FREESHIP')!;
    expect(shippingCost(1000, code)).toBe(0);
  });

  it('an empty cart incurs no shipping cost', () => {
    expect(shippingCost(0, null)).toBe(0);
  });
});

describe('calculateTotals', () => {
  it('without a discount the total is goods plus shipping', () => {
    const totals = calculateTotals(cartOf([cartItem()]), DISCOUNT_CODES, NOW);
    expect(totals).toEqual({
      subtotal: 8900,
      discount: 0,
      shipping: SHIPPING_COST,
      total: 8900 + SHIPPING_COST,
    });
  });

  it('applies a percentage discount', () => {
    const totals = calculateTotals(cartOf([cartItem()], 'WELCOME10'), DISCOUNT_CODES, NOW);
    expect(totals.discount).toBe(890);
    expect(totals.total).toBe(8900 - 890 + SHIPPING_COST);
  });

  it('ignores an expired code', () => {
    const totals = calculateTotals(cartOf([cartItem()], 'SUMMER20'), DISCOUNT_CODES, NOW);
    expect(totals.discount).toBe(0);
  });

  it('ignores a code missing from the catalogue', () => {
    const totals = calculateTotals(cartOf([cartItem()], 'NIE-MA-TAKIEGO'), DISCOUNT_CODES, NOW);
    expect(totals.discount).toBe(0);
    expect(totals.shipping).toBe(SHIPPING_COST);
  });

  it('a free-shipping code zeroes shipping without changing the discount', () => {
    const totals = calculateTotals(cartOf([cartItem()], 'FREESHIP'), DISCOUNT_CODES, NOW);
    expect(totals.discount).toBe(0);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(8900);
  });

  it('the free-shipping threshold applies to the post-discount amount', () => {
    // 220 PLN of goods, 50% off leaves 110 PLN - below the 200 PLN threshold.
    // If the threshold used the pre-discount amount, shipping would wrongly be free.
    const expensive = cartItem({ price: 22_000, quantity: 1 });
    const totals = calculateTotals(cartOf([expensive], 'MEGA50'), DISCOUNT_CODES, NOW);
    expect(totals.subtotal).toBe(22_000);
    expect(totals.discount).toBe(11_000);
    // MEGA50 also grants free shipping, so there is no charge either way:
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(11_000);
  });

  it('an empty cart yields all zeroes', () => {
    expect(calculateTotals(cartOf([]), DISCOUNT_CODES, NOW)).toEqual({
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0,
    });
  });
});

describe('formatPrice', () => {
  it('formats grosze as PLN with a comma', () => {
    expect(formatPrice(12_345)).toBe('123,45 zł');
  });

  it('pads grosze with a leading zero', () => {
    expect(formatPrice(900)).toBe('9,00 zł');
    expect(formatPrice(905)).toBe('9,05 zł');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0,00 zł');
  });
});
