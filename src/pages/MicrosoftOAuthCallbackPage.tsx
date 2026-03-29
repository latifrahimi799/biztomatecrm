import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consumeOAuthState, consumeOAuthVerifier } from '../lib/microsoft/startLogin';
import { exchangeCodeForTokens } from '../lib/microsoft/token';
import { useMicrosoftAuthStore } from '../store/microsoftAuthStore';

export function MicrosoftOAuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Signing you in with Microsoft…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    const errDesc = params.get('error_description');

    if (err) {
      setMessage(errDesc?.replace(/\+/g, ' ') ?? err);
      return;
    }

    const code = params.get('code');
    const state = params.get('state');
    const expected = consumeOAuthState();

    if (!code || !state || state !== expected) {
      setMessage('Something went wrong (missing code or session expired). Open Settings and try Connect again.');
      return;
    }

    const verifier = consumeOAuthVerifier();
    if (!verifier) {
      setMessage('Login session expired. Open Settings and try Connect again.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const tokens = await exchangeCodeForTokens(code, verifier);
        if (cancelled) return;
        useMicrosoftAuthStore.getState().setTokens(
          tokens.access_token,
          tokens.refresh_token,
          tokens.expires_in ?? 3600,
        );
        navigate('/settings?microsoft=connected', { replace: true });
      } catch (e) {
        if (cancelled) return;
        setMessage(e instanceof Error ? e.message : 'Could not complete sign-in.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="max-w-md text-sm text-muted">{message}</p>
    </div>
  );
}
