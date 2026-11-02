import type { Locator, Page } from '@playwright/test';

export class CatalogPage {
  readonly search: Locator;
  readonly categoryFilter: Locator;
  readonly sort: Locator;
  readonly productList: Locator;
  readonly productCards: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;
  readonly noResults: Locator;
  readonly pagination: Locator;
  readonly pageNumber: Locator;
  readonly nextPage: Locator;
  readonly previousPage: Locator;
  readonly cartCount: Locator;

  constructor(private readonly page: Page) {
    this.search = page.getByTestId('search');
    this.categoryFilter = page.getByTestId('category-filter');
    this.sort = page.getByTestId('sort');
    // Scoped to the list: the same ids appear on the product details view.
    this.productList = page.getByTestId('product-list');
    this.productCards = this.productList.getByTestId('product-card');
    this.productNames = this.productList.getByTestId('product-name');
    this.productPrices = this.productList.getByTestId('product-price');
    this.noResults = page.getByTestId('no-results');
    this.pagination = page.getByTestId('pagination');
    this.pageNumber = page.getByTestId('page-number');
    this.nextPage = page.getByTestId('next-page');
    this.previousPage = page.getByTestId('previous-page');
    this.cartCount = page.getByTestId('cart-count');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#/');
    await this.productCards.first().waitFor();
  }

  card(productId: string): Locator {
    return this.page.locator(`[data-testid="product-card"][data-product-id="${productId}"]`);
  }

  async openProduct(productId: string): Promise<void> {
    await this.card(productId).getByTestId('view-product').click();
  }

  async searchFor(phrase: string): Promise<void> {
    await this.search.fill(phrase);
  }

  async filterByCategory(category: string): Promise<void> {
    await this.categoryFilter.selectOption(category);
  }

  async sortBy(option: string): Promise<void> {
    await this.sort.selectOption(option);
  }

  /**
   * Name of the first card, or an empty string when the grid is empty.
   *
   * Intended for `expect.poll`: after changing a filter or sort the controls update at once
   * while the list still holds the previous response, so a one-shot read is a race.
   */
  async firstProductName(): Promise<string> {
    const names = await this.productNames.allTextContents();
    return names[0] ?? '';
  }

  /** Prices as integers in grosze, parsed from the rendered "123,45 zł" strings. */
  async renderedPrices(): Promise<number[]> {
    const texts = await this.productPrices.allTextContents();
    return texts.map((text) => {
      const [zl, gr] = text.replace(' zł', '').split(',');
      return Number(zl) * 100 + Number(gr);
    });
  }
}
