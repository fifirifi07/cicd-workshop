import { expect, test } from '../fixtures.js';
import { VALID_CUSTOMER } from '../pages/CheckoutPage.js';

/**
 * The critical path: five tests that answer one question - "is the shop usable at all?".
 *
 * This is the suite that runs on every pull request. It is deliberately small: its job is
 * to fail fast on a broken build, not to cover edge cases. Full regression runs on `main`.
 */
test.describe('Critical path @smoke', () => {
  test('the catalogue shows products', async ({ catalog }) => {
    await catalog.goto();

    await expect(catalog.productCards.first()).toBeVisible();
    expect(await catalog.productCards.count()).toBeGreaterThan(0);
  });

  test('search finds a product', async ({ catalog }) => {
    await catalog.goto();
    await catalog.searchFor('Debugger');

    await expect(catalog.productCards).toHaveCount(1);
    await expect(catalog.productNames.first()).toHaveText('Koszulka Debugger');
  });

  test('adding a product updates the cart counter', async ({ product, catalog }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await expect(product.addedMessage).toBeVisible();
    await expect(catalog.cartCount).toHaveText('1');
  });

  test('the cart shows the added line and the total', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await cart.goto();

    await expect(cart.items).toHaveCount(1);
    await expect(cart.subtotal).toHaveText('89,00 zł');
    await expect(cart.total).toHaveText('104,00 zł');
  });

  test('a complete order ends with a confirmation', async ({
    product,
    cart,
    checkout,
    confirmation,
  }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await cart.goto();
    await cart.goToCheckout.click();

    await checkout.submit(VALID_CUSTOMER);

    await confirmation.waitUntilVisible();
    await expect(confirmation.orderNumber).toHaveText(/^ORD-[0-9A-F]{8}$/);
    await expect(confirmation.items).toHaveCount(1);
  });
});
