import { useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Save, TrendingUp } from 'lucide-react';
import type { Product, ProductInput } from '../types';
import { validateProduct, type FieldErrors } from '../lib/validation';
import { ApiError } from '../lib/api';
import { formatRWF, todayISO } from '../lib/format';
import { useI18n } from '../i18n';

type FormState = Record<keyof ProductInput, string>;

const EMPTY: FormState = {
  name: '',
  category: '',
  buyingPrice: '',
  sellingPrice: '',
  initialQuantity: '',
  currentQuantity: '',
  dateAdded: todayISO(),
};

function fromProduct(p: Product): FormState {
  return {
    name: p.name,
    category: p.category,
    buyingPrice: String(p.buyingPrice),
    sellingPrice: String(p.sellingPrice),
    initialQuantity: String(p.initialQuantity),
    currentQuantity: String(p.currentQuantity),
    dateAdded: p.dateAdded,
  };
}

interface ProductFormProps {
  initial?: Product;
  categories: string[];
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<void>;
  onCancel?: () => void;
  resetOnSuccess?: boolean;
}

export function ProductForm({ initial, categories, submitLabel, onSubmit, onCancel, resetOnSuccess }: ProductFormProps) {
  const { t } = useI18n();
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<FormState>(() => (initial ? fromProduct(initial) : { ...EMPTY, dateAdded: todayISO() }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentTouched, setCurrentTouched] = useState(isEdit);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'initialQuantity' && !currentTouched) next.currentQuantity = value;
      return next;
    });
    if (key === 'currentQuantity') setCurrentTouched(true);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const buying = Number(form.buyingPrice);
  const selling = Number(form.sellingPrice);
  const pricesValid = form.buyingPrice !== '' && form.sellingPrice !== '' && buying > 0 && selling > 0;
  const profit = pricesValid ? selling - buying : null;
  const margin = profit !== null && selling > 0 ? (profit / selling) * 100 : null;
  const initialQty = Number(form.initialQuantity);
  const currentQty = Number(form.currentQuantity);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const { errors: errs, value } = validateProduct(form);
    if (!value) {
      setErrors(errs);
      setFormError(t('error.fixFields'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(value);
      if (resetOnSuccess) {
        setForm({ ...EMPTY, category: value.category, dateAdded: todayISO() });
        setCurrentTouched(false);
        setErrors({});
      }
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" id={isEdit ? 'edit-product-form' : 'add-product-form'}>
      {formError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('field.name')} error={errors.name} htmlFor="name" className="sm:col-span-2">
          <input
            id="name"
            className={`input ${errors.name ? 'input-error' : ''}`}
            placeholder={t('field.namePlaceholder')}
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            autoFocus={!isEdit}
          />
        </Field>

        <Field label={t('field.category')} error={errors.category} htmlFor="category">
          <input
            id="category"
            list="category-options"
            className={`input ${errors.category ? 'input-error' : ''}`}
            placeholder={t('field.categoryPlaceholder')}
            value={form.category}
            onChange={(e) => set('category')(e.target.value)}
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>

        <Field label={t('field.dateAdded')} error={errors.dateAdded} htmlFor="dateAdded">
          <input
            id="dateAdded"
            type="date"
            className={`input ${errors.dateAdded ? 'input-error' : ''}`}
            value={form.dateAdded}
            max={todayISO()}
            onChange={(e) => set('dateAdded')(e.target.value)}
          />
        </Field>

        <Field label={t('field.buyingPrice')} error={errors.buyingPrice} htmlFor="buyingPrice">
          <MoneyInput id="buyingPrice" value={form.buyingPrice} onChange={set('buyingPrice')} invalid={!!errors.buyingPrice} />
        </Field>

        <Field label={t('field.sellingPrice')} error={errors.sellingPrice} htmlFor="sellingPrice">
          <MoneyInput id="sellingPrice" value={form.sellingPrice} onChange={set('sellingPrice')} invalid={!!errors.sellingPrice} />
        </Field>

        <Field label={t('field.initialQuantity')} error={errors.initialQuantity} htmlFor="initialQuantity">
          <input
            id="initialQuantity"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className={`input ${errors.initialQuantity ? 'input-error' : ''}`}
            placeholder="0"
            value={form.initialQuantity}
            onChange={(e) => set('initialQuantity')(e.target.value)}
          />
        </Field>

        <Field
          label={t('field.currentQuantity')}
          error={errors.currentQuantity}
          htmlFor="currentQuantity"
          hint={!isEdit && !currentTouched ? t('field.currentHint') : undefined}
        >
          <input
            id="currentQuantity"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className={`input ${errors.currentQuantity ? 'input-error' : ''}`}
            placeholder="0"
            value={form.currentQuantity}
            onChange={(e) => set('currentQuantity')(e.target.value)}
          />
        </Field>
      </div>

      {/* Live profit preview */}
      <div className="grid gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 sm:grid-cols-3">
        <Preview label={t('form.profitPerUnit')} icon>
          {profit === null ? '—' : (
            <span className={profit < 0 ? 'text-red-600' : 'text-brand-700'}>{formatRWF(profit)}</span>
          )}
        </Preview>
        <Preview label={t('form.margin')}>
          {margin === null ? '—' : <span className={margin < 0 ? 'text-red-600' : ''}>{margin.toFixed(1)}%</span>}
        </Preview>
        <Preview label={t('form.expectedProfit')}>
          {profit === null || !Number.isFinite(currentQty) || form.currentQuantity === '' ? '—' : formatRWF(profit * currentQty)}
        </Preview>
      </div>

      {profit !== null && profit < 0 && (
        <p className="flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" /> {t('form.lossWarning')}
        </p>
      )}
      {form.initialQuantity !== '' && form.currentQuantity !== '' && currentQty > initialQty && (
        <p className="flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" /> {t('form.restockWarning')}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            {t('common.cancel')}
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={submitting} id="submit-product">
          <Save className="h-4 w-4" />
          {submitting ? t('common.saving') : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label, error, hint, htmlFor, className = '', children,
}: {
  label: string; error?: string; hint?: string; htmlFor: string; className?: string; children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label} <span className="text-red-500">*</span>
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

function MoneyInput({ id, value, onChange, invalid }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        className={`input pr-14 ${invalid ? 'input-error' : ''}`}
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-semibold text-slate-400">RWF</span>
    </div>
  );
}

function Preview({ label, icon, children }: { label: string; icon?: boolean; children: ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {icon && <TrendingUp className="h-3.5 w-3.5 text-brand-600" />}
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold text-slate-900">{children}</p>
    </div>
  );
}
