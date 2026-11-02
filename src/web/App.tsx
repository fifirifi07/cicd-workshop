import { useCallback, useEffect, useState } from 'react';
import { ensureCart, type CartWithTotals } from './api.js';
import { itemCount } from '../shared/cart.js';
import { Catalog } from './views/Catalog.js';
import { ProductDetails } from './views/ProductDetails.js';
import { CartView } from './views/CartView.js';
import { Checkout } from './views/Checkout.js';
import { OrderConfirmation } from './views/OrderConfirmation.js';

/**
 * Hash-based routing, deliberately without react-router: one dependency less to explain
 * during the workshop, and the whole application is five views.
 */
function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash || '#/');

  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return hash;
}

export function App() {
  const hash = useHashRoute();
  const [cart, setCart] = useState<CartWithTotals | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    try {
      setCart(await ensureCart());
      setCartError(null);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Nie udało się wczytać koszyka');
    }
  }, []);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const totalItems = cart ? itemCount(cart.items) : 0;
  const [, route = '', param = ''] = hash.split('/');

  return (
    <>
      <header className="header">
        <a className="header__logo" href="#/" data-testid="logo">
          Sklep CI/CD
        </a>
        <nav>
          <a href="#/cart" data-testid="cart-link">
            Koszyk (<span data-testid="cart-count">{totalItems}</span>)
          </a>
        </nav>
      </header>

      <main className="layout">
        {cartError && (
          <p className="message message--error" data-testid="global-error">
            {cartError}
          </p>
        )}

        {route === '' && <Catalog />}
        {route === 'product' && (
          <ProductDetails id={param} cart={cart} onChange={refreshCart} />
        )}
        {route === 'cart' && <CartView cart={cart} onChange={refreshCart} />}
        {route === 'checkout' && <Checkout cart={cart} onPlaced={refreshCart} />}
        {route === 'confirmation' && <OrderConfirmation id={param} />}
      </main>
    </>
  );
}
