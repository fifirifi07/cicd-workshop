import { describe, expect, it } from 'vitest';
import {
  isCheckoutValid,
  isValidEmail,
  isValidPostalCode,
  validateCheckout,
} from '../../src/shared/validation.js';
import type { CustomerDetails } from '../../src/shared/types.js';

const VALID: CustomerDetails = {
  email: 'jan.kowalski@example.com',
  firstName: 'Jan',
  lastName: 'Kowalski',
  street: 'Polna 1/2',
  postalCode: '80-180',
  city: 'Gdańsk',
};

describe('isValidEmail', () => {
  it.each(['a@b.pl', 'jan.kowalski@example.com', 'test+tag@sub.domena.com'])(
    'accepts a valid address: %s',
    (address) => {
      expect(isValidEmail(address)).toBe(true);
    },
  );

  it.each(['', 'bez-malpy', 'a@b', 'a@@b.pl', 'ze spacja@b.pl'])(
    'rejects an invalid address: %s',
    (address) => {
      expect(isValidEmail(address)).toBe(false);
    },
  );

  it('ignores surrounding whitespace', () => {
    expect(isValidEmail('  a@b.pl  ')).toBe(true);
  });
});

describe('isValidPostalCode', () => {
  it('accepts the 00-000 format', () => {
    expect(isValidPostalCode('80-180')).toBe(true);
  });

  it.each(['80180', '8-180', '80-18', 'AB-180', ''])('rejects: %s', (postalCode) => {
    expect(isValidPostalCode(postalCode)).toBe(false);
  });
});

describe('validateCheckout', () => {
  it('a complete, valid set of details produces no errors', () => {
    expect(validateCheckout(VALID)).toEqual({});
    expect(isCheckoutValid(VALID)).toBe(true);
  });

  it('an empty form reports every field at once', () => {
    const errors = validateCheckout({});
    // Validation does not stop at the first failure - the user must see the full list.
    expect(Object.keys(errors).sort()).toEqual([
      'city',
      'email',
      'firstName',
      'lastName',
      'postalCode',
      'street',
    ]);
  });

  it('distinguishes a missing e-mail from a malformed one', () => {
    expect(validateCheckout({ ...VALID, email: '' }).email).toBe('Podaj adres e-mail');
    expect(validateCheckout({ ...VALID, email: 'zly' }).email).toBe('Nieprawidłowy adres e-mail');
  });

  it('reports a malformed postal code', () => {
    const errors = validateCheckout({ ...VALID, postalCode: '80180' });
    expect(errors.postalCode).toBe('Kod pocztowy musi mieć format 00-000');
  });

  it('treats whitespace-only input as missing', () => {
    expect(validateCheckout({ ...VALID, firstName: '   ' }).firstName).toBe('Podaj imię');
  });
});
