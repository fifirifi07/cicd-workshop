import { expect, test } from '../fixtures.js';

test.describe('Catalogue', () => {
  test('filters by category', async ({ catalog }) => {
    await catalog.goto();
    await catalog.filterByCategory('hoodies');

    await expect(catalog.productCards).toHaveCount(4);
    const names = await catalog.productNames.allTextContents();
    expect(names.every((name) => name.startsWith('Bluza'))).toBe(true);
  });

  test('shows every category when the filter is cleared', async ({ catalog }) => {
    await catalog.goto();
    await catalog.filterByCategory('accessories');
    await expect(catalog.productCards).toHaveCount(4);

    await catalog.filterByCategory('all');
    await expect(catalog.productCards).toHaveCount(6);
  });

  test('sorts by price ascending', async ({ catalog }) => {
    await catalog.goto();
    await catalog.sortBy('price-asc');

    // `expect.poll` re-reads until the list settles. A one-shot read would catch the
    // previous order, because the select updates instantly while the data is still in flight.
    await expect.poll(() => catalog.firstProductName()).toBe('Naklejki CI/CD');
    const prices = await catalog.renderedPrices();
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('sorts by price descending', async ({ catalog }) => {
    await catalog.goto();
    await catalog.sortBy('price-desc');

    await expect.poll(() => catalog.firstProductName()).toBe('Bluza Merge Conflict');
    const prices = await catalog.renderedPrices();
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('sorts by name', async ({ catalog }) => {
    await catalog.goto();
    await catalog.sortBy('name-asc');

    await expect.poll(() => catalog.firstProductName()).toBe('Bluza Hotfix');
    const names = await catalog.productNames.allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pl')));
  });

  test('sorts by rating', async ({ catalog }) => {
    await catalog.goto();
    await catalog.sortBy('rating-desc');

    await expect(catalog.productNames.first()).toHaveText('Bluza Pipeline');
  });

  test('search narrows results by description as well', async ({ catalog }) => {
    await catalog.goto();
    await catalog.searchFor('regresję');

    await expect(catalog.productCards).toHaveCount(1);
    await expect(catalog.productNames.first()).toHaveText('Kubek Continuous Coffee');
  });

  test('search is case-insensitive', async ({ catalog }) => {
    await catalog.goto();
    await catalog.searchFor('BLUZA');

    expect(await catalog.productCards.count()).toBeGreaterThan(0);
  });

  test('a phrase with no matches shows an explanation, not an empty page', async ({ catalog }) => {
    await catalog.goto();
    await catalog.searchFor('czegoś takiego tu nie ma');

    await expect(catalog.noResults).toBeVisible();
    await expect(catalog.productCards).toHaveCount(0);
  });

  test('paginates through the catalogue', async ({ catalog }) => {
    await catalog.goto();

    await expect(catalog.pageNumber).toHaveText('Strona 1 z 2');
    await expect(catalog.previousPage).toBeDisabled();

    const firstProductOnPageOne = (await catalog.productNames.first().textContent()) ?? '';
    await catalog.nextPage.click();

    await expect(catalog.pageNumber).toHaveText('Strona 2 z 2');
    // A retrying assertion, not a one-shot read: the page counter is local React state and
    // flips immediately, while the list still shows page one until the request resolves.
    await expect(catalog.productNames.first()).not.toHaveText(firstProductOnPageOne);
    await expect(catalog.nextPage).toBeDisabled();
  });

  test('changing a filter returns to the first page', async ({ catalog }) => {
    await catalog.goto();
    await catalog.nextPage.click();
    await expect(catalog.pageNumber).toHaveText('Strona 2 z 2');

    await catalog.filterByCategory('accessories');

    // Staying on page 2 of a shorter result set would show an empty grid.
    await expect(catalog.productCards).toHaveCount(4);
    await expect(catalog.pagination).toBeHidden();
  });

  test('marks a product that is out of stock', async ({ catalog }) => {
    await catalog.goto();
    await catalog.searchFor('Legacy');

    await expect(catalog.card('p-011').getByTestId('out-of-stock')).toBeVisible();
  });

  test('marks a product with only a few left', async ({ catalog }) => {
    await catalog.goto();
    await catalog.searchFor('Hotfix');

    await expect(catalog.card('p-012').getByTestId('low-stock')).toHaveText('Ostatnie sztuki: 2');
  });

  test('opens product details from a card', async ({ catalog, product }) => {
    await catalog.goto();
    await catalog.openProduct('p-004');

    await expect(product.name).toHaveText('Bluza Pipeline');
    await expect(product.price).toHaveText('199,00 zł');
  });
});
