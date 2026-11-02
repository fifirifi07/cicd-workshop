import type { Locator, Page } from '@playwright/test';

export class CartPage {
  readonly items: Locator;
  readonly emptyMessage: Locator;
  readonly discountCode: Locator;
  readonly applyDiscount: Locator;
  readonly appliedDiscount: Locator;
  readonly discountError: Locator;
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly shipping: Locator;
  readonly total: Locator;
  readonly goToCheckout: Locator;
  readonly cartCount: Locator;

  constructor(private readonly page: Page) {
    this.items = page.getByTestId('cart-item');
    this.emptyMessage = page.getByTestId('empty-cart');
    this.discountCode = page.getByTestId('discount-code');
    this.applyDiscount = page.getByTestId('apply-discount');
    this.appliedDiscount = page.getByTestId('applied-discount');
    this.discountError = page.getByTestId('discount-error');
    this.subtotal = page.getByTestId('subtotal');
    this.discount = page.getByTestId('discount');
    this.shipping = page.getByTestId('shipping');
    this.total = page.getByTestId('total');
    this.goToCheckout = page.getByTestId('go-to-checkout');
    this.cartCount = page.getByTestId('cart-count');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#/cart');
    await this.page.getByTestId('cart').waitFor();
  }

  row(index = 0): Locator {
    return this.items.nth(index);
  }

  async setQuantity(index: number, quantity: number): Promise<void> {
    await this.row(index).getByTestId('item-quantity').fill(String(quantity));
    // The input fires a request per change; blurring makes the intent explicit.
    await this.row(index).getByTestId('item-quantity').blur();
  }

  async remove(index: number): Promise<void> {
    await this.row(index).getByTestId('remove-item').click();
  }

  async useDiscount(code: string): Promise<void> {
    await this.discountCode.fill(code);
    await this.applyDiscount.click();
  }
}
