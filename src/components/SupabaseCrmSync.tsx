import { useEffect, useRef } from 'react';
import { fetchCrmWorkspace } from '../lib/supabase/crmData';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { useAuthStore } from '../store/authStore';
import { useCrmStore } from '../store/crmStore';

/**
 * After Auth, load the full CRM workspace from Supabase (all modules).
 */
export function SupabaseCrmSync() {
  const userEmail = useAuthStore((s) => s.userEmail);
  const userName = useAuthStore((s) => s.userName);
  const ready = useAuthStore((s) => s.ready);
  const applyRemoteWorkspace = useCrmStore((s) => s.applyRemoteWorkspace);
  const setRemoteSyncState = useCrmStore((s) => s.setRemoteSyncState);
  const lastEmail = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!isSupabaseConfigured || !userEmail) {
      lastEmail.current = null;
      setRemoteSyncState({ status: 'idle', error: null });
      return;
    }

    if (lastEmail.current === userEmail) return;
    lastEmail.current = userEmail;

    let cancelled = false;
    setRemoteSyncState({ status: 'loading', error: null });

    void (async () => {
      const result = await fetchCrmWorkspace(userName ?? 'Workspace owner', userEmail);
      if (cancelled) return;

      if ('error' in result) {
        setRemoteSyncState({ status: 'error', error: result.error });
        return;
      }

      applyRemoteWorkspace(result);
      setRemoteSyncState({ status: 'ready', error: null });
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, userEmail, userName, applyRemoteWorkspace, setRemoteSyncState]);

  return null;
}
