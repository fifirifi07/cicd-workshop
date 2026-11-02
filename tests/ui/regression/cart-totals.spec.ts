import { expect, test } from '../fixtures.js';

/**
 * Money arithmetic as the customer sees it.
 *
 * The same rules are covered by unit tests on `src/shared/cart.ts`, but those verify the
 * calculation; these verify that the calculated value actually reaches the screen. Both
 * are needed - a correct total rendered in the wrong row is still a bug.
 */
test.describe('Cart - totals', () => {
  test('a single accessory shows goods, shipping and total', async ({ product, cart }) => {
    await product.goto('p-008');
    await product.add();

    await cart.goto();
    await expect(cart.subtotal).toHaveText('19,00 zł');
    await expect(cart.shipping).toHaveText('15,00 zł');
    await expect(cart.total).toHaveText('34,00 zł');
  });

  test('two different products sum correctly', async ({ product, cart }) => {
    await product.goto('p-008');
    await product.add();
    await product.goto('p-007');
    await product.add();

    await cart.goto();
    await expect(cart.subtotal).toHaveText('68,00 zł');
  });

  test('quantity multiplies the line price', async ({ product, cart }) => {
    await product.goto('p-008');
    await product.add({ quantity: 5 });

    await cart.goto();
    await expect(cart.row(0).getByTestId('item-price')).toHaveText('95,00 zł');
  });

  test('exactly at the threshold shipping is free', async ({ product, cart }) => {
    // 219,00 zł crosses the 200 zł threshold on its own.
    await product.goto('p-012');
    await product.add({ size: 'M' });

    await cart.goto();
    await expect(cart.shipping).toHaveText('Gratis');
  });

  test('just below the threshold shipping is charged', async ({ product, cart }) => {
    await product.goto('p-004');
    await product.add({ size: 'M' });

    await cart.goto();
    await expect(cart.subtotal).toHaveText('199,00 zł');
    await expect(cart.shipping).toHaveText('15,00 zł');
  });

  test('a percentage discount is shown as a negative amount', async ({ product, cart }) => {
    await product.goto('p-007');
    await product.add();

    await cart.goto();
    await cart.useDiscount('WELCOME10');

    await expect(cart.discount).toHaveText('-4,90 zł');
  });

  test('the fifty percent code halves the goods value', async ({ product, cart }) => {
    await product.goto('p-004');
    await product.add({ size: 'M' });

    await cart.goto();
    await cart.useDiscount('MEGA50');

    await expect(cart.discount).toHaveText('-99,50 zł');
    await expect(cart.total).toHaveText('99,50 zł');
  });

  test('a discount code lowering the value below the threshold still ships free with MEGA50', async ({
    product,
    cart,
  }) => {
    await product.goto('p-005');
    await product.add({ size: 'M' });

    await cart.goto();
    await cart.useDiscount('MEGA50');

    // MEGA50 grants free shipping explicitly, so the threshold does not matter here.
    await expect(cart.shipping).toHaveText('Gratis');
  });

  test('a discount code is lower-cased input but shown upper-cased', async ({ product, cart }) => {
    await product.goto('p-007');
    await product.add();

    await cart.goto();
    await cart.useDiscount('welcome10');

    await expect(cart.appliedDiscount).toHaveText('Kod: WELCOME10');
  });

  test('changing quantity after a discount recalculates it', async ({ product, cart }) => {
    await product.goto('p-007');
    await product.add();

    await cart.goto();
    await cart.useDiscount('WELCOME10');
    await expect(cart.discount).toHaveText('-4,90 zł');

    await cart.setQuantity(0, 2);
    await expect(cart.discount).toHaveText('-9,80 zł');
  });

  test('removing a line recalculates the total', async ({ product, cart }) => {
    await product.goto('p-008');
    await product.add();
    await product.goto('p-007');
    await product.add();

    await cart.goto();
    await expect(cart.subtotal).toHaveText('68,00 zł');

    await cart.remove(0);
    await expect(cart.items).toHaveCount(1);
    await expect(cart.subtotal).toHaveText('49,00 zł');
  });

  test('a rejected code leaves the totals untouched', async ({ product, cart }) => {
    await product.goto('p-007');
    await product.add();

    await cart.goto();
    const totalBefore = await cart.total.textContent();
    await cart.useDiscount('SUMMER20');

    await expect(cart.discountError).toBeVisible();
    await expect(cart.total).toHaveText(totalBefore ?? '');
  });

  test('the cart line shows the chosen size', async ({ product, cart }) => {
    await product.goto('p-001');
    await product.add({ size: 'L' });

    await cart.goto();
    await expect(cart.row(0).getByTestId('item-size')).toHaveText('L');
  });

  test('an accessory line shows a dash instead of a size', async ({ product, cart }) => {
    await product.goto('p-008');
    await product.add();

    await cart.goto();
    await expect(cart.row(0).getByTestId('item-size')).toHaveText('—');
  });

  test('the checkout button carries the current total', async ({ product, cart }) => {
    await product.goto('p-007');
    await product.add();

    await cart.goto();
    await expect(cart.goToCheckout).toBeVisible();
    await expect(cart.total).toHaveText('64,00 zł');
  });
});
