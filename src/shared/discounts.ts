import type { DiscountCode } from './types.js';

/**
 * Catalogue of discount codes. It deliberately contains an **expired** code (`SUMMER20`):
 * without one there is no way to test the "code exists but no longer works" path,
 * which is the most common real-world edge case.
 */
export const DISCOUNT_CODES: DiscountCode[] = [
  { code: 'WELCOME10', percentOff: 10, freeShipping: false, expiresAt: '2099-12-31' },
  { code: 'SUMMER20', percentOff: 20, freeShipping: false, expiresAt: '2020-09-30' },
  { code: 'FREESHIP', percentOff: null, freeShipping: true, expiresAt: '2099-12-31' },
  { code: 'MEGA50', percentOff: 50, freeShipping: true, expiresAt: '2099-12-31' },
];

export function findDiscount(code: string): DiscountCode | null {
  const normalized = normalizeCode(code);
  return DISCOUNT_CODES.find((c) => c.code === normalized) ?? null;
}

/** Codes are compared case-insensitively and ignoring surrounding whitespace. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isDiscountValid(code: DiscountCode, now: Date = new Date()): boolean {
  const expiry = new Date(`${code.expiresAt}T23:59:59.999Z`);
  return now.getTime() <= expiry.getTime();
}

/**
 * Discount amount in grosze, always rounded **down** - in the shop's favour and,
 * more importantly for the tests, deterministically.
 */
export function discountAmount(subtotal: number, code: DiscountCode | null): number {
  if (!code || code.percentOff === null) return 0;
  if (subtotal <= 0) return 0;
  return Math.floor((subtotal * code.percentOff) / 100);
}

export type DiscountRejection = 'unknown' | 'expired';

export type DiscountResult =
  | { ok: true; code: DiscountCode }
  | { ok: false; reason: DiscountRejection };

/** Validates a user-entered code and states explicitly why it was rejected. */
export function validateDiscountCode(input: string, now: Date = new Date()): DiscountResult {
  const found = findDiscount(input);
  if (!found) return { ok: false, reason: 'unknown' };
  if (!isDiscountValid(found, now)) return { ok: false, reason: 'expired' };
  return { ok: true, code: found };
}
