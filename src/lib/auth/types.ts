export type AuthProviderName = 'strava';

export type AppAuthStatus =
  | 'guest'
  | 'loading'
  | 'signedIn'
  | 'signedOut'
  | 'error';

export type CloudSyncStatus =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'conflict'
  | 'error';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface StravaConnection {
  athleteId: string;
  athleteName?: string;
  scopes: string[];
  connectedAt: string;
  updatedAt?: string;
}

export interface StravaOAuthProvider {
  name: AuthProviderName;
  isConfigured: () => boolean;
  getAuthorizeUrl: (state: string) => string | null;
}
