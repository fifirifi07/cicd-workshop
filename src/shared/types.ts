/**
 * Types shared between the server, the frontend and the tests.
 *
 * All money is stored as **integer grosze** (1/100 PLN). This keeps unit tests free of
 * floating-point arithmetic and makes rounding an explicit decision rather than an accident.
 */

export type Category = 'tshirts' | 'hoodies' | 'accessories';

export type Size = 'S' | 'M' | 'L' | 'XL';

export interface Product {
  id: string;
  name: string;
  category: Category;
  /** Unit price in grosze. */
  price: number;
  /** Available sizes; empty for accessories that have no size. */
  sizes: Size[];
  /** Units in stock. Zero means "out of stock". */
  stock: number;
  rating: number;
  description: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  /** Unit price in grosze, frozen at the moment the item was added to the cart. */
  price: number;
  size: Size | null;
  quantity: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  /** Discount code applied to the cart, if any. */
  discountCode: string | null;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export interface DiscountCode {
  code: string;
  /** Percentage off (0-100), or `null` when the code only grants free shipping. */
  percentOff: number | null;
  freeShipping: boolean;
  /** Expiry date in ISO format (YYYY-MM-DD). */
  expiresAt: string;
}

export interface CustomerDetails {
  email: string;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  totals: CartTotals;
  customer: CustomerDetails;
  createdAt: string;
}

export type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'rating-desc';

export interface ProductQuery {
  category?: Category | 'all';
  search?: string;
  sort?: SortOption;
  /** Maximum number of records to return. A transport bound, not a layout choice. */
  limit?: number;
  /** Number of records to skip. */
  offset?: number;
}
