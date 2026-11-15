import type { Product, StockStatus } from '../types';

/** Units at or below this count as "Low Stock". */
export const LOW_STOCK_UNITS = 5;
/** Share of the initial quantity at or below which stock is "Low". */
export const LOW_STOCK_RATIO = 0.2;

export function getStockStatus(p: Pick<Product, 'currentQuantity' | 'initialQuantity'>): StockStatus {
  if (p.currentQuantity <= 0) return 'out';
  if (
    p.currentQuantity <= LOW_STOCK_UNITS ||
    (p.initialQuantity > 0 && p.currentQuantity <= p.initialQuantity * LOW_STOCK_RATIO)
  )
    return 'low';
  return 'in';
}

export function profitPerUnit(p: Pick<Product, 'buyingPrice' | 'sellingPrice'>): number {
  return p.sellingPrice - p.buyingPrice;
}

export interface InventoryStats {
  totalProducts: number;
  totalItems: number;
  originalInvestment: number;
  stockValue: number;
  potentialRevenue: number;
  expectedProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export function computeStats(products: Product[]): InventoryStats {
  const s: InventoryStats = {
    totalProducts: products.length,
    totalItems: 0,
    originalInvestment: 0,
    stockValue: 0,
    potentialRevenue: 0,
    expectedProfit: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };
  for (const p of products) {
    s.totalItems += p.currentQuantity;
    s.originalInvestment += p.buyingPrice * p.initialQuantity;
    s.stockValue += p.buyingPrice * p.currentQuantity;
    s.potentialRevenue += p.sellingPrice * p.currentQuantity;
    s.expectedProfit += profitPerUnit(p) * p.currentQuantity;
    const status = getStockStatus(p);
    if (status === 'low') s.lowStockCount++;
    if (status === 'out') s.outOfStockCount++;
  }
  return s;
}
