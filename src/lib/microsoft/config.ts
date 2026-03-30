/** Delegated scopes for sending mail as the signed-in user. */
export const MICROSOFT_GRAPH_SCOPES =
  'openid profile offline_access Mail.Send User.Read';

export function isMicrosoftOAuthConfigured(): boolean {
  const id = import.meta.env.VITE_MICROSOFT_CLIENT_ID?.trim();
  const tenant = import.meta.env.VITE_MICROSOFT_TENANT_ID?.trim();
  return Boolean(id && tenant);
}

export function getMicrosoftClientId(): string {
  return import.meta.env.VITE_MICROSOFT_CLIENT_ID?.trim() ?? '';
}

/** Directory (tenant) ID, or `common` / `organizations` for multi-tenant apps. */
export function getMicrosoftTenantId(): string {
  return import.meta.env.VITE_MICROSOFT_TENANT_ID?.trim() ?? '';
}

/**
 * OAuth redirect URI sent to Microsoft (authorize + token exchange).
 * When `VITE_MICROSOFT_REDIRECT_URI` is set (e.g. production URL on Vercel), it is always used so
 * Entra does not need every preview deploy URL. Otherwise uses the current origin.
 * Must exactly match an SPA redirect URI in Entra.
 */
export function getMicrosoftRedirectUri(): string {
  const fixed = import.meta.env.VITE_MICROSOFT_REDIRECT_URI?.trim();
  if (fixed) {
    return fixed.replace(/\/+$/, '');
  }
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/auth/microsoft/callback`;
}

/** True when a canonical redirect URL is pinned (preview builds use production callback). */
export function isFixedMicrosoftRedirectConfigured(): boolean {
  return Boolean(import.meta.env.VITE_MICROSOFT_REDIRECT_URI?.trim());
}

export function getMicrosoftAuthorizeUrl(): string {
  const tenant = getMicrosoftTenantId();
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
}

export function getMicrosoftTokenUrl(): string {
  const tenant = getMicrosoftTenantId();
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
}
