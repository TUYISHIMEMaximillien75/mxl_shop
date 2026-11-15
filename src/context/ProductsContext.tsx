import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product, ProductInput, SalePayload, SaleRecord } from '../types';
import { api } from '../lib/api';

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  error: string | null;
  categories: string[];
  hasSamples: boolean;
  refresh: () => Promise<void>;
  addProduct: (input: ProductInput) => Promise<Product>;
  updateProduct: (id: number, input: ProductInput) => Promise<Product>;
  deleteProduct: (id: number) => Promise<void>;
  loadSamples: () => Promise<void>;
  clearSamples: () => Promise<number>;
  recordSale: (payload: SalePayload) => Promise<SaleRecord>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

/** Holds the product list for the whole app and talks to the API. */
export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setProducts(await api.listProducts());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .listProducts()
      .then((list) => !cancelled && setProducts(list))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const addProduct = useCallback(async (input: ProductInput) => {
    const created = await api.createProduct(input);
    setProducts((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateProduct = useCallback(async (id: number, input: ProductInput) => {
    const updated = await api.updateProduct(id, input);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id: number) => {
    await api.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const loadSamples = useCallback(async () => {
    await api.loadSamples();
    await refresh();
  }, [refresh]);

  const clearSamples = useCallback(async () => {
    const { deleted } = await api.clearSamples();
    setProducts((prev) => prev.filter((p) => !p.isSample));
    return deleted;
  }, []);

  const recordSale = useCallback(async (payload: SalePayload) => {
    const sale = await api.recordSale(payload);
    // Decrement current quantities optimistically in local state
    setProducts((prev) =>
      prev.map((p) => {
        const item = payload.items.find((i) => i.productId === p.id);
        if (!item) return p;
        return { ...p, currentQuantity: p.currentQuantity - item.qty };
      }),
    );
    return sale;
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort((a, b) => a.localeCompare(b)),
    [products],
  );
  const hasSamples = useMemo(() => products.some((p) => p.isSample), [products]);

  const value: ProductsContextValue = {
    products,
    loading,
    error,
    categories,
    hasSamples,
    refresh,
    addProduct,
    updateProduct,
    deleteProduct,
    loadSamples,
    clearSamples,
    recordSale,
  };

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used inside <ProductsProvider>');
  return ctx;
}
