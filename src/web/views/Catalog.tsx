import { useEffect, useState } from 'react';
import type { Category, Product, SortOption } from '../../shared/types.js';
import { formatPrice } from '../../shared/cart.js';
import { fetchProducts } from '../api.js';
import { categoryLabel } from '../labels.js';
import type { Slice } from '../../shared/filters.js';

/** Domain values stay in English; only the labels shown to the user are Polish. */
const CATEGORIES: Array<{ value: Category | 'all'; label: string }> = [
  { value: 'all', label: 'Wszystkie kategorie' },
  { value: 'tshirts', label: categoryLabel('tshirts') },
  { value: 'hoodies', label: categoryLabel('hoodies') },
  { value: 'accessories', label: categoryLabel('accessories') },
];

/**
 * How many tiles the catalogue shows at once. This is a layout decision and it lives here,
 * in the view - not as a default in the API contract.
 */
const PAGE_SIZE = 6;

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'name-asc', label: 'Nazwa A-Z' },
  { value: 'price-asc', label: 'Cena rosnąco' },
  { value: 'price-desc', label: 'Cena malejąco' },
  { value: 'rating-desc', label: 'Ocena malejąco' },
];

export function Catalog() {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('name-asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Slice<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchProducts({ category, sort, search, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((result) => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Nie udało się pobrać produktów');
        }
      });

    return () => {
      active = false;
    };
  }, [category, sort, search, page]);

  // Page numbers are derived here, from the transport values the API returns.
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section data-testid="catalog">
      <h1>Katalog</h1>

      <div className="filters">
        <input
          type="search"
          placeholder="Szukaj produktu"
          aria-label="Szukaj produktu"
          data-testid="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <select
          aria-label="Kategoria"
          data-testid="category-filter"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as Category | 'all');
            setPage(1);
          }}
        >
          {CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Sortowanie"
          data-testid="sort"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as SortOption);
            setPage(1);
          }}
        >
          {SORT_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="message message--error" data-testid="catalog-error">
          {error}
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="message" data-testid="no-results">
          Brak produktów spełniających kryteria.
        </p>
      )}

      <div className="grid" data-testid="product-list">
        {data?.items.map((product) => (
          <article
            key={product.id}
            className="card"
            data-testid="product-card"
            data-product-id={product.id}
          >
            <span className="tag">{categoryLabel(product.category)}</span>
            <h2 className="card__name" data-testid="product-name">
              {product.name}
            </h2>
            <p className="card__description">{product.description}</p>
            <span className="card__price" data-testid="product-price">
              {formatPrice(product.price)}
            </span>
            {product.stock === 0 && (
              <span className="tag tag--out-of-stock" data-testid="out-of-stock">
                Brak w magazynie
              </span>
            )}
            {product.stock > 0 && product.stock <= 3 && (
              <span className="tag tag--low-stock" data-testid="low-stock">
                Ostatnie sztuki: {product.stock}
              </span>
            )}
            <a className="button button--primary" href={`#/product/${product.id}`} data-testid="view-product">
              Zobacz
            </a>
          </article>
        ))}
      </div>

      {data && totalPages > 1 && (
        <div className="pagination" data-testid="pagination">
          <button
            type="button"
            data-testid="previous-page"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Poprzednia
          </button>
          <span data-testid="page-number">
            Strona {page} z {totalPages}
          </span>
          <button
            type="button"
            data-testid="next-page"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Następna
          </button>
        </div>
      )}
    </section>
  );
}
