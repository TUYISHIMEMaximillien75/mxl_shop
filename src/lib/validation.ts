import type { ProductInput } from '../types.js';

export type FieldErrors = Partial<Record<keyof ProductInput, string>>;

/**
 * Validates product data. Used by both the form (browser) and the API (server),
 * so the rules are always the same.
 */
export function validateProduct(input: Partial<Record<keyof ProductInput, unknown>>): {
  errors: FieldErrors;
  value?: ProductInput;
} {
  const errors: FieldErrors = {};

  const name = String(input.name ?? '').trim();
  const category = String(input.category ?? '').trim();
  const dateAdded = String(input.dateAdded ?? '').trim();

  if (!name) errors.name = 'Product name is required';
  else if (name.length > 120) errors.name = 'Product name is too long';

  if (!category) errors.category = 'Category is required';
  else if (category.length > 60) errors.category = 'Category is too long';

  const price = (raw: unknown, label: string, key: 'buyingPrice' | 'sellingPrice') => {
    if (raw === '' || raw === null || raw === undefined) {
      errors[key] = `${label} is required`;
      return 0;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) errors[key] = `${label} must be a positive number`;
    else if (n > 1_000_000_000) errors[key] = `${label} is too large`;
    return n;
  };

  const qty = (raw: unknown, label: string, key: 'initialQuantity' | 'currentQuantity') => {
    if (raw === '' || raw === null || raw === undefined) {
      errors[key] = `${label} is required`;
      return 0;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) errors[key] = `${label} must be a whole number (0 or more)`;
    else if (n > 10_000_000) errors[key] = `${label} is too large`;
    return n;
  };

  const buyingPrice = price(input.buyingPrice, 'Buying price', 'buyingPrice');
  const sellingPrice = price(input.sellingPrice, 'Selling price', 'sellingPrice');
  const initialQuantity = qty(input.initialQuantity, 'Initial quantity', 'initialQuantity');
  const currentQuantity = qty(input.currentQuantity, 'Current quantity', 'currentQuantity');

  if (!dateAdded) errors.dateAdded = 'Date is required';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateAdded) || Number.isNaN(Date.parse(dateAdded)))
    errors.dateAdded = 'Enter a valid date';

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    value: { name, category, buyingPrice, sellingPrice, initialQuantity, currentQuantity, dateAdded },
  };
}
