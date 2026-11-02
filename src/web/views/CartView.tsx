import { useState } from 'react';
import { formatPrice } from '../../shared/cart.js';
import { ApiError, applyDiscount, changeQuantity, removeFromCart, type CartWithTotals } from '../api.js';

interface Props {
  cart: CartWithTotals | null;
  onChange: () => Promise<void>;
}

/** Machine-readable rejection codes from the API, translated for the customer. */
const DISCOUNT_ERRORS: Record<string, string> = {
  expired: 'Ten kod rabatowy już wygasł',
  unknown: 'Nie znamy takiego kodu rabatowego',
};

export function CartView({ cart, onChange }: Props) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  if (!cart) return <p data-testid="loading">Wczytywanie…</p>;

  if (cart.items.length === 0) {
    return (
      <section data-testid="cart">
        <h1>Koszyk</h1>
        <p className="message" data-testid="empty-cart">
          Koszyk jest pusty. <a href="#/">Wróć do katalogu</a>
        </p>
      </section>
    );
  }

  async function applyCode() {
    if (!cart) return;
    try {
      await applyDiscount(cart.id, code);
      await onChange();
      setCodeError(null);
    } catch (cause) {
      const known = cause instanceof ApiError && cause.code ? DISCOUNT_ERRORS[cause.code] : null;
      setCodeError(known ?? 'Nie udało się zastosować kodu rabatowego');
    }
  }

  return (
    <section data-testid="cart">
      <h1>Koszyk</h1>

      <table className="table">
        <thead>
          <tr>
            <th>Produkt</th>
            <th>Rozmiar</th>
            <th>Ilość</th>
            <th>Cena</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cart.items.map((item) => (
            <tr key={item.id} data-testid="cart-item" data-item-id={item.id}>
              <td data-testid="item-name">{item.name}</td>
              <td data-testid="item-size">{item.size ?? '—'}</td>
              <td>
                <input
                  type="number"
                  aria-label={`Ilość: ${item.name}`}
                  data-testid="item-quantity"
                  min={1}
                  max={10}
                  value={item.quantity}
                  onChange={(event) => {
                    void changeQuantity(cart.id, item.id, Number(event.target.value)).then(onChange);
                  }}
                />
              </td>
              <td data-testid="item-price">{formatPrice(item.price * item.quantity)}</td>
              <td>
                <button
                  type="button"
                  data-testid="remove-item"
                  aria-label={`Usuń: ${item.name}`}
                  onClick={() => {
                    void removeFromCart(cart.id, item.id).then(onChange);
                  }}
                >
                  Usuń
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="filters filters--spaced">
        <input
          type="text"
          placeholder="Kod rabatowy"
          aria-label="Kod rabatowy"
          data-testid="discount-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <button type="button" data-testid="apply-discount" onClick={() => void applyCode()}>
          Zastosuj
        </button>
        {cart.discountCode && (
          <span className="tag" data-testid="applied-discount">
            Kod: {cart.discountCode}
          </span>
        )}
      </div>

      {codeError && (
        <p className="message message--error" data-testid="discount-error">
          {codeError}
        </p>
      )}

      <div className="summary" data-testid="summary">
        <div className="summary__row">
          <span>Wartość produktów</span>
          <span data-testid="subtotal">{formatPrice(cart.totals.subtotal)}</span>
        </div>
        <div className="summary__row">
          <span>Rabat</span>
          <span data-testid="discount">-{formatPrice(cart.totals.discount)}</span>
        </div>
        <div className="summary__row">
          <span>Dostawa</span>
          <span data-testid="shipping">
            {cart.totals.shipping === 0 ? 'Gratis' : formatPrice(cart.totals.shipping)}
          </span>
        </div>
        <div className="summary__row summary__row--total">
          <span>Razem</span>
          <span data-testid="total">{formatPrice(cart.totals.total)}</span>
        </div>
        <a className="button button--primary button--block" href="#/checkout" data-testid="go-to-checkout">
          Przejdź do kasy
        </a>
      </div>
    </section>
  );
}
