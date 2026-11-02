import { expect, test } from '../fixtures.js';

test.describe('Product details', () => {
  test('shows name, price, description and rating', async ({ product, page }) => {
    await product.goto('p-004');

    await expect(product.name).toHaveText('Bluza Pipeline');
    await expect(product.price).toHaveText('199,00 zł');
    await expect(product.rating).toHaveText('Ocena: 4.9');
    await expect(page.getByTestId('product-description')).toContainText('kapturem');
  });

  test('offers only the sizes the product actually has', async ({ product }) => {
    await product.goto('p-005');

    const options = await product.sizeSelect.locator('option').allTextContents();
    expect(options).toEqual(['Wybierz rozmiar', 'M', 'L']);
  });

  test('offers all four sizes when the product has them', async ({ product }) => {
    await product.goto('p-001');

    const options = await product.sizeSelect.locator('option').allTextContents();
    expect(options).toEqual(['Wybierz rozmiar', 'S', 'M', 'L', 'XL']);
  });

  test('an accessory has no size selector', async ({ product }) => {
    await product.goto('p-008');

    await expect(product.sizeSelect).toBeHidden();
  });

  test('the quantity field starts at one', async ({ product }) => {
    await product.goto('p-001');

    await expect(product.quantity).toHaveValue('1');
  });

  test('the quantity field is bounded in the markup', async ({ product }) => {
    await product.goto('p-001');

    await expect(product.quantity).toHaveAttribute('min', '1');
    await expect(product.quantity).toHaveAttribute('max', '10');
  });

  test('adding shows a confirmation with a link to the cart', async ({ product, page }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await expect(product.addedMessage).toBeVisible();
    await expect(page.getByRole('link', { name: 'Przejdź do koszyka' })).toBeVisible();
  });

  test('adding a chosen quantity updates the counter by that amount', async ({
    product,
    catalog,
  }) => {
    await product.goto('p-001');
    await product.add({ size: 'M', quantity: 4 });

    await expect(catalog.cartCount).toHaveText('4');
  });

  test('adding twice from the details page accumulates', async ({ product, catalog }) => {
    await product.goto('p-001');
    await product.add({ size: 'M', quantity: 2 });
    await product.add({ quantity: 3 });

    await expect(catalog.cartCount).toHaveText('5');
  });

  test('a quantity above ten is capped by the server', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'M', quantity: 10 });
    await product.add({ quantity: 5 });

    await cart.goto();
    // The server clamps to ten; the interface must show the clamped value, not the request.
    await expect(cart.row(0).getByTestId('item-quantity')).toHaveValue('10');
  });

  test('the back link returns to the catalogue', async ({ product, catalog, page }) => {
    await product.goto('p-004');
    await page.getByRole('link', { name: '← Wróć do katalogu' }).click();

    await expect(catalog.productCards.first()).toBeVisible();
  });

  test('the low-stock product can still be bought', async ({ product, catalog }) => {
    await product.goto('p-012');
    await product.add({ size: 'M' });

    await expect(catalog.cartCount).toHaveText('1');
  });

  test('switching size between adds creates two lines', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });
    await product.add({ size: 'L' });

    await cart.goto();
    await expect(cart.items).toHaveCount(2);
  });

  test('the size hint disappears once a size is chosen', async ({ product }) => {
    await product.goto('p-001');
    await product.addToCart.click();
    await expect(product.error).toHaveText('Wybierz rozmiar');

    await product.add({ size: 'M' });
    await expect(product.error).toBeHidden();
    await expect(product.addedMessage).toBeVisible();
  });
});
