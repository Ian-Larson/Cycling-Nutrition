import { createContext, useContext } from 'react';
import type {
  AppAuthStatus,
  AuthUser,
  CloudSyncStatus,
  StravaConnection,
} from './types';

export interface AuthContextValue {
  authStatus: AppAuthStatus;
  cloudSyncStatus: CloudSyncStatus;
  user: AuthUser | null;
  stravaConnection: StravaConnection | null;
  isSupabaseReady: boolean;
  authMessage: string | null;
  syncMessage: string | null;
  stravaMessage: string | null;
  lastSyncedAt: string | null;
  pendingEmailVerification: string | null;
  signInWithEmail: (email: string) => Promise<void>;
  verifyEmailOtp: (token: string) => Promise<void>;
  cancelEmailVerification: () => void;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  connectStrava: () => void;
  disconnectStrava: () => Promise<void>;
  refreshStravaConnection: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
