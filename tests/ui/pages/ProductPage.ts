import type { Locator, Page } from '@playwright/test';

export class ProductPage {
  readonly root: Locator;
  readonly name: Locator;
  readonly price: Locator;
  readonly rating: Locator;
  readonly sizeSelect: Locator;
  readonly quantity: Locator;
  readonly addToCart: Locator;
  readonly addedMessage: Locator;
  readonly error: Locator;
  readonly outOfStock: Locator;

  constructor(private readonly page: Page) {
    // Every locator is scoped to the details section on purpose. Ids such as `product-name`,
    // `product-price` and `out-of-stock` also exist on catalogue cards, so an unscoped
    // locator matches six elements the moment the catalogue is on screen - including during
    // the brief window after a click but before navigation completes.
    this.root = page.getByTestId('product-details');
    this.name = this.root.getByTestId('product-name');
    this.price = this.root.getByTestId('product-price');
    this.rating = this.root.getByTestId('product-rating');
    this.sizeSelect = this.root.getByTestId('size-select');
    this.quantity = this.root.getByTestId('quantity');
    this.addToCart = this.root.getByTestId('add-to-cart');
    this.addedMessage = this.root.getByTestId('added-to-cart');
    this.error = this.root.getByTestId('product-error');
    this.outOfStock = this.root.getByTestId('out-of-stock');
  }

  async goto(productId: string): Promise<void> {
    await this.page.goto(`/#/product/${productId}`);
    // Waiting for *this* product, not for any details section: navigating between two
    // products keeps the section mounted, so a generic wait would return while the
    // previous product is still on screen.
    await this.page.locator(`[data-testid="product-details"][data-product-id="${productId}"]`).waitFor();
  }

  async add(options: { size?: string; quantity?: number } = {}): Promise<void> {
    if (options.size) await this.sizeSelect.selectOption(options.size);
    if (options.quantity) await this.quantity.fill(String(options.quantity));
    await this.addToCart.click();
  }
}
