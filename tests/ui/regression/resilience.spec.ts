import { expect, test } from '../fixtures.js';

/**
 * How the interface behaves when things go wrong or the viewport is small.
 *
 * These are the scenarios most likely to be forgotten in manual testing, and the ones that
 * make a suite worth running: they cover states a person would have to work to reproduce.
 */
test.describe('Resilience', () => {
  test('shows a message when the catalogue cannot be loaded', async ({ page, catalog }) => {
    await page.route('**/api/products?*', (route) => route.abort('failed'));
    await page.goto('/#/');

    await expect(catalog.productCards).toHaveCount(0);
    await expect(page.getByTestId('catalog-error')).toBeVisible();
  });

  test('shows a message when a product does not exist', async ({ product, page }) => {
    await page.goto('/#/product/nie-ma-takiego');

    await expect(page.getByTestId('product-error')).toBeVisible();
    await expect(product.addToCart).toBeHidden();
  });

  test('shows a message for an unknown order number', async ({ page }) => {
    await page.goto('/#/confirmation/ORD-NOSUCH1');

    await expect(page.getByTestId('order-error')).toBeVisible();
  });

  test('a product that is out of stock cannot be added to the cart', async ({ product }) => {
    await product.goto('p-011');

    await expect(product.outOfStock).toBeVisible();
    await expect(product.addToCart).toBeHidden();
  });

  test('adding without choosing a size is blocked with a hint', async ({ product }) => {
    await product.goto('p-001');
    await product.addToCart.click();

    await expect(product.error).toHaveText('Wybierz rozmiar');
  });

  test('the catalogue is usable on a phone-sized viewport', async ({ page, catalog }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await catalog.goto();

    await expect(catalog.productCards.first()).toBeVisible();
    await expect(catalog.search).toBeVisible();

    // A horizontally scrolling page is the classic symptom of a broken mobile layout.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });

  test('an unknown route falls back to the catalogue', async ({ page }) => {
    await page.goto('/zupelnie-nieznana-sciezka');

    // Client-side routing means the server must serve index.html for any path.
    await expect(page.getByTestId('logo')).toBeVisible();
  });
});
