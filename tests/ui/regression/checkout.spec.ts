import { expect, test } from '../fixtures.js';
import { VALID_CUSTOMER } from '../pages/CheckoutPage.js';

/** Puts one item in the cart and lands on the checkout form. */
async function startCheckout(product: { goto: (id: string) => Promise<void>; add: (o?: { size?: string }) => Promise<void> }, checkout: { goto: () => Promise<void> }) {
  await product.goto('p-001');
  await product.add({ size: 'M' });
  await checkout.goto();
}

test.describe('Checkout', () => {
  test('an empty cart cannot be checked out', async ({ checkout }) => {
    await checkout.goto();
    await expect(checkout.emptyMessage).toBeVisible();
  });

  test('an empty form reports every field at once', async ({ product, checkout }) => {
    await startCheckout(product, checkout);
    await checkout.placeOrder.click();

    // Six fields, six messages - the customer must not discover them one submit at a time.
    for (const field of ['email', 'firstName', 'lastName', 'street', 'postalCode', 'city'] as const) {
      await expect(checkout.error(field)).toBeVisible();
    }
  });

  test('rejects a malformed e-mail address', async ({ product, checkout }) => {
    await startCheckout(product, checkout);
    await checkout.submit({ ...VALID_CUSTOMER, email: 'nie-jest-mailem' });

    await expect(checkout.error('email')).toHaveText('Nieprawidłowy adres e-mail');
  });

  test('rejects a malformed postal code', async ({ product, checkout }) => {
    await startCheckout(product, checkout);
    await checkout.submit({ ...VALID_CUSTOMER, postalCode: '80180' });

    await expect(checkout.error('postalCode')).toHaveText('Kod pocztowy musi mieć format 00-000');
  });

  test('marks invalid fields for assistive technology', async ({ product, checkout }) => {
    await startCheckout(product, checkout);
    await checkout.placeOrder.click();

    await expect(checkout.field('email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('clears the error once the field is corrected and resubmitted', async ({
    product,
    checkout,
  }) => {
    await startCheckout(product, checkout);
    await checkout.submit({ ...VALID_CUSTOMER, postalCode: 'zle' });
    await expect(checkout.error('postalCode')).toBeVisible();

    await checkout.submit({ postalCode: '80-180' });
    await expect(checkout.error('postalCode')).toBeHidden();
  });

  test('the button shows the amount to be paid', async ({ product, checkout }) => {
    await startCheckout(product, checkout);
    await expect(checkout.placeOrder).toHaveText('Zamawiam i płacę 104,00 zł');
  });

  test('a placed order shows the number, the lines and the amount', async ({
    product,
    checkout,
    confirmation,
  }) => {
    await startCheckout(product, checkout);
    await checkout.submit(VALID_CUSTOMER);

    await confirmation.waitUntilVisible();
    await expect(confirmation.orderNumber).toHaveText(/^ORD-[0-9A-F]{8}$/);
    await expect(confirmation.items).toHaveCount(1);
    await expect(confirmation.orderTotal).toHaveText('104,00 zł');
  });

  test('the cart is empty after the order is placed', async ({
    product,
    checkout,
    confirmation,
    cart,
  }) => {
    await startCheckout(product, checkout);
    await checkout.submit(VALID_CUSTOMER);
    await confirmation.waitUntilVisible();

    await cart.goto();
    await expect(cart.emptyMessage).toBeVisible();
    await expect(cart.cartCount).toHaveText('0');
  });

  test('a discount applied in the cart carries over to the order', async ({
    product,
    cart,
    checkout,
    confirmation,
  }) => {
    await product.goto('p-001');
    await product.add({ size: 'M' });

    await cart.goto();
    await cart.useDiscount('WELCOME10');
    await cart.goToCheckout.click();

    await checkout.submit(VALID_CUSTOMER);

    await confirmation.waitUntilVisible();
    await expect(confirmation.orderTotal).toHaveText('95,10 zł');
  });
});
