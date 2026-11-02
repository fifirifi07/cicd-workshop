import type { CustomerDetails } from './types.js';

export type FieldName = keyof CustomerDetails;

export type ValidationErrors = Partial<Record<FieldName, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTAL_CODE_PATTERN = /^\d{2}-\d{3}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Polish postal code in the 00-000 format. */
export function isValidPostalCode(value: string): boolean {
  return POSTAL_CODE_PATTERN.test(value.trim());
}

/**
 * Validates checkout details and returns every error at once.
 *
 * We deliberately do **not** stop at the first failure: the user should see everything
 * that needs fixing in a single pass. The UI tests assert exactly this behaviour.
 */
export function validateCheckout(details: Partial<CustomerDetails>): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!details.email?.trim()) {
    errors.email = 'Podaj adres e-mail';
  } else if (!isValidEmail(details.email)) {
    errors.email = 'Nieprawidłowy adres e-mail';
  }

  if (!details.firstName?.trim()) errors.firstName = 'Podaj imię';
  if (!details.lastName?.trim()) errors.lastName = 'Podaj nazwisko';
  if (!details.street?.trim()) errors.street = 'Podaj ulicę i numer';
  if (!details.city?.trim()) errors.city = 'Podaj miasto';

  if (!details.postalCode?.trim()) {
    errors.postalCode = 'Podaj kod pocztowy';
  } else if (!isValidPostalCode(details.postalCode)) {
    errors.postalCode = 'Kod pocztowy musi mieć format 00-000';
  }

  return errors;
}

export function isCheckoutValid(details: Partial<CustomerDetails>): boolean {
  return Object.keys(validateCheckout(details)).length === 0;
}
