import { useEffect, useRef } from 'react';
import { fetchCrmWorkspace } from '../lib/supabase/crmData';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { useAuthStore } from '../store/authStore';
import { useCrmStore } from '../store/crmStore';

/**
 * After Auth + workspace identity, load CRM rows (RLS scopes by owner / super_admin).
 * Sets defaultOwnerId as soon as teamMemberId is known so writes are not silently skipped.
 */
export function SupabaseCrmSync() {
  const userEmail = useAuthStore((s) => s.userEmail);
  const userName = useAuthStore((s) => s.userName);
  const teamMemberId = useAuthStore((s) => s.teamMemberId);
  const ready = useAuthStore((s) => s.ready);
  const applyRemoteWorkspace = useCrmStore((s) => s.applyRemoteWorkspace);
  const setRemoteSyncState = useCrmStore((s) => s.setRemoteSyncState);
  const setDefaultOwnerId = useCrmStore((s) => s.setDefaultOwnerId);
  const lastKey = useRef<string | null>(null);

  // Stamp owner seat immediately so lead/contact creates can write to Supabase
  useEffect(() => {
    if (!ready) return;
    setDefaultOwnerId(teamMemberId);
  }, [ready, teamMemberId, setDefaultOwnerId]);

  useEffect(() => {
    if (!ready) return;

    if (!isSupabaseConfigured || !userEmail || !teamMemberId) {
      lastKey.current = null;
      setRemoteSyncState({ status: 'idle', error: null });
      return;
    }

    const key = `${userEmail}:${teamMemberId}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

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
  }, [
    ready,
    userEmail,
    userName,
    teamMemberId,
    applyRemoteWorkspace,
    setRemoteSyncState,
  ]);

  return null;
}
