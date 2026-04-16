import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  authRedirectUrl: string;
}

let cachedClient: SupabaseClient | null | undefined;

function getEnvString(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value : '';
}

export function getDefaultAuthRedirectUrl(path = '/auth/callback'): string {
  if (typeof window === 'undefined') return path;

  const baseUrl = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${window.location.origin}${normalizedBase}${normalizedPath}`;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = getEnvString('VITE_SUPABASE_URL');
  const anonKey = getEnvString('VITE_SUPABASE_ANON_KEY');
  const authRedirectUrl =
    getEnvString('VITE_SUPABASE_AUTH_REDIRECT_URL') ||
    getDefaultAuthRedirectUrl('/auth/callback');

  if (!url || !anonKey) return null;

  return {
    url,
    anonKey,
    authRedirectUrl,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const config = getSupabaseConfig();
  if (!config) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
    },
  });

  return cachedClient;
}
