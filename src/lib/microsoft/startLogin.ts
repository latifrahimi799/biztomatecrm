import { MICROSOFT_GRAPH_SCOPES, getMicrosoftAuthorizeUrl, getMicrosoftClientId, getMicrosoftRedirectUri } from './config';
import { codeChallengeS256, generateCodeVerifier } from './pkce';

const STATE_KEY = 'ms_oauth_state';
const VERIFIER_KEY = 'ms_pkce_verifier';

/**
 * Redirects the browser to Microsoft login. After consent, Microsoft returns to
 * `/auth/microsoft/callback` with `?code=` and `?state=`.
 */
export async function startMicrosoftLogin(): Promise<void> {
  const clientId = getMicrosoftClientId();
  if (!clientId) {
    throw new Error('Microsoft OAuth is not configured (missing client id).');
  }

  const verifier = generateCodeVerifier();
  const challenge = await codeChallengeS256(verifier);
  const state = crypto.randomUUID();

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const redirectUri = getMicrosoftRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: MICROSOFT_GRAPH_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  window.location.assign(`${getMicrosoftAuthorizeUrl()}?${params.toString()}`);
}

export function consumeOAuthVerifier(): string | null {
  const v = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  return v;
}

export function consumeOAuthState(): string | null {
  const s = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return s;
}
