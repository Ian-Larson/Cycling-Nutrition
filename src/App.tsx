import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PlannerPage } from '@/pages/planner';
import { BottlesPage } from '@/pages/bottles';
import { ProductsPage } from '@/pages/products';
import { HistoryPage } from '@/pages/history';
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
            <Route path="/bottles" element={<BottlesPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
        <MobileNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
