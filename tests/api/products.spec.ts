import { expect, test } from '@playwright/test';

test.describe('GET /api/products', () => {
  test('returns the first page of the catalogue @smoke', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body).toMatchObject({ total: expect.any(Number), limit: 20, offset: 0 });
  });

  test('filters by category', async ({ request }) => {
    const response = await request.get('/api/products?category=hoodies&limit=50');
    const body = await response.json();

    expect(body.items.length).toBeGreaterThan(0);
    for (const product of body.items) {
      expect(product.category).toBe('hoodies');
    }
  });

  test('sorts by price ascending', async ({ request }) => {
    const response = await request.get('/api/products?sort=price-asc&limit=50');
    const prices = (await response.json()).items.map((p: { price: number }) => p.price);

    expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));
  });

  test('searches by phrase in the name', async ({ request }) => {
    const response = await request.get('/api/products?search=kubek');
    const body = await response.json();

    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].name.toLowerCase()).toContain('kubek');
  });

  test('no match returns an empty list rather than an error', async ({ request }) => {
    const response = await request.get('/api/products?search=no-such-phrase-exists');

    expect(response.status()).toBe(200);
    expect((await response.json()).items).toEqual([]);
  });

  test('returns a bounded slice', async ({ request }) => {
    const first = await (await request.get('/api/products?limit=3&offset=0')).json();
    const second = await (await request.get('/api/products?limit=3&offset=3')).json();

    expect(first.items).toHaveLength(3);
    expect(first.items[0].id).not.toBe(second.items[0].id);
    expect(first.total).toBe(second.total);
  });

  test('an offset past the end returns no items but still reports the total', async ({
    request,
  }) => {
    const body = await (await request.get('/api/products?limit=5&offset=999')).json();

    expect(body.items).toEqual([]);
    expect(body.total).toBeGreaterThan(0);
  });

  test('a limit above the maximum is rejected', async ({ request }) => {
    // Without an upper bound, `?limit=1000000` would be a cheap denial-of-service.
    const response = await request.get('/api/products?limit=1000000');
    expect(response.status()).toBe(400);
  });

  test('a malformed limit is rejected', async ({ request }) => {
    expect((await request.get('/api/products?limit=abc')).status()).toBe(400);
    expect((await request.get('/api/products?limit=0')).status()).toBe(400);
  });

  test('a negative offset is rejected', async ({ request }) => {
    expect((await request.get('/api/products?offset=-1')).status()).toBe(400);
  });

  test('the response carries no page numbers', async ({ request }) => {
    // Page numbers are a presentation concept; the contract exposes total/limit/offset only.
    const body = await (await request.get('/api/products')).json();

    expect(body).not.toHaveProperty('page');
    expect(body).not.toHaveProperty('pageSize');
    expect(body).not.toHaveProperty('totalPages');
  });

  test('an unknown category fails with 400', async ({ request }) => {
    const response = await request.get('/api/products?category=no-such-category');

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('category');
  });

  test('an unknown sort option fails with 400', async ({ request }) => {
    const response = await request.get('/api/products?sort=random');
    expect(response.status()).toBe(400);
  });
});

test.describe('GET /api/products/:id', () => {
  test('returns details of an existing product', async ({ request }) => {
    const response = await request.get('/api/products/p-001');

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      id: 'p-001',
      name: expect.any(String),
      price: expect.any(Number),
    });
  });

  test('a missing product returns 404', async ({ request }) => {
    const response = await request.get('/api/products/no-such-product');
    expect(response.status()).toBe(404);
  });
});

test.describe('Contract and diagnostics', () => {
  test('/api/health responds @smoke', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect((await response.json()).status).toBe('ok');
  });

  test('/api/openapi.json exposes the contract', async ({ request }) => {
    const response = await request.get('/api/openapi.json');
    const spec = await response.json();

    expect(response.status()).toBe(200);
    expect(spec.openapi).toMatch(/^3\./);
    // The contract is the input for the breaking-change check in CI, so it has to be
    // reachable and well-formed before anything else relies on it.
    expect(Object.keys(spec.paths)).toContain('/api/products');
  });

  test('an unknown API resource returns JSON, not an HTML page', async ({ request }) => {
    const response = await request.get('/api/no-such-resource');

    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toContain('application/json');
  });
});
