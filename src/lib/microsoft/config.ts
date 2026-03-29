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

/** Must match a redirect URI registered on the Entra app (SPA platform). */
export function getMicrosoftRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/auth/microsoft/callback`;
}

export function getMicrosoftAuthorizeUrl(): string {
  const tenant = getMicrosoftTenantId();
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
}

export function getMicrosoftTokenUrl(): string {
  const tenant = getMicrosoftTenantId();
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
}
