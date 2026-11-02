import type { Product, ProductQuery, SortOption } from './types.js';

/**
 * Default and maximum page size.
 *
 * These are transport bounds, deliberately unrelated to how many tiles the catalogue
 * happens to show in a row. A layout number leaking into an API default would mean a
 * console client gets six records because that is how the desktop grid is arranged.
 */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Filters by category and phrase. The phrase matches name and description, case-insensitively. */
export function filterProducts(products: Product[], query: ProductQuery): Product[] {
  const { category, search } = query;
  const phrase = search?.trim().toLowerCase() ?? '';

  return products.filter((product) => {
    if (category && category !== 'all' && product.category !== category) return false;
    if (!phrase) return true;
    return (
      product.name.toLowerCase().includes(phrase) ||
      product.description.toLowerCase().includes(phrase)
    );
  });
}

/**
 * Sorts a product list. Returns a **new array** - the input is left untouched, which keeps
 * the tests simple and guards against accidentally mutating the server-side catalogue.
 */
export function sortProducts(products: Product[], sort: SortOption | undefined): Product[] {
  const copy = [...products];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'pl'));
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name, 'pl'));
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    case 'rating-desc':
      return copy.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, 'pl'));
    default:
      return copy;
  }
}

/**
 * A bounded slice of a collection.
 *
 * Note what is absent: no `page` and no `totalPages`. Page numbers are a presentation
 * concept - the caller derives them from `total`, `limit` and `offset` if it needs them.
 */
export interface Slice<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Returns `limit` records starting at `offset`.
 *
 * Offset paging is used here for readability: it lets a client show "page 2 of 5".
 * In production prefer keyset (cursor) paging - offsets shift when rows are inserted
 * between requests, and large offsets degrade because the database still walks the
 * skipped rows. The trade-off is that a cursor cannot express a total page count.
 */
export function slice<T>(items: T[], limit = DEFAULT_LIMIT, offset = 0): Slice<T> {
  const safeLimit = clampLimit(limit);
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;

  return {
    items: items.slice(safeOffset, safeOffset + safeLimit),
    total: items.length,
    limit: safeLimit,
    offset: safeOffset,
  };
}

export function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  const whole = Math.floor(limit);
  if (whole < 1) return 1;
  if (whole > MAX_LIMIT) return MAX_LIMIT;
  return whole;
}

/** The full catalogue pipeline: filter, sort, slice. */
export function queryProducts(products: Product[], query: ProductQuery): Slice<Product> {
  const filtered = filterProducts(products, query);
  const sorted = sortProducts(filtered, query.sort);
  return slice(sorted, query.limit, query.offset);
}
