import { expect, test } from '../fixtures.js';

test.describe('Cart', () => {
  test('an empty cart explains what to do next', async ({ cart }) => {
    await cart.goto();

    await expect(cart.emptyMessage).toBeVisible();
    await expect(cart.items).toHaveCount(0);
  });

  test('the same product in two sizes appears as two lines', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });
    await product.goto('p-001');
    await product.add({ size: 'L' });

    await cart.goto();
    await expect(cart.items).toHaveCount(2);
  });

  test('changing the quantity updates the line price and the total', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await cart.goto();
    await cart.setQuantity(0, 3);

    await expect(cart.row(0).getByTestId('item-price')).toHaveText('267,00 zł');
    await expect(cart.subtotal).toHaveText('267,00 zł');
  });

  test('removing the last line empties the cart', async ({ product, cart }) => {
    await product.goto('p-007');
    await product.add();

    await cart.goto();
    await cart.remove(0);

    await expect(cart.emptyMessage).toBeVisible();
    await expect(cart.cartCount).toHaveText('0');
  });

  test('the header counter sums quantities, not lines', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'M', quantity: 3 });

    await cart.goto();
    await expect(cart.cartCount).toHaveText('3');
    await expect(cart.items).toHaveCount(1);
  });

  test('a valid discount code lowers the total', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await cart.goto();
    await cart.useDiscount('WELCOME10');

    await expect(cart.appliedDiscount).toHaveText('Kod: WELCOME10');
    await expect(cart.discount).toHaveText('-8,90 zł');
    await expect(cart.total).toHaveText('95,10 zł');
  });

  test('an expired code is rejected with a Polish message', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await cart.goto();
    await cart.useDiscount('SUMMER20');

    // The API answers in English; the interface must not echo that at the customer.
    await expect(cart.discountError).toHaveText('Ten kod rabatowy już wygasł');
    await expect(cart.discount).toHaveText('-0,00 zł');
  });

  test('an unknown code is rejected with a Polish message', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await cart.goto();
    await cart.useDiscount('NIE-MA-TAKIEGO');

    await expect(cart.discountError).toHaveText('Nie znamy takiego kodu rabatowego');
  });

  test('a free-shipping code removes the delivery charge', async ({ product, cart }) => {
    await product.goto('p-008');
    await product.add();

    await cart.goto();
    await expect(cart.shipping).toHaveText('15,00 zł');

    await cart.useDiscount('FREESHIP');
    await expect(cart.shipping).toHaveText('Gratis');
  });

  test('an order above the threshold ships free without a code', async ({ product, cart }) => {
    await product.goto('p-004');
    await product.add({ size: 'M', quantity: 2 });

    await cart.goto();
    await expect(cart.subtotal).toHaveText('398,00 zł');
    await expect(cart.shipping).toHaveText('Gratis');
  });

  test('the cart survives a page reload', async ({ product, cart, page }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await cart.goto();
    await page.reload();

    // The cart id lives in localStorage; a reload must not lose the basket.
    await expect(cart.items).toHaveCount(1);
    await expect(cart.cartCount).toHaveText('1');
  });
});
