import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PlannerPage } from '@/pages/planner';
import { HistoryPage } from '@/pages/history';
import { GearPage } from '@/pages/gear';
import { AuthCallbackPage } from '@/pages/auth-callback';
import { PerformancePage } from '@/pages/performance';
import { PowerMeterAnalyzerPage } from '@/pages/power-meter-analyzer';
import { AccountPage } from '@/pages/account';
import { StravaCallbackPage } from '@/pages/strava-callback';
import { AuthProvider } from '@/lib/auth/auth-provider';
import { useAuth } from '@/lib/auth/auth-context';
import { useStravaActivitySync } from '@/hooks/use-strava-activity-sync';
import { useStore } from '@/store';

function ActivityAutoSync() {
  const { stravaConnection } = useAuth();
  const sync = useStravaActivitySync();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!stravaConnection?.scopes?.includes('activity:read')) return;
    const last = sync.lastSyncedAt ? new Date(sync.lastSyncedAt).getTime() : 0;
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - last < oneDay) return;
    fired.current = true;
    const since =
      sync.lastSyncedAt ?? new Date(Date.now() - 90 * oneDay).toISOString();
    sync.start({ since }).catch(() => {
      // Silent — surfaces on /performance via the state machine.
    });
  }, [stravaConnection, sync]);

  return null;
}

function App() {
  const basename = import.meta.env.BASE_URL;
  const initializeDefaults = useStore((s) => s.initializeDefaults);

  useEffect(() => {
    initializeDefaults();
  }, [initializeDefaults]);

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <ActivityAutoSync />
        <div className="app-shell min-h-screen">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<PlannerPage />} />
              <Route path="/nutrition-plan" element={<Navigate to="/" replace />} />
              <Route path="/athlete" element={<Navigate to="/account" replace />} />
              <Route path="/inventory" element={<Navigate to="/" replace />} />
              <Route path="/bottles" element={<Navigate to="/" replace />} />
              <Route path="/products" element={<Navigate to="/" replace />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/gear" element={<GearPage />} />
              <Route
                path="/gear/inventory"
                element={
                  <Navigate to={{ pathname: '/gear', hash: '#shelf' }} replace />
                }
              />
              <Route
                path="/labs"
                element={<Navigate to="/power-meter-analyzer" replace />}
              />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/performance" element={<PerformancePage />} />
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
