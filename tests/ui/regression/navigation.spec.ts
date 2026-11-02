import { expect, test } from '../fixtures.js';
import { VALID_CUSTOMER } from '../pages/CheckoutPage.js';

test.describe('Navigation and header', () => {
  test('the logo returns to the catalogue from any view', async ({ cart, catalog, page }) => {
    await cart.goto();
    await page.getByTestId('logo').click();

    await expect(catalog.productCards.first()).toBeVisible();
  });

  test('the header link leads to the cart', async ({ catalog, cart, page }) => {
    await catalog.goto();
    await page.getByTestId('cart-link').click();

    await expect(cart.emptyMessage).toBeVisible();
  });

  test('the counter starts at zero', async ({ catalog }) => {
    await catalog.goto();

    await expect(catalog.cartCount).toHaveText('0');
  });

  test('the counter is visible on the product view too', async ({ product, catalog }) => {
    await product.goto('p-001');

    await expect(catalog.cartCount).toBeVisible();
  });

  test('the browser back button returns from product to catalogue', async ({
    catalog,
    page,
    product,
  }) => {
    await catalog.goto();
    await catalog.openProduct('p-004');
    await expect(product.name).toHaveText('Bluza Pipeline');

    await page.goBack();
    await expect(catalog.productCards.first()).toBeVisible();
  });

  test('a deep link to a product works without visiting the catalogue first', async ({
    product,
  }) => {
    await product.goto('p-006');

    await expect(product.name).toHaveText('Bluza Merge Conflict');
  });

  test('a deep link to the cart works', async ({ cart }) => {
    await cart.goto();

    await expect(cart.emptyMessage).toBeVisible();
  });

  test('the checkout route redirects nowhere when the cart is empty', async ({ checkout }) => {
    await checkout.goto();

    // It stays on the checkout view and explains the situation, rather than bouncing
    // the customer somewhere they did not ask to go.
    await expect(checkout.emptyMessage).toBeVisible();
  });

  test('the confirmation is reachable by its order number', async ({
    product,
    checkout,
    confirmation,
    page,
  }) => {
    await product.goto('p-007');
    await product.add();
    await checkout.goto();
    await checkout.submit(VALID_CUSTOMER);
    await confirmation.waitUntilVisible();

    const orderNumber = await confirmation.orderNumber.textContent();
    await page.goto('/#/');
    await page.goto(`/#/confirmation/${orderNumber}`);

    await expect(confirmation.orderNumber).toHaveText(orderNumber ?? '');
  });

  test('the confirmation lists the ordered items', async ({
    product,
    checkout,
    confirmation,
  }) => {
    await product.goto('p-008');
    await product.add({ quantity: 2 });
    await checkout.goto();
    await checkout.submit(VALID_CUSTOMER);

    await confirmation.waitUntilVisible();
    await expect(confirmation.items).toHaveCount(1);
    await expect(confirmation.items.first()).toContainText('Naklejki CI/CD');
  });

  test('the confirmation offers a way back to the catalogue', async ({
    product,
    checkout,
    confirmation,
    catalog,
    page,
  }) => {
    await product.goto('p-007');
    await product.add();
    await checkout.goto();
    await checkout.submit(VALID_CUSTOMER);
    await confirmation.waitUntilVisible();

    await page.getByRole('link', { name: 'Wróć do katalogu' }).click();
    await expect(catalog.productCards.first()).toBeVisible();
  });

  test('the page has a title', async ({ catalog, page }) => {
    await catalog.goto();

    await expect(page).toHaveTitle(/Workshop shop/);
  });

  test('the catalogue survives a reload with filters applied', async ({ catalog, page }) => {
    await catalog.goto();
    await catalog.filterByCategory('hoodies');
    await expect(catalog.productCards).toHaveCount(4);

    await page.reload();
    // Filters live in component state, not the URL - after a reload the full list is back.
    // Documenting the current behaviour matters more than pretending it is otherwise.
    await expect(catalog.productCards).toHaveCount(6);
  });

  test('the cart link count updates without a reload', async ({ product, catalog }) => {
    await product.goto('p-007');
    await expect(catalog.cartCount).toHaveText('0');

    await product.add();
    await expect(catalog.cartCount).toHaveText('1');
  });
});
