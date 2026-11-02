import { Router } from 'express';
import type { Category, ProductQuery, SortOption } from '../../shared/types.js';
import { MAX_LIMIT, queryProducts } from '../../shared/filters.js';
import { findProduct, listProducts } from '../store.js';

const CATEGORIES: readonly string[] = ['tshirts', 'hoodies', 'accessories', 'all'];
const SORT_OPTIONS: readonly string[] = ['price-asc', 'price-desc', 'name-asc', 'rating-desc'];

export const productsRouter = Router();

/**
 * Parses a non-negative integer query parameter.
 * Returns `undefined` when absent and `null` when present but malformed, so the caller
 * can tell "not given" apart from "given as nonsense" and answer 400 for the latter.
 */
function parseNonNegativeInt(value: unknown): number | undefined | null {
  if (typeof value !== 'string') return undefined;
  if (!/^\d+$/.test(value)) return null;
  return Number.parseInt(value, 10);
}

productsRouter.get('/', (req, res) => {
  const { category, search, sort } = req.query;

  if (typeof category === 'string' && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Unknown category', category });
  }
  if (typeof sort === 'string' && !SORT_OPTIONS.includes(sort)) {
    return res.status(400).json({ error: 'Unknown sort option', sort });
  }

  const limit = parseNonNegativeInt(req.query.limit);
  if (limit === null || limit === 0) {
    return res.status(400).json({ error: 'Parameter limit must be a positive integer' });
  }
  if (limit !== undefined && limit > MAX_LIMIT) {
    return res.status(400).json({ error: `Parameter limit must not exceed ${MAX_LIMIT}`, limit });
  }

  const offset = parseNonNegativeInt(req.query.offset);
  if (offset === null) {
    return res.status(400).json({ error: 'Parameter offset must be a non-negative integer' });
  }

  const query: ProductQuery = {
    category: typeof category === 'string' ? (category as Category | 'all') : undefined,
    search: typeof search === 'string' ? search : undefined,
    sort: typeof sort === 'string' ? (sort as SortOption) : undefined,
    limit,
    offset,
  };

  return res.json(queryProducts(listProducts(), query));
});

productsRouter.get('/:id', (req, res) => {
  const product = findProduct(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found', id: req.params.id });
  }
  return res.json(product);
});
