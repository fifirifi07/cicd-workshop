import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Every test creates its own cart, so tests never share mutable state and can run
 * in parallel - including across shards. This is the API-level counterpart of the
 * clean-state guarantee the in-memory store gives us on restart.
 */
async function createCart(request: APIRequestContext): Promise<string> {
  const response = await request.post('/api/cart');
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

async function addItem(
  request: APIRequestContext,
  cartId: string,
  data: { productId: string; size?: string | null; quantity?: number },
) {
  return request.post(`/api/cart/${cartId}/items`, { data });
}

test.describe('Cart', () => {
  test('a new cart is empty and zeroed @smoke', async ({ request }) => {
    const cartId = await createCart(request);
    const cart = await (await request.get(`/api/cart/${cartId}`)).json();

    expect(cart.items).toEqual([]);
    expect(cart.totals).toEqual({ subtotal: 0, discount: 0, shipping: 0, total: 0 });
  });

  test('adds a product to the cart @smoke', async ({ request }) => {
    const cartId = await createCart(request);
    const response = await addItem(request, cartId, { productId: 'p-001', size: 'M', quantity: 2 });

    expect(response.status()).toBe(201);
    const cart = await response.json();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ productId: 'p-001', size: 'M', quantity: 2 });
    expect(cart.totals.subtotal).toBe(8900 * 2);
  });

  test('the same product and size increases quantity instead of adding a second row', async ({
    request,
  }) => {
    const cartId = await createCart(request);
    await addItem(request, cartId, { productId: 'p-001', size: 'M', quantity: 1 });
    await addItem(request, cartId, { productId: 'p-001', size: 'M', quantity: 2 });

    const cart = await (await request.get(`/api/cart/${cartId}`)).json();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  test('the same product in a different size creates a separate line', async ({ request }) => {
    const cartId = await createCart(request);
    await addItem(request, cartId, { productId: 'p-001', size: 'M' });
    await addItem(request, cartId, { productId: 'p-001', size: 'L' });

    const cart = await (await request.get(`/api/cart/${cartId}`)).json();
    expect(cart.items).toHaveLength(2);
  });

  test('a quantity above the limit is clamped to ten', async ({ request }) => {
    const cartId = await createCart(request);
    const cart = await (
      await addItem(request, cartId, { productId: 'p-001', size: 'M', quantity: 999 })
    ).json();

    expect(cart.items[0].quantity).toBe(10);
  });

  test('adding a size-required product without a size fails with 400', async ({ request }) => {
    const cartId = await createCart(request);
    const response = await addItem(request, cartId, { productId: 'p-001' });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('size-required');
  });

  test('an out-of-stock product fails with 400', async ({ request }) => {
    const cartId = await createCart(request);
    const response = await addItem(request, cartId, { productId: 'p-011', size: 'M' });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('out-of-stock');
  });

  test('a missing product fails with 404', async ({ request }) => {
    const cartId = await createCart(request);
    const response = await addItem(request, cartId, { productId: 'no-such-product' });

    expect(response.status()).toBe(404);
  });

  test('changes a line quantity', async ({ request }) => {
    const cartId = await createCart(request);
    const added = await (
      await addItem(request, cartId, { productId: 'p-001', size: 'M' })
    ).json();

    const response = await request.patch(`/api/cart/${cartId}/items/${added.items[0].id}`, {
      data: { quantity: 4 },
    });

    expect(response.status()).toBe(200);
    expect((await response.json()).items[0].quantity).toBe(4);
  });

  test('removes a line from the cart', async ({ request }) => {
    const cartId = await createCart(request);
    const added = await (
      await addItem(request, cartId, { productId: 'p-007' })
    ).json();

    const response = await request.delete(`/api/cart/${cartId}/items/${added.items[0].id}`);

    expect(response.status()).toBe(200);
    expect((await response.json()).items).toEqual([]);
  });

  test('operations on a missing cart return 404', async ({ request }) => {
    const response = await request.get('/api/cart/no-such-cart');
    expect(response.status()).toBe(404);
  });
});

test.describe('Discount codes', () => {
  test('a valid code lowers the total', async ({ request }) => {
    const cartId = await createCart(request);
    await addItem(request, cartId, { productId: 'p-001', size: 'M' });

    const response = await request.post(`/api/cart/${cartId}/discount`, {
      data: { code: 'WELCOME10' },
    });

    expect(response.status()).toBe(200);
    const cart = await response.json();
    expect(cart.totals.discount).toBe(890);
    expect(cart.discountCode).toBe('WELCOME10');
  });

  test('a code works regardless of letter case', async ({ request }) => {
    const cartId = await createCart(request);
    await addItem(request, cartId, { productId: 'p-001', size: 'M' });

    const response = await request.post(`/api/cart/${cartId}/discount`, {
      data: { code: '  welcome10  ' },
    });

    expect((await response.json()).discountCode).toBe('WELCOME10');
  });

  test('an expired code is rejected with a clear reason', async ({ request }) => {
    const cartId = await createCart(request);
    const response = await request.post(`/api/cart/${cartId}/discount`, {
      data: { code: 'SUMMER20' },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ reason: 'expired' });
  });

  test('an unknown code is rejected', async ({ request }) => {
    const cartId = await createCart(request);
    const response = await request.post(`/api/cart/${cartId}/discount`, {
      data: { code: 'NO-SUCH-CODE' },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ reason: 'unknown' });
  });

  test('the free-shipping code waives the shipping cost', async ({ request }) => {
    const cartId = await createCart(request);
    await addItem(request, cartId, { productId: 'p-008' });

    const cart = await (
      await request.post(`/api/cart/${cartId}/discount`, { data: { code: 'FREESHIP' } })
    ).json();

    expect(cart.totals.shipping).toBe(0);
  });

  test('an order above the threshold ships free without any code', async ({ request }) => {
    const cartId = await createCart(request);
    // 2 x 199 PLN comfortably exceeds the 200 PLN free-shipping threshold.
    await addItem(request, cartId, { productId: 'p-004', size: 'M', quantity: 2 });

    const cart = await (await request.get(`/api/cart/${cartId}`)).json();
    expect(cart.totals.shipping).toBe(0);
  });
});
