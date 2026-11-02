import { describe, expect, it } from 'vitest';
import {
  DISCOUNT_CODES,
  discountAmount,
  findDiscount,
  isDiscountValid,
  normalizeCode,
  validateDiscountCode,
} from '../../src/shared/discounts.js';

const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('normalizeCode', () => {
  it('upper-cases and trims whitespace', () => {
    expect(normalizeCode('  welcome10 ')).toBe('WELCOME10');
  });
});

describe('findDiscount', () => {
  it('finds a code regardless of letter case', () => {
    expect(findDiscount('welcome10')?.code).toBe('WELCOME10');
  });

  it('returns null for an unknown code', () => {
    expect(findDiscount('CZEGOS-TAKIEGO-NIE-MA')).toBeNull();
  });
});

describe('isDiscountValid', () => {
  it('an evergreen code is valid', () => {
    const code = DISCOUNT_CODES.find((c) => c.code === 'WELCOME10')!;
    expect(isDiscountValid(code, NOW)).toBe(true);
  });

  it('a code past its expiry date is invalid', () => {
    const code = DISCOUNT_CODES.find((c) => c.code === 'SUMMER20')!;
    expect(isDiscountValid(code, NOW)).toBe(false);
  });

  it('a code is still valid on its expiry day', () => {
    const code = DISCOUNT_CODES.find((c) => c.code === 'SUMMER20')!;
    expect(isDiscountValid(code, new Date('2020-09-30T10:00:00.000Z'))).toBe(true);
  });
});

describe('discountAmount', () => {
  it('computes a percentage discount', () => {
    const code = DISCOUNT_CODES.find((c) => c.code === 'WELCOME10')!;
    expect(discountAmount(10_000, code)).toBe(1000);
  });

  it('rounds down, never up', () => {
    const code = DISCOUNT_CODES.find((c) => c.code === 'WELCOME10')!;
    // 10% of 999 grosze is 99.9 - the result must be 99, not 100.
    expect(discountAmount(999, code)).toBe(99);
  });

  it('no code means no discount', () => {
    expect(discountAmount(10_000, null)).toBe(0);
  });

  it('a shipping-only code does not reduce the goods value', () => {
    const code = DISCOUNT_CODES.find((c) => c.code === 'FREESHIP')!;
    expect(discountAmount(10_000, code)).toBe(0);
  });

  it('an empty cart yields no discount', () => {
    const code = DISCOUNT_CODES.find((c) => c.code === 'MEGA50')!;
    expect(discountAmount(0, code)).toBe(0);
  });
});

describe('validateDiscountCode', () => {
  it('accepts a valid code', () => {
    const result = validateDiscountCode('WELCOME10', NOW);
    expect(result).toEqual({ ok: true, code: expect.objectContaining({ code: 'WELCOME10' }) });
  });

  it('rejects an unknown code with reason "unknown"', () => {
    expect(validateDiscountCode('ABC', NOW)).toEqual({ ok: false, reason: 'unknown' });
  });

  it('rejects an expired code with reason "expired"', () => {
    expect(validateDiscountCode('SUMMER20', NOW)).toEqual({ ok: false, reason: 'expired' });
  });
});
