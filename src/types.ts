export type StockStatus = 'in' | 'low' | 'out';

export interface Product {
  id: number;
  name: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  initialQuantity: number;
  currentQuantity: number;
  dateAdded: string; // YYYY-MM-DD
  isSample: boolean;
}

/** Data sent when creating or updating a product. */
export interface ProductInput {
  name: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  initialQuantity: number;
  currentQuantity: number;
  dateAdded: string;
}

/** One line in the POS cart. */
export interface CartItem {
  product: Product;
  qty: number;
}

/** Payload sent to POST /api/sales. */
export interface SalePayload {
  items: { productId: number; qty: number; unitPrice: number }[];
  note?: string;
}

/** A recorded sale returned from the API. */
export interface SaleRecord {
  id: number;
  soldAt: string;
  totalRwf: number;
  items: { productId: number; qty: number; unitPrice: number; subtotal: number }[];
}
