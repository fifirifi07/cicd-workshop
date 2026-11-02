import { Router } from 'express';
import type { CustomerDetails, Order } from '../../shared/types.js';
import { calculateTotals } from '../../shared/cart.js';
import { DISCOUNT_CODES } from '../../shared/discounts.js';
import { validateCheckout } from '../../shared/validation.js';
import { findCart, findOrder, newOrderId, saveOrder } from '../store.js';

export const ordersRouter = Router();

ordersRouter.post('/', (req, res) => {
  const { cartId, customer } = req.body ?? {};

  if (typeof cartId !== 'string') {
    return res.status(400).json({ error: 'Field cartId is required' });
  }

  const cart = findCart(cartId);
  if (!cart) return res.status(404).json({ error: 'Cart not found' });
  if (cart.items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const errors = validateCheckout((customer ?? {}) as Partial<CustomerDetails>);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Invalid order details', fields: errors });
  }

  const order: Order = {
    id: newOrderId(),
    items: structuredClone(cart.items),
    totals: calculateTotals(cart, DISCOUNT_CODES),
    customer: customer as CustomerDetails,
    createdAt: new Date().toISOString(),
  };

  // The cart is emptied once the order is placed: coming back to it must not show
  // items the customer has already paid for.
  cart.items = [];
  cart.discountCode = null;

  return res.status(201).json(saveOrder(order));
});

ordersRouter.get('/:id', (req, res) => {
  const order = findOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json(order);
});
