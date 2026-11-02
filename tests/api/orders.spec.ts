import { expect, test, type APIRequestContext } from '@playwright/test';

const VALID_CUSTOMER = {
  email: 'jan.kowalski@example.com',
  firstName: 'Jan',
  lastName: 'Kowalski',
  street: 'Polna 1/2',
  postalCode: '80-180',
  city: 'Gdańsk',
};

async function cartWithOneItem(request: APIRequestContext): Promise<string> {
  const cartId = (await (await request.post('/api/cart')).json()).id;
  await request.post(`/api/cart/${cartId}/items`, {
    data: { productId: 'p-001', size: 'M', quantity: 1 },
  });
  return cartId;
}

test.describe('Orders', () => {
  test('places an order for a filled cart @smoke', async ({ request }) => {
    const cartId = await cartWithOneItem(request);

    const response = await request.post('/api/orders', {
      data: { cartId, customer: VALID_CUSTOMER },
    });

    expect(response.status()).toBe(201);
    const order = await response.json();
    expect(order.id).toMatch(/^ORD-[0-9A-F]{8}$/);
    expect(order.items).toHaveLength(1);
    expect(order.totals.total).toBeGreaterThan(0);
  });

  test('empties the cart after the order is placed', async ({ request }) => {
    const cartId = await cartWithOneItem(request);
    await request.post('/api/orders', { data: { cartId, customer: VALID_CUSTOMER } });

    const cart = await (await request.get(`/api/cart/${cartId}`)).json();
    expect(cart.items).toEqual([]);
    expect(cart.discountCode).toBeNull();
  });

  test('freezes the amounts at the moment of ordering', async ({ request }) => {
    const cartId = await cartWithOneItem(request);
    const cartBefore = await (await request.get(`/api/cart/${cartId}`)).json();

    const order = await (
      await request.post('/api/orders', { data: { cartId, customer: VALID_CUSTOMER } })
    ).json();

    expect(order.totals).toEqual(cartBefore.totals);
  });

  test('an empty cart cannot be ordered', async ({ request }) => {
    const cartId = (await (await request.post('/api/cart')).json()).id;

    const response = await request.post('/api/orders', {
      data: { cartId, customer: VALID_CUSTOMER },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('Cart is empty');
  });

  test('reports every invalid field at once', async ({ request }) => {
    const cartId = await cartWithOneItem(request);

    const response = await request.post('/api/orders', {
      data: { cartId, customer: { ...VALID_CUSTOMER, email: 'not-an-email', postalCode: '80180' } },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    // Both problems must come back in a single response - the customer should not have to
    // submit the form twice to discover the second one.
    expect(Object.keys(body.fields).sort()).toEqual(['email', 'postalCode']);
  });

  test('a missing customer object is rejected', async ({ request }) => {
    const cartId = await cartWithOneItem(request);
    const response = await request.post('/api/orders', { data: { cartId } });

    expect(response.status()).toBe(400);
  });

  test('a missing cartId is rejected', async ({ request }) => {
    const response = await request.post('/api/orders', { data: { customer: VALID_CUSTOMER } });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('Field cartId is required');
  });

  test('an order can be read back by id', async ({ request }) => {
    const cartId = await cartWithOneItem(request);
    const created = await (
      await request.post('/api/orders', { data: { cartId, customer: VALID_CUSTOMER } })
    ).json();

    const response = await request.get(`/api/orders/${created.id}`);

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ id: created.id });
  });

  test('a missing order returns 404', async ({ request }) => {
    const response = await request.get('/api/orders/ORD-NOSUCH1');
    expect(response.status()).toBe(404);
  });
});
