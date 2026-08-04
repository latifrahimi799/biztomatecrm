import { useEffect, useRef } from 'react';
import { fetchCrmPeople } from '../lib/supabase/crmData';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { useAuthStore } from '../store/authStore';
import { useCrmStore } from '../store/crmStore';

/**
 * After Supabase Auth resolves a user, replace contacts/leads (and related owners/companies)
 * from Postgres so the UI reflects the database, not browser demo/localStorage.
 */
export function SupabaseCrmSync() {
  const userEmail = useAuthStore((s) => s.userEmail);
  const userName = useAuthStore((s) => s.userName);
  const ready = useAuthStore((s) => s.ready);
  const applyRemotePeople = useCrmStore((s) => s.applyRemotePeople);
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
      const result = await fetchCrmPeople(userName ?? 'Workspace owner', userEmail);
      if (cancelled) return;

      if ('error' in result) {
        setRemoteSyncState({ status: 'error', error: result.error });
        return;
      }

      applyRemotePeople(result);
      setRemoteSyncState({ status: 'ready', error: null });
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, userEmail, userName, applyRemotePeople, setRemoteSyncState]);

  return null;
}
