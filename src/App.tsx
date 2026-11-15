import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { ProductsProvider } from './context/ProductsContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { AddProduct } from './pages/AddProduct';
import { Sales } from './pages/Sales';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <ProductsProvider>
            <Routes>
              <Route element={<Layout />}>
                {/* Sales is the landing page */}
                <Route index element={<Sales />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="add" element={<AddProduct />} />
                <Route path="sales" element={<Navigate to="/" replace />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </ProductsProvider>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
