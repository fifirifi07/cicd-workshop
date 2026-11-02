import { test as base } from '@playwright/test';
import { CatalogPage } from './pages/CatalogPage.js';
import { ProductPage } from './pages/ProductPage.js';
import { CartPage } from './pages/CartPage.js';
import { CheckoutPage } from './pages/CheckoutPage.js';
import { ConfirmationPage } from './pages/ConfirmationPage.js';

interface Pages {
  catalog: CatalogPage;
  product: ProductPage;
  cart: CartPage;
  checkout: CheckoutPage;
  confirmation: ConfirmationPage;
}

/**
 * Page objects as fixtures.
 *
 * Each test gets a fresh browser context, so localStorage - and therefore the cart id -
 * is empty at the start. Tests never share a cart, which is what allows the whole suite
 * to run fully parallel and to be split across shards without interfering with itself.
 */
export const test = base.extend<Pages>({
  catalog: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
  product: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cart: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkout: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  confirmation: async ({ page }, use) => {
    await use(new ConfirmationPage(page));
  },
});

export { expect } from '@playwright/test';
