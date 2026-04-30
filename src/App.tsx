import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PlannerPage } from '@/pages/planner';
import { InventoryPage } from '@/pages/inventory';
import { HistoryPage } from '@/pages/history';
import { GearPage } from '@/pages/gear';
import { GearInventoryPage } from '@/pages/gear-inventory';
import { AuthCallbackPage } from '@/pages/auth-callback';
import { PowerMeterAnalyzerPage } from '@/pages/power-meter-analyzer';
import { AccountPage } from '@/pages/account';
import { StravaCallbackPage } from '@/pages/strava-callback';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { useStore } from '@/store';

function App() {
  const basename = import.meta.env.BASE_URL;
  const initializeDefaults = useStore((s) => s.initializeDefaults);

  useEffect(() => {
    initializeDefaults();
  }, [initializeDefaults]);

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <div className="app-shell min-h-screen">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<PlannerPage />} />
              <Route path="/nutrition-plan" element={<Navigate to="/" replace />} />
              <Route path="/athlete" element={<Navigate to="/account" replace />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/bottles" element={<Navigate to="/inventory" replace />} />
              <Route path="/products" element={<Navigate to="/" replace />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/gear" element={<GearPage />} />
              <Route path="/gear/inventory" element={<GearInventoryPage />} />
              <Route
                path="/labs"
                element={<Navigate to="/power-meter-analyzer" replace />}
              />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/power-meter-analyzer" element={<PowerMeterAnalyzerPage />} />
              <Route
                path="/settings"
                element={
                  <Navigate
                    to={{ pathname: '/account', hash: '#preferences' }}
                    replace
                  />
                }
              />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/auth/strava/callback" element={<StravaCallbackPage />} />
            </Routes>
          </main>
          <MobileNav />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
