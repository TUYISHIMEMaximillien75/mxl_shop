import type { Product, ProductInput, SalePayload, SaleRecord } from '../types';
import type { FieldErrors } from './validation';

export class ApiError extends Error {
  status: number;
  fields?: FieldErrors;
  constructor(message: string, status: number, fields?: FieldErrors) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'Request failed', res.status, data.fields);
  return data as T;
}

export const api = {
  listProducts: () => request<Product[]>('/products'),
  createProduct: (input: ProductInput) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(input) }),
  updateProduct: (id: number, input: ProductInput) =>
    request<Product>(`/products?id=${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteProduct: (id: number) => request<{ ok: true }>(`/products?id=${id}`, { method: 'DELETE' }),
  loadSamples: () => request<{ ok: true }>('/sample', { method: 'POST' }),
  clearSamples: () => request<{ ok: true; deleted: number }>('/sample', { method: 'DELETE' }),
  recordSale: (payload: SalePayload) =>
    request<SaleRecord>('/sales', { method: 'POST', body: JSON.stringify(payload) }),
  listSales: () => request<SaleRecord[]>('/sales'),
};
