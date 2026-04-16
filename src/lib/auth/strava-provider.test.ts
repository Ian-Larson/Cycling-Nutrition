import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStravaProvider } from './strava-provider';

describe('createStravaProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds a least-privilege Strava authorization URL', () => {
    vi.stubEnv('VITE_STRAVA_CLIENT_ID', '12345');
    vi.stubEnv(
      'VITE_STRAVA_REDIRECT_URI',
      'https://example.com/auth/strava/callback'
    );

    const url = createStravaProvider().getAuthorizeUrl('state-123');
    expect(url).toBeTruthy();

    const parsed = new URL(url!);
    expect(parsed.origin).toBe('https://www.strava.com');
    expect(parsed.pathname).toBe('/oauth/authorize');
    expect(parsed.searchParams.get('client_id')).toBe('12345');
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'https://example.com/auth/strava/callback'
    );
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('scope')).toBe('read,profile:read_all');
    expect(parsed.searchParams.get('state')).toBe('state-123');
  });
});
