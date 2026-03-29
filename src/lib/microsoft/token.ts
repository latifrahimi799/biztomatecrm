import {
  getMicrosoftClientId,
  getMicrosoftRedirectUri,
  getMicrosoftTokenUrl,
} from './config';

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<MicrosoftTokenResponse> {
  const body = new URLSearchParams({
    client_id: getMicrosoftClientId(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: getMicrosoftRedirectUri(),
    code_verifier: codeVerifier,
  });

  const res = await fetch(getMicrosoftTokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await res.json()) as MicrosoftTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    throw new Error(
      json.error_description ?? json.error ?? `Token request failed (${res.status})`,
    );
  }

  if (!json.access_token) {
    throw new Error('No access_token in response');
  }

  return json;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<MicrosoftTokenResponse> {
  const body = new URLSearchParams({
    client_id: getMicrosoftClientId(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(getMicrosoftTokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await res.json()) as MicrosoftTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    throw new Error(
      json.error_description ?? json.error ?? `Refresh failed (${res.status})`,
    );
  }

  if (!json.access_token) {
    throw new Error('No access_token in refresh response');
  }

  return json;
}
