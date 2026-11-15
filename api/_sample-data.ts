import type { ProductInput } from '../src/types.js';

/** Realistic starter products for a small Rwandan shop (prices in RWF). */
export const SAMPLE_PRODUCTS: Omit<ProductInput, 'dateAdded'>[] = [
  { name: 'Inyange Milk 500ml', category: 'Dairy', buyingPrice: 450, sellingPrice: 550, initialQuantity: 48, currentQuantity: 36 },
  { name: 'Inyange Yoghurt 500ml', category: 'Dairy', buyingPrice: 700, sellingPrice: 900, initialQuantity: 24, currentQuantity: 4 },
  { name: 'Rice 5kg (Kigori)', category: 'Food & Grains', buyingPrice: 6500, sellingPrice: 7500, initialQuantity: 20, currentQuantity: 14 },
  { name: 'Sugar 1kg (Kabuye)', category: 'Food & Grains', buyingPrice: 1400, sellingPrice: 1600, initialQuantity: 50, currentQuantity: 31 },
  { name: 'Cooking Oil 1L (Mukwano)', category: 'Food & Grains', buyingPrice: 2700, sellingPrice: 3200, initialQuantity: 30, currentQuantity: 0 },
  { name: 'Akabanga Chilli Oil', category: 'Food & Grains', buyingPrice: 900, sellingPrice: 1200, initialQuantity: 40, currentQuantity: 27 },
  { name: 'Bread (Large Loaf)', category: 'Bakery', buyingPrice: 1000, sellingPrice: 1300, initialQuantity: 25, currentQuantity: 12 },
  { name: 'Fanta Orange 300ml', category: 'Beverages', buyingPrice: 400, sellingPrice: 500, initialQuantity: 72, currentQuantity: 55 },
  { name: 'Mineral Water 500ml', category: 'Beverages', buyingPrice: 250, sellingPrice: 400, initialQuantity: 60, currentQuantity: 9 },
  { name: 'Bar Soap (Sabuni)', category: 'Household', buyingPrice: 600, sellingPrice: 800, initialQuantity: 36, currentQuantity: 22 },
  { name: 'Toothpaste 100ml', category: 'Personal Care', buyingPrice: 1100, sellingPrice: 1500, initialQuantity: 18, currentQuantity: 15 },
  { name: 'Exercise Book 96 pages', category: 'Stationery', buyingPrice: 250, sellingPrice: 400, initialQuantity: 100, currentQuantity: 64 },
];
