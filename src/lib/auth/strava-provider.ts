import { nanoid } from 'nanoid';
import type { AuthProvider, AuthSession } from './types';

const STRAVA_OAUTH_STATE_KEY = 'strava_oauth_state';

function getStravaConfig() {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_STRAVA_REDIRECT_URI;

  return {
    clientId: typeof clientId === 'string' ? clientId : '',
    redirectUri: typeof redirectUri === 'string' ? redirectUri : '',
  };
}

export function createStravaAuthState(): string {
  const state = nanoid();
  sessionStorage.setItem(STRAVA_OAUTH_STATE_KEY, state);
  return state;
}

export function validateStravaAuthState(returnedState: string | null): boolean {
  const expectedState = sessionStorage.getItem(STRAVA_OAUTH_STATE_KEY);
  sessionStorage.removeItem(STRAVA_OAUTH_STATE_KEY);

  return !!expectedState && !!returnedState && expectedState === returnedState;
}

export function createStravaProvider(): AuthProvider {
  return {
    name: 'strava',
    isConfigured() {
      const { clientId, redirectUri } = getStravaConfig();
      return clientId.length > 0 && redirectUri.length > 0;
    },
    getAuthorizeUrl(state: string) {
      const { clientId, redirectUri } = getStravaConfig();
      if (!clientId || !redirectUri || !state) {
        return null;
      }

      const url = new URL('https://www.strava.com/oauth/authorize');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('approval_prompt', 'auto');
      url.searchParams.set('scope', 'read,profile:read_all,activity:read_all');
      url.searchParams.set('state', state);

      return url.toString();
    },
    async handleCallback(params: {
      code: string;
      state: string;
    }): Promise<AuthSession> {
      void params;
      throw new Error(
        'Strava token exchange is not implemented yet. Add a backend callback endpoint to complete auth.'
      );
    },
  };
}
