import type { Locator, Page } from '@playwright/test';

export interface CustomerForm {
  email: string;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
}

export const VALID_CUSTOMER: CustomerForm = {
  email: 'jan.kowalski@example.com',
  firstName: 'Jan',
  lastName: 'Kowalski',
  street: 'Polna 1/2',
  postalCode: '80-180',
  city: 'Gdańsk',
};

/** Maps form fields to their test ids, so a renamed id changes in exactly one place. */
const FIELD_IDS: Record<keyof CustomerForm, string> = {
  email: 'email',
  firstName: 'first-name',
  lastName: 'last-name',
  street: 'street',
  postalCode: 'postal-code',
  city: 'city',
};

export class CheckoutPage {
  readonly placeOrder: Locator;
  readonly emptyMessage: Locator;
  readonly orderError: Locator;

  constructor(private readonly page: Page) {
    this.placeOrder = page.getByTestId('place-order');
    this.emptyMessage = page.getByTestId('empty-cart');
    this.orderError = page.getByTestId('order-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#/checkout');
    await this.page.getByTestId('checkout').waitFor();
  }

  field(name: keyof CustomerForm): Locator {
    return this.page.getByTestId(FIELD_IDS[name]);
  }

  error(name: keyof CustomerForm): Locator {
    return this.page.getByTestId(`error-${FIELD_IDS[name]}`);
  }

  async fill(details: Partial<CustomerForm>): Promise<void> {
    for (const [name, value] of Object.entries(details)) {
      await this.field(name as keyof CustomerForm).fill(value);
    }
  }

  async submit(details: Partial<CustomerForm> = {}): Promise<void> {
    await this.fill(details);
    await this.placeOrder.click();
  }
}
