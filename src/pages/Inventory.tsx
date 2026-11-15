import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, PlusCircle, Search, X } from 'lucide-react';
import type { Product, ProductInput, StockStatus } from '../types';
import { useProducts } from '../context/ProductsContext';
import { useToast } from '../context/ToastContext';
import { getStockStatus } from '../lib/stock';
import { PageHeader } from '../components/PageHeader';
import { ProductTable } from '../components/ProductTable';
import { Modal } from '../components/Modal';
import { ProductForm } from '../components/ProductForm';
import { ProductDetails } from '../components/ProductDetails';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useI18n } from '../i18n';

type StatusFilter = 'all' | StockStatus;

export function Inventory() {
  const { products, categories, loading, error, refresh, updateProduct, deleteProduct } = useProducts();
  const toast = useToast();
  const { t } = useI18n();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const [viewing, setViewing] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (category === 'all' || p.category === category) &&
        (status === 'all' || getStockStatus(p) === status),
    );
  }, [products, query, category, status]);

  const hasFilters = query !== '' || category !== 'all' || status !== 'all';
  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setStatus('all');
  };

  const handleUpdate = async (input: ProductInput) => {
    if (!editing) return;
    await updateProduct(editing.id, input);
    toast(t('toast.updated', { name: input.name }));
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProduct(deleting.id);
      toast(t('toast.deleted', { name: deleting.name }));
      setDeleting(null);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title={t('inventory.title')}
        description={t('inventory.subtitle')}
        actions={
          <Link to="/add" className="btn-primary" id="inventory-add-product">
            <PlusCircle className="h-4 w-4" /> {t('common.addProduct')}
          </Link>
        }
      />

      {/* Filters */}
      <div className="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="search-products"
            type="search"
            className="input pl-10"
            placeholder={t('inventory.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <select id="filter-category" className="input sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('inventory.filterCategory')}>
            <option value="all">{t('inventory.allCategories')}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select id="filter-status" className="input sm:w-40" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label={t('inventory.filterStatus')}>
            <option value="all">{t('inventory.allStock')}</option>
            <option value="in">{t('status.in')}</option>
            <option value="low">{t('status.low')}</option>
            <option value="out">{t('status.out')}</option>
          </select>
        </div>
      </div>

      {!loading && !error && products.length > 0 && (
        <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
          <span
            dangerouslySetInnerHTML={{
              __html: t('inventory.showing', { shown: `<strong class="text-slate-800">${filtered.length}</strong>`, total: products.length }),
            }}
          />
          {hasFilters && (
            <button className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> {t('inventory.clearFilters')}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={t('inventory.emptyTitle')}
          message={t('inventory.emptyText')}
          action={
            <Link to="/add" className="btn-primary">
              <PlusCircle className="h-4 w-4" /> {t('inventory.addFirst')}
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('inventory.noMatchTitle')}
          message={t('inventory.noMatchText')}
          action={
            <button className="btn-secondary" onClick={clearFilters}>
              {t('inventory.clearFilters')}
            </button>
          }
        />
      ) : (
        <ProductTable products={filtered} onView={setViewing} onEdit={setEditing} onDelete={setDeleting} />
      )}

      <Modal open={!!viewing} title={t('inventory.details')} onClose={() => setViewing(null)} size="lg">
        {viewing && (
          <ProductDetails
            product={viewing}
            onEdit={() => {
              setEditing(viewing);
              setViewing(null);
            }}
          />
        )}
      </Modal>

      <Modal open={!!editing} title={t('inventory.editTitle')} onClose={() => setEditing(null)} size="lg">
        {editing && (
          <ProductForm
            key={editing.id}
            initial={editing}
            categories={categories}
            submitLabel={t('form.saveChanges')}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={t('inventory.deleteTitle')}
        message={deleting ? t('inventory.deleteText', { name: deleting.name }) : ''}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
