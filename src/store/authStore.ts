import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';
import { ensureWorkspaceIdentity, type AppRole } from '../lib/supabase/users';

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.display_name === 'string' && meta.display_name);
  if (fromMeta) return fromMeta;
  return user.email?.split('@')[0] || 'User';
}

interface AuthState {
  userEmail: string | null;
  userName: string | null;
  userId: string | null;
  teamMemberId: string | null;
  role: AppRole | null;
  isSuperAdmin: boolean;
  /** False until the first Supabase session check finishes. */
  ready: boolean;
  initAuth: () => void;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshIdentity: () => Promise<void>;
}

let authListenerBound = false;

async function loadIdentity(
  set: (
    partial:
      | Partial<AuthState>
      | ((state: AuthState) => Partial<AuthState>),
  ) => void,
  user: User | null,
) {
  if (!user) {
    set({
      userEmail: null,
      userName: null,
      userId: null,
      teamMemberId: null,
      role: null,
      isSuperAdmin: false,
      ready: true,
    });
    return;
  }

  const email = user.email ?? '';
  const name = displayNameFromUser(user);
  const identity = await ensureWorkspaceIdentity(name, email);
  if ('error' in identity) {
    console.error('[auth] identity:', identity.error);
    set({
      userEmail: email,
      userName: name,
      userId: user.id,
      teamMemberId: null,
      role: null,
      isSuperAdmin: false,
      ready: true,
    });
    return;
  }

  set({
    userEmail: identity.email,
    userName: identity.name,
    userId: identity.userId,
    teamMemberId: identity.teamMemberId,
    role: identity.role,
    isSuperAdmin: identity.isSuperAdmin,
    ready: true,
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  userEmail: null,
  userName: null,
  userId: null,
  teamMemberId: null,
  role: null,
  isSuperAdmin: false,
  ready: false,

  initAuth: () => {
    try {
      localStorage.removeItem('biztomate-crm-auth');
    } catch {
      /* ignore */
    }

    if (!isSupabaseConfigured || !supabase) {
      set({
        ready: true,
        userEmail: null,
        userName: null,
        userId: null,
        teamMemberId: null,
        role: null,
        isSuperAdmin: false,
      });
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      void loadIdentity(set, data.session?.user ?? null);
    });

    if (!authListenerBound) {
      authListenerBound = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        void loadIdentity(set, session?.user ?? null);
      });
    }
  },

  refreshIdentity: async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    await loadIdentity(set, data.user ?? null);
  },

  login: async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
    }
    const trimmed = email.trim();
    if (!trimmed || !password) {
      return 'Email and password are required.';
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });
    if (error) return error.message;
    await loadIdentity(set, data.user);
    return null;
  },

  logout: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    set({
      userEmail: null,
      userName: null,
      userId: null,
      teamMemberId: null,
      role: null,
      isSuperAdmin: false,
    });
  },
}));
