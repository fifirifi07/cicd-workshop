import { Router } from 'express';
import type { Size } from '../../shared/types.js';
import { calculateTotals } from '../../shared/cart.js';
import { DISCOUNT_CODES, normalizeCode, validateDiscountCode } from '../../shared/discounts.js';
import { addItem, createCart, findCart, removeItem, updateItemQuantity } from '../store.js';

export const cartRouter = Router();

/** The cart together with computed amounts - the frontend never does the maths itself. */
function cartResponse(cartId: string) {
  const cart = findCart(cartId);
  if (!cart) return null;
  return { ...cart, totals: calculateTotals(cart, DISCOUNT_CODES) };
}

cartRouter.post('/', (_req, res) => {
  const cart = createCart();
  res.status(201).json(cartResponse(cart.id));
});

cartRouter.get('/:id', (req, res) => {
  const body = cartResponse(req.params.id);
  if (!body) return res.status(404).json({ error: 'Cart not found' });
  return res.json(body);
});

cartRouter.post('/:id/items', (req, res) => {
  const cart = findCart(req.params.id);
  if (!cart) return res.status(404).json({ error: 'Cart not found' });

  const { productId, size, quantity } = req.body ?? {};
  if (typeof productId !== 'string') {
    return res.status(400).json({ error: 'Field productId is required' });
  }

  const result = addItem(
    cart,
    productId,
    typeof size === 'string' ? (size as Size) : null,
    typeof quantity === 'number' ? quantity : 1,
  );

  if (!result.ok) {
    const status = result.error === 'product-not-found' ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  return res.status(201).json(cartResponse(cart.id));
});

cartRouter.patch('/:id/items/:itemId', (req, res) => {
  const cart = findCart(req.params.id);
  if (!cart) return res.status(404).json({ error: 'Cart not found' });

  const { quantity } = req.body ?? {};
  if (typeof quantity !== 'number') {
    return res.status(400).json({ error: 'Field quantity must be a number' });
  }

  if (!updateItemQuantity(cart, req.params.itemId, quantity)) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  return res.json(cartResponse(cart.id));
});

cartRouter.delete('/:id/items/:itemId', (req, res) => {
  const cart = findCart(req.params.id);
  if (!cart) return res.status(404).json({ error: 'Cart not found' });

  if (!removeItem(cart, req.params.itemId)) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  return res.json(cartResponse(cart.id));
});

cartRouter.post('/:id/discount', (req, res) => {
  const cart = findCart(req.params.id);
  if (!cart) return res.status(404).json({ error: 'Cart not found' });

  const { code } = req.body ?? {};
  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Field code is required' });
  }

  const result = validateDiscountCode(code);
  if (!result.ok) {
    const message =
      result.reason === 'expired' ? 'Discount code has expired' : 'Unknown discount code';
    return res.status(400).json({ error: message, reason: result.reason });
  }

  cart.discountCode = normalizeCode(code);
  return res.json(cartResponse(cart.id));
});

cartRouter.delete('/:id/discount', (req, res) => {
  const cart = findCart(req.params.id);
  if (!cart) return res.status(404).json({ error: 'Cart not found' });
  cart.discountCode = null;
  return res.json(cartResponse(cart.id));
});
