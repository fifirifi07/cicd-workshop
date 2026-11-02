import type { Category } from '../shared/types.js';

/**
 * Presentation labels for domain values.
 *
 * Domain values are English because they travel through the API and its contract;
 * everything the customer reads is Polish. This map is the single place where the two meet,
 * so a raw value like `hoodies` never leaks into the interface.
 */
const CATEGORY_LABELS: Record<Category, string> = {
  tshirts: 'Koszulki',
  hoodies: 'Bluzy',
  accessories: 'Akcesoria',
};

export function categoryLabel(category: Category): string {
  return CATEGORY_LABELS[category];
}
