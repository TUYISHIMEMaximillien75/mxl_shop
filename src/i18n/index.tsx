import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { en, type TranslationKey } from './en';
import { rw } from './rw';

export type Locale = 'en' | 'rw';

const STORAGE_KEY = 'mxl-shops-locale';

const DICT: Record<Locale, Record<TranslationKey, string>> = { en, rw };

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'rw') return stored;
  } catch {/* ignore */}
  return 'en';
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** Same as t() but marks the result as containing HTML so the caller can use dangerouslySetInnerHTML */
  th: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function translate(dict: Record<TranslationKey, string>, key: TranslationKey, vars?: Record<string, string | number>): string {
  let str = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {/* ignore */}
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const dict = DICT[locale];
  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>) => translate(dict, key, vars), [dict]);
  const th = t; // alias — the distinction is for the caller

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, th }}>
      {children}
    </I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
