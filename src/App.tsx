import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PlannerPage } from '@/pages/planner';
import { InventoryPage } from '@/pages/inventory';
import { HistoryPage } from '@/pages/history';
import { SettingsPage } from '@/pages/settings';
import { useStore } from '@/store';

function App() {
  const basename = import.meta.env.BASE_URL;
  const initializeDefaults = useStore((s) => s.initializeDefaults);

  useEffect(() => {
    initializeDefaults();
  }, [initializeDefaults]);

  return (
    <BrowserRouter basename={basename}>
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<PlannerPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/bottles" element={<Navigate to="/inventory" replace />} />
            <Route path="/products" element={<Navigate to="/inventory" replace />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <MobileNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
