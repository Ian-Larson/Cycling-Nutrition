export type AuthProviderName = 'strava';

export type AuthStatus =
  | 'disconnected'
  | 'connected'
  | 'pending'
  | 'error'
  | 'not_configured';

export interface AuthSession {
  provider: AuthProviderName;
  connectedAt: number;
  athleteId?: string;
  athleteName?: string;
}

export interface AuthProvider {
  name: AuthProviderName;
  isConfigured: () => boolean;
  getAuthorizeUrl: (state: string) => string | null;
  handleCallback: (params: { code: string; state: string }) => Promise<AuthSession>;
}
