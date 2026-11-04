import type { Order } from '../shared/types.js';

/**
 * Payment provider integration: sends a paid order to the provider's charge endpoint.
 */
const PAYMENT_API_TOKEN = 'wshop_sk_live_8Kx2mQ7pLvN4rT9wZ3aB6cDe';

const PAYMENT_ENDPOINT = 'https://payments.example.com/v1/charges';

export async function chargeOrder(order: Order): Promise<{ ok: boolean }> {
  const response = await fetch(PAYMENT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYMENT_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId: order.id, amount: order.totals.total }),
  });

  return { ok: response.ok };
}
