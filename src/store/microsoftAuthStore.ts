import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { refreshAccessToken } from '../lib/microsoft/token';

interface MicrosoftAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  /** Epoch ms when accessToken is expected to expire. */
  expiresAtMs: number | null;
  setTokens: (access: string, refresh: string | undefined, expiresInSec: number) => void;
  clear: () => void;
}

export const useMicrosoftAuthStore = create<MicrosoftAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresAtMs: null,
      setTokens: (access, refresh, expiresInSec) =>
        set((s) => ({
          accessToken: access,
          refreshToken: refresh ?? s.refreshToken,
          expiresAtMs: Date.now() + Math.max(0, expiresInSec - 60) * 1000,
        })),
      clear: () => set({ accessToken: null, refreshToken: null, expiresAtMs: null }),
    }),
    { name: 'biztomate-microsoft-oauth' },
  ),
);

/** Returns a usable access token, refreshing with refresh_token when close to expiry. */
export async function getMicrosoftAccessToken(): Promise<string | null> {
  const { accessToken, refreshToken, expiresAtMs, setTokens, clear } =
    useMicrosoftAuthStore.getState();

  if (!refreshToken && !accessToken) return null;

  const now = Date.now();
  if (accessToken && expiresAtMs && now < expiresAtMs) {
    return accessToken;
  }

  if (!refreshToken) {
    clear();
    return null;
  }

  try {
    const next = await refreshAccessToken(refreshToken);
    setTokens(
      next.access_token,
      next.refresh_token,
      next.expires_in ?? 3600,
    );
    return next.access_token;
  } catch {
    clear();
    return null;
  }
}
