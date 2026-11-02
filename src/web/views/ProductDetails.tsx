import { useEffect, useState } from 'react';
import type { Product, Size } from '../../shared/types.js';
import { formatPrice } from '../../shared/cart.js';
import { addToCart, fetchProduct, type CartWithTotals } from '../api.js';
import { categoryLabel } from '../labels.js';

interface Props {
  id: string;
  cart: CartWithTotals | null;
  onChange: () => Promise<void>;
}

export function ProductDetails({ id, cart, onChange }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<Size | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let current = true;

    // Clear the previous product first. Without this the view keeps showing product A
    // while B is still loading - and "add to cart" would add A under B's address.
    setProduct(null);
    setError(null);
    setAdded(false);
    setSize('');
    setQuantity(1);

    fetchProduct(id)
      .then((found) => {
        if (current) setProduct(found);
      })
      .catch((cause: unknown) => {
        if (current) {
          setError(cause instanceof Error ? cause.message : 'Nie udało się pobrać produktu');
        }
      });

    return () => {
      // Guards against a slow response for an abandoned product overwriting a newer one.
      current = false;
    };
  }, [id]);

  async function add() {
    if (!product || !cart) return;

    if (product.sizes.length > 0 && size === '') {
      setError('Wybierz rozmiar');
      return;
    }

    try {
      await addToCart(cart.id, product.id, size === '' ? null : size, quantity);
      await onChange();
      setAdded(true);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się dodać do koszyka');
    }
  }

  if (error && !product) {
    return (
      <p className="message message--error" data-testid="product-error">
        {error}
      </p>
    );
  }

  if (!product) return <p data-testid="loading">Wczytywanie…</p>;

  const unavailable = product.stock === 0;

  return (
    <section data-testid="product-details" data-product-id={product.id}>
      <a href="#/">← Wróć do katalogu</a>
      <h1 data-testid="product-name">{product.name}</h1>
      <p className="tag">{categoryLabel(product.category)}</p>
      <p data-testid="product-description">{product.description}</p>
      <p className="card__price" data-testid="product-price">
        {formatPrice(product.price)}
      </p>
      <p data-testid="product-rating">Ocena: {product.rating.toFixed(1)}</p>

      {unavailable ? (
        <p className="message message--error" data-testid="out-of-stock">
          Ten produkt jest chwilowo niedostępny.
        </p>
      ) : (
        <div className="filters">
          {product.sizes.length > 0 && (
            <select
              aria-label="Rozmiar"
              data-testid="size-select"
              value={size}
              onChange={(event) => setSize(event.target.value as Size | '')}
            >
              <option value="">Wybierz rozmiar</option>
              {product.sizes.map((available) => (
                <option key={available} value={available}>
                  {available}
                </option>
              ))}
            </select>
          )}

          <input
            type="number"
            aria-label="Ilość"
            data-testid="quantity"
            min={1}
            max={10}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />

          <button
            type="button"
            className="button button--primary"
            data-testid="add-to-cart"
            onClick={() => void add()}
          >
            Dodaj do koszyka
          </button>
        </div>
      )}

      {error && (
        <p className="message message--error" data-testid="product-error">
          {error}
        </p>
      )}

      {added && !error && (
        <p className="message message--success" data-testid="added-to-cart">
          Produkt trafił do koszyka. <a href="#/cart">Przejdź do koszyka</a>
        </p>
      )}
    </section>
  );
}
