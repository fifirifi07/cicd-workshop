import { useEffect, useState } from 'react';
import type { Order } from '../../shared/types.js';
import { formatPrice } from '../../shared/cart.js';
import { fetchOrder } from '../api.js';

export function OrderConfirmation({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder(id)
      .then(setOrder)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Nie znaleziono zamówienia');
      });
  }, [id]);

  if (error) {
    return (
      <p className="message message--error" data-testid="order-error">
        {error}
      </p>
    );
  }

  if (!order) return <p data-testid="loading">Wczytywanie…</p>;

  return (
    <section data-testid="confirmation">
      <p className="message message--success">Dziękujemy! Zamówienie zostało przyjęte.</p>
      <h1>
        Numer zamówienia: <span data-testid="order-number">{order.id}</span>
      </h1>

      <table className="table">
        <thead>
          <tr>
            <th>Produkt</th>
            <th>Rozmiar</th>
            <th>Ilość</th>
            <th>Cena</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} data-testid="order-item">
              <td>{item.name}</td>
              <td>{item.size ?? '—'}</td>
              <td>{item.quantity}</td>
              <td>{formatPrice(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="summary">
        <div className="summary__row summary__row--total">
          <span>Zapłacono</span>
          <span data-testid="order-total">{formatPrice(order.totals.total)}</span>
        </div>
      </div>

      <p className="back-link">
        <a href="#/">Wróć do katalogu</a>
      </p>
    </section>
  );
}
