import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  clampLimit,
  filterProducts,
  queryProducts,
  slice,
  sortProducts,
} from '../../src/shared/filters.js';
import type { Product } from '../../src/shared/types.js';

const CATALOGUE: Product[] = [
  {
    id: 'a',
    name: 'Bluza Pipeline',
    category: 'hoodies',
    price: 19_900,
    sizes: ['M'],
    stock: 5,
    rating: 4.9,
    description: 'Ciepła bluza z kapturem',
  },
  {
    id: 'b',
    name: 'Koszulka Debugger',
    category: 'tshirts',
    price: 8900,
    sizes: ['M'],
    stock: 5,
    rating: 4.6,
    description: 'Dla tych, którzy czytają stack trace',
  },
  {
    id: 'c',
    name: 'Kubek Coffee',
    category: 'accessories',
    price: 4900,
    sizes: [],
    stock: 5,
    rating: 4.8,
    description: 'Pojemny kubek na pełną regresję',
  },
  {
    id: 'd',
    name: 'Naklejki',
    category: 'accessories',
    price: 1900,
    sizes: [],
    stock: 5,
    rating: 4.3,
    description: 'Zestaw naklejek na laptopa',
  },
];

describe('filterProducts', () => {
  it('returns everything when no criteria are given', () => {
    expect(filterProducts(CATALOGUE, {})).toHaveLength(4);
  });

  it('filters by category', () => {
    expect(filterProducts(CATALOGUE, { category: 'accessories' }).map((p) => p.id)).toEqual([
      'c',
      'd',
    ]);
  });

  it('the "all" category does not narrow results', () => {
    expect(filterProducts(CATALOGUE, { category: 'all' })).toHaveLength(4);
  });

  it('searches the name case-insensitively', () => {
    expect(filterProducts(CATALOGUE, { search: 'KOSZULKA' }).map((p) => p.id)).toEqual(['b']);
  });

  it('searches the description too', () => {
    expect(filterProducts(CATALOGUE, { search: 'regresję' }).map((p) => p.id)).toEqual(['c']);
  });

  it('combines category with a search phrase', () => {
    const found = filterProducts(CATALOGUE, { category: 'accessories', search: 'naklejek' });
    expect(found.map((p) => p.id)).toEqual(['d']);
  });

  it('no match yields an empty list', () => {
    expect(filterProducts(CATALOGUE, { search: 'czegoś-takiego-nie-ma' })).toEqual([]);
  });
});

describe('sortProducts', () => {
  it('sorts by price ascending', () => {
    expect(sortProducts(CATALOGUE, 'price-asc').map((p) => p.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('sorts by price descending', () => {
    expect(sortProducts(CATALOGUE, 'price-desc').map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sorts by name', () => {
    expect(sortProducts(CATALOGUE, 'name-asc').map((p) => p.name)).toEqual([
      'Bluza Pipeline',
      'Koszulka Debugger',
      'Kubek Coffee',
      'Naklejki',
    ]);
  });

  it('sorts by rating descending', () => {
    expect(sortProducts(CATALOGUE, 'rating-desc').map((p) => p.id)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('does not mutate the input array', () => {
    const snapshot = [...CATALOGUE];
    sortProducts(CATALOGUE, 'price-desc');
    expect(CATALOGUE).toEqual(snapshot);
  });

  it('no sort option preserves the original order', () => {
    expect(sortProducts(CATALOGUE, undefined).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('slice', () => {
  it('returns limit records starting at offset', () => {
    expect(slice([1, 2, 3, 4, 5], 2, 0)).toEqual({ items: [1, 2], total: 5, limit: 2, offset: 0 });
  });

  it('the final slice may be shorter than the limit', () => {
    expect(slice([1, 2, 3, 4, 5], 2, 4).items).toEqual([5]);
  });

  it('an offset past the end yields no items but still reports the total', () => {
    // The caller needs `total` to work out that it asked beyond the collection.
    expect(slice([1, 2, 3], 10, 99)).toEqual({ items: [], total: 3, limit: 10, offset: 99 });
  });

  it('a negative offset is treated as zero', () => {
    expect(slice([1, 2, 3], 2, -5).offset).toBe(0);
  });

  it('an empty collection yields an empty slice', () => {
    expect(slice([], 10, 0)).toEqual({ items: [], total: 0, limit: 10, offset: 0 });
  });

  it('applies the default limit when none is given', () => {
    expect(slice([1, 2, 3]).limit).toBe(DEFAULT_LIMIT);
  });
});

describe('clampLimit', () => {
  it('caps the limit at the maximum', () => {
    // Without this cap, `?limit=1000000` would be a cheap way to exhaust the server.
    expect(clampLimit(10_000)).toBe(MAX_LIMIT);
  });

  it('raises values below one to one', () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-5)).toBe(1);
  });

  it('falls back to the default for non-finite values', () => {
    expect(clampLimit(Number.NaN)).toBe(DEFAULT_LIMIT);
  });
});

describe('queryProducts', () => {
  it('runs the full pipeline: filter, sort, slice', () => {
    const result = queryProducts(CATALOGUE, {
      category: 'accessories',
      sort: 'price-asc',
      limit: 1,
      offset: 0,
    });

    expect(result.items.map((p) => p.id)).toEqual(['d']);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(1);
  });
});
