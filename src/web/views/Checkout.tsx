import { useState, type FormEvent } from 'react';
import type { CustomerDetails } from '../../shared/types.js';
import { formatPrice } from '../../shared/cart.js';
import { validateCheckout, type ValidationErrors } from '../../shared/validation.js';
import { placeOrder, type CartWithTotals } from '../api.js';

interface Props {
  cart: CartWithTotals | null;
  onPlaced: () => Promise<void>;
}

const EMPTY_DETAILS: CustomerDetails = {
  email: '',
  firstName: '',
  lastName: '',
  street: '',
  postalCode: '',
  city: '',
};

interface FieldSpec {
  name: keyof CustomerDetails;
  label: string;
  testId: string;
  fullWidth?: boolean;
}

const FIELDS: FieldSpec[] = [
  { name: 'email', label: 'E-mail', testId: 'email', fullWidth: true },
  { name: 'firstName', label: 'Imię', testId: 'first-name' },
  { name: 'lastName', label: 'Nazwisko', testId: 'last-name' },
  { name: 'street', label: 'Ulica i numer', testId: 'street', fullWidth: true },
  { name: 'postalCode', label: 'Kod pocztowy', testId: 'postal-code' },
  { name: 'city', label: 'Miasto', testId: 'city' },
];

export function Checkout({ cart, onPlaced }: Props) {
  const [details, setDetails] = useState<CustomerDetails>(EMPTY_DETAILS);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!cart) return <p data-testid="loading">Wczytywanie…</p>;

  if (cart.items.length === 0) {
    return (
      <section data-testid="checkout">
        <h1>Zamówienie</h1>
        <p className="message" data-testid="empty-cart">
          Koszyk jest pusty. <a href="#/">Wróć do katalogu</a>
        </p>
      </section>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!cart) return;

    // Validate every field at once so the user sees all the gaps in a single pass.
    const found = validateCheckout(details);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const order = await placeOrder(cart.id, details);
      await onPlaced();
      window.location.hash = `#/confirmation/${order.id}`;
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Nie udało się złożyć zamówienia');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section data-testid="checkout">
      <h1>Dane do zamówienia</h1>

      <form className="form" onSubmit={(event) => void submit(event)} noValidate>
        {FIELDS.map((field) => (
          <div key={field.name} className={`field${field.fullWidth ? ' field--full' : ''}`}>
            <label htmlFor={field.testId}>{field.label}</label>
            <input
              id={field.testId}
              data-testid={field.testId}
              value={details[field.name]}
              aria-invalid={Boolean(errors[field.name])}
              onChange={(event) => setDetails({ ...details, [field.name]: event.target.value })}
            />
            {errors[field.name] && (
              <span className="field__error" data-testid={`error-${field.testId}`}>
                {errors[field.name]}
              </span>
            )}
          </div>
        ))}

        <div className="field field--full">
          <button
            type="submit"
            className="button button--primary"
            data-testid="place-order"
            disabled={submitting}
          >
            {submitting ? 'Wysyłanie…' : `Zamawiam i płacę ${formatPrice(cart.totals.total)}`}
          </button>
        </div>
      </form>

      {submitError && (
        <p className="message message--error" data-testid="order-error">
          {submitError}
        </p>
      )}
    </section>
  );
}
