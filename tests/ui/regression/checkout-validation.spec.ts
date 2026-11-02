import { expect, test } from '../fixtures.js';
import { VALID_CUSTOMER, type CustomerForm } from '../pages/CheckoutPage.js';

async function withOneItem(
  product: { goto: (id: string) => Promise<void>; add: (o?: { size?: string }) => Promise<void> },
  checkout: { goto: () => Promise<void> },
) {
  await product.goto('p-007');
  await product.add();
  await checkout.goto();
}

test.describe('Checkout - validation', () => {
  const REQUIRED: Array<[keyof CustomerForm, string]> = [
    ['email', 'Podaj adres e-mail'],
    ['firstName', 'Podaj imię'],
    ['lastName', 'Podaj nazwisko'],
    ['street', 'Podaj ulicę i numer'],
    ['postalCode', 'Podaj kod pocztowy'],
    ['city', 'Podaj miasto'],
  ];

  for (const [field, message] of REQUIRED) {
    test(`reports a missing ${field}`, async ({ product, checkout }) => {
      await withOneItem(product, checkout);
      await checkout.submit({ ...VALID_CUSTOMER, [field]: '' });

      await expect(checkout.error(field)).toHaveText(message);
    });
  }

  const BAD_EMAILS = ['bez-malpy', 'a@b', 'a@@b.pl', 'ze spacja@b.pl'];
  for (const email of BAD_EMAILS) {
    test(`rejects the e-mail "${email}"`, async ({ product, checkout }) => {
      await withOneItem(product, checkout);
      await checkout.submit({ ...VALID_CUSTOMER, email });

      await expect(checkout.error('email')).toHaveText('Nieprawidłowy adres e-mail');
    });
  }

  const BAD_POSTAL_CODES = ['80180', '8-180', '80-18', 'AB-180'];
  for (const postalCode of BAD_POSTAL_CODES) {
    test(`rejects the postal code "${postalCode}"`, async ({ product, checkout }) => {
      await withOneItem(product, checkout);
      await checkout.submit({ ...VALID_CUSTOMER, postalCode });

      await expect(checkout.error('postalCode')).toHaveText(
        'Kod pocztowy musi mieć format 00-000',
      );
    });
  }

  test('whitespace alone counts as a missing value', async ({ product, checkout }) => {
    await withOneItem(product, checkout);
    await checkout.submit({ ...VALID_CUSTOMER, firstName: '   ' });

    await expect(checkout.error('firstName')).toHaveText('Podaj imię');
  });

  test('an e-mail with surrounding spaces is accepted', async ({
    product,
    checkout,
    confirmation,
  }) => {
    await withOneItem(product, checkout);
    await checkout.submit({ ...VALID_CUSTOMER, email: '  jan@example.com  ' });

    await confirmation.waitUntilVisible();
  });

  test('a valid form leaves no error messages behind', async ({
    product,
    checkout,
    confirmation,
  }) => {
    await withOneItem(product, checkout);
    await checkout.submit(VALID_CUSTOMER);

    await confirmation.waitUntilVisible();
    for (const [field] of REQUIRED) {
      await expect(checkout.error(field)).toBeHidden();
    }
  });

  test('the form does not rely on browser validation', async ({ product, checkout, page }) => {
    await withOneItem(product, checkout);

    // `noValidate` means our own messages are shown - consistent across browsers and
    // translatable, unlike the native bubbles.
    await expect(page.locator('form')).toHaveAttribute('novalidate', '');
  });
});
