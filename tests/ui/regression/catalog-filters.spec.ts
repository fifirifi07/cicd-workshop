import { expect, test } from '../fixtures.js';

/**
 * Filtering and sorting combinations.
 *
 * Split from `catalog.spec.ts` on purpose: separate files give the shard splitter something
 * to distribute, and they keep each file readable when the suite grows.
 */
test.describe('Catalogue - filters', () => {
  for (const [category, expectedPrefix] of [
    ['tshirts', 'Koszulka'],
    ['hoodies', 'Bluza'],
  ] as const) {
    test(`category ${category} returns only matching products`, async ({ catalog }) => {
      await catalog.goto();
      await catalog.filterByCategory(category);

      // Poll until every rendered name matches: the list still holds the previous
      // category for as long as the request is in flight.
      await expect
        .poll(async () => {
          const names = await catalog.productNames.allTextContents();
          return names.length > 0 && names.every((name) => name.startsWith(expectedPrefix));
        })
        .toBe(true);
    });
  }

  test('the accessories category has no size selector on its products', async ({
    catalog,
    product,
  }) => {
    await catalog.goto();
    await catalog.filterByCategory('accessories');
    await catalog.openProduct('p-007');

    await expect(product.sizeSelect).toBeHidden();
    await expect(product.addToCart).toBeVisible();
  });

  test('a category with few products hides the pagination', async ({ catalog }) => {
    await catalog.goto();
    await catalog.filterByCategory('tshirts');

    await expect(catalog.pagination).toBeHidden();
  });

  test('search combined with a category narrows further', async ({ catalog }) => {
    await catalog.goto();
    await catalog.filterByCategory('hoodies');
    await catalog.searchFor('Hotfix');

    await expect(catalog.productCards).toHaveCount(1);
  });

  test('search combined with a category can yield nothing', async ({ catalog }) => {
    await catalog.goto();
    await catalog.filterByCategory('accessories');
    await catalog.searchFor('Bluza');

    await expect(catalog.noResults).toBeVisible();
  });

  test('clearing the search phrase restores the full list', async ({ catalog }) => {
    await catalog.goto();
    await catalog.searchFor('Debugger');
    await expect(catalog.productCards).toHaveCount(1);

    await catalog.searchFor('');
    await expect(catalog.productCards).toHaveCount(6);
  });

  test('search matches a phrase in the middle of a name', async ({ catalog }) => {
    await catalog.goto();
    await catalog.searchFor('Cache');

    await expect(catalog.productNames.first()).toHaveText('Czapka Cache Hit');
  });

  test('search ignores surrounding whitespace', async ({ catalog }) => {
    await catalog.goto();
    await catalog.searchFor('   Debugger   ');

    await expect(catalog.productCards).toHaveCount(1);
  });

  test('sorting is preserved when the category changes', async ({ catalog }) => {
    await catalog.goto();
    await catalog.sortBy('price-desc');
    await catalog.filterByCategory('hoodies');

    await expect(catalog.productCards).toHaveCount(4);
    await expect.poll(() => catalog.firstProductName()).toBe('Bluza Merge Conflict');
    const prices = await catalog.renderedPrices();
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('sorting by price ascending puts the cheapest item first', async ({ catalog }) => {
    await catalog.goto();
    await catalog.sortBy('price-asc');

    await expect(catalog.productNames.first()).toHaveText('Naklejki CI/CD');
  });

  test('sorting by price descending puts the most expensive item first', async ({ catalog }) => {
    await catalog.goto();
    await catalog.sortBy('price-desc');

    await expect(catalog.productNames.first()).toHaveText('Bluza Merge Conflict');
  });

  test('the out-of-stock product is still listed and searchable', async ({ catalog }) => {
    await catalog.goto();
    await catalog.filterByCategory('tshirts');

    // A product with no stock must remain visible - hiding it would look like a data loss.
    await expect(catalog.card('p-011')).toBeVisible();
  });

  test('every card shows a price', async ({ catalog }) => {
    await catalog.goto();

    const prices = await catalog.productPrices.allTextContents();
    expect(prices).toHaveLength(6);
    expect(prices.every((price) => /^\d+,\d{2} zł$/.test(price))).toBe(true);
  });

  test('every card links to its own product', async ({ catalog }) => {
    await catalog.goto();

    const links = await catalog.productCards.getByTestId('view-product').all();
    const hrefs = await Promise.all(links.map((link) => link.getAttribute('href')));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
