import type { Locator, Page } from '@playwright/test';

export class ConfirmationPage {
  readonly root: Locator;
  readonly orderNumber: Locator;
  readonly orderTotal: Locator;
  readonly items: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId('confirmation');
    this.orderNumber = page.getByTestId('order-number');
    this.orderTotal = page.getByTestId('order-total');
    this.items = page.getByTestId('order-item');
  }

  async waitUntilVisible(): Promise<void> {
    await this.root.waitFor();
  }
}
