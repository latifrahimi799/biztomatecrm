import { isMicrosoftOAuthConfigured } from './config';
import { useMicrosoftAuthStore } from '../../store/microsoftAuthStore';

/** If non-null, show this message instead of send UI. */
export function getMicrosoftMailBlockReason(): string | null {
  if (!isMicrosoftOAuthConfigured()) {
    return 'Microsoft is not configured. Add VITE_MICROSOFT_CLIENT_ID and VITE_MICROSOFT_TENANT_ID to your environment (Settings documents this), then redeploy.';
  }
  const { refreshToken, accessToken } = useMicrosoftAuthStore.getState();
  if (!refreshToken && !accessToken) {
    return 'Connect your Microsoft account under Settings → Microsoft 365 — send email.';
  }
  return null;
}
