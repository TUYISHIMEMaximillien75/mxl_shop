import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Lightbulb } from 'lucide-react';
import type { Product, ProductInput } from '../types';
import { useProducts } from '../context/ProductsContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { ProductForm } from '../components/ProductForm';
import { useI18n } from '../i18n';

export function AddProduct() {
  const { addProduct, categories } = useProducts();
  const toast = useToast();
  const { t } = useI18n();
  const [lastAdded, setLastAdded] = useState<Product | null>(null);

  const handleSubmit = async (input: ProductInput) => {
    const created = await addProduct(input);
    setLastAdded(created);
    toast(t('toast.added', { name: created.name }));
  };

  return (
    <>
      <PageHeader title={t('add.title')} description={t('add.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {lastAdded && (
            <div
              className="mb-4 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              role="status"
              id="add-success"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-brand-600" />
                <div>
                  <p className="font-semibold text-brand-900">{t('add.successTitle')}</p>
                  <p
                    className="text-sm text-brand-800"
                    dangerouslySetInnerHTML={{ __html: t('add.successText', { name: `<strong>${lastAdded.name}</strong>` }) }}
                  />
                </div>
              </div>
              <Link to="/inventory" className="btn-secondary shrink-0">
                {t('add.viewInventory')}
              </Link>
            </div>
          )}

          <div className="card p-5 sm:p-6">
            <ProductForm
              categories={categories}
              submitLabel={t('common.addProduct')}
              onSubmit={handleSubmit}
              resetOnSuccess
            />
          </div>
        </div>

        <aside className="card h-fit p-5">
          <div className="flex items-center gap-2 text-brand-700">
            <Lightbulb className="h-5 w-5" />
            <h2 className="font-semibold">{t('add.tips')}</h2>
          </div>
          <ul className="mt-3 space-y-3 text-sm text-slate-600">
            {(['add.tip1', 'add.tip2', 'add.tip3', 'add.tip4'] as const).map((key) => (
              <li key={key} dangerouslySetInnerHTML={{ __html: t(key) }} />
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
