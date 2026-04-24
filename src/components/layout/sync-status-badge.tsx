import { Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import type { AppAuthStatus, CloudSyncStatus } from '@/lib/auth/types';

type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'error';
type BadgeSize = 'sm' | 'md';

export type SyncStatusKind = 'auth' | 'cloud' | 'combined';

interface SyncStatusBadgeProps {
  /**
   * `auth` shows sign-in state only.
   * `cloud` shows cloud backup sync state.
   * `combined` picks the most salient of the two for a global indicator.
   */
  kind?: SyncStatusKind;
  size?: BadgeSize;
  /** Hide the leading status dot (useful inside already-dense cards). */
  hideDot?: boolean;
  className?: string;
}

interface Descriptor {
  label: string;
  variant: BadgeVariant;
}

function describeAuth(
  authStatus: AppAuthStatus,
  isSupabaseReady: boolean,
  hasUser: boolean
): Descriptor {
  if (!isSupabaseReady) return { label: 'Local only', variant: 'neutral' };
  if (authStatus === 'loading') return { label: 'Checking…', variant: 'brand' };
  if (authStatus === 'signedIn' && hasUser) {
    return { label: 'Signed in', variant: 'success' };
  }
  if (authStatus === 'error') return { label: 'Sign-in error', variant: 'error' };
  return { label: 'Guest', variant: 'neutral' };
}

function describeCloud(status: CloudSyncStatus): Descriptor {
  switch (status) {
    case 'synced':
      return { label: 'Synced', variant: 'success' };
    case 'syncing':
      return { label: 'Syncing…', variant: 'brand' };
    case 'offline':
      return { label: 'Offline', variant: 'warning' };
    case 'conflict':
      return { label: 'Conflict', variant: 'error' };
    case 'error':
      return { label: 'Sync error', variant: 'error' };
    default:
      return { label: 'Local only', variant: 'neutral' };
  }
}

function describeCombined(
  authStatus: AppAuthStatus,
  cloudSyncStatus: CloudSyncStatus,
  isSupabaseReady: boolean,
  hasUser: boolean
): Descriptor {
  const auth = describeAuth(authStatus, isSupabaseReady, hasUser);
  if (auth.variant === 'error') return auth;
  const cloud = describeCloud(cloudSyncStatus);
  if (cloud.variant === 'error' || cloud.variant === 'warning') return cloud;
  if (authStatus === 'signedIn' && hasUser) {
    if (cloud.variant === 'brand') return cloud;
    if (cloudSyncStatus === 'synced') return { label: 'Synced', variant: 'success' };
    return auth;
  }
  return auth;
}

const dotClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-ink-400',
  brand: 'bg-brand-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
};

export function SyncStatusBadge({
  kind = 'combined',
  size = 'md',
  hideDot = false,
  className,
}: SyncStatusBadgeProps) {
  const { authStatus, cloudSyncStatus, user, isSupabaseReady } = useAuth();
  const hasUser = user !== null;

  const descriptor =
    kind === 'auth'
      ? describeAuth(authStatus, isSupabaseReady, hasUser)
      : kind === 'cloud'
        ? describeCloud(cloudSyncStatus)
        : describeCombined(authStatus, cloudSyncStatus, isSupabaseReady, hasUser);

  return (
    <Badge variant={descriptor.variant} size={size} className={className}>
      {!hideDot && (
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${dotClasses[descriptor.variant]}`}
        />
      )}
      {descriptor.label}
    </Badge>
  );
}
