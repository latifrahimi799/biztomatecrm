import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '../lib/supabase/client';

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.display_name === 'string' && meta.display_name);
  if (fromMeta) return fromMeta;
  return user.email?.split('@')[0] || 'User';
}

function applyUser(user: User | null) {
  if (!user) {
    return { userEmail: null as string | null, userName: null as string | null };
  }
  return {
    userEmail: user.email ?? null,
    userName: displayNameFromUser(user),
  };
}

interface AuthState {
  userEmail: string | null;
  userName: string | null;
  /** False until the first Supabase session check finishes. */
  ready: boolean;
  initAuth: () => void;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

let authListenerBound = false;

export const useAuthStore = create<AuthState>((set) => ({
  userEmail: null,
  userName: null,
  ready: false,

  initAuth: () => {
    // Drop the old client-only demo session so production can't stay "logged in" without Supabase.
    try {
      localStorage.removeItem('biztomate-crm-auth');
    } catch {
      /* ignore */
    }

    if (!isSupabaseConfigured || !supabase) {
      set({ ready: true, userEmail: null, userName: null });
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      set({ ...applyUser(data.session?.user ?? null), ready: true });
    });

    if (!authListenerBound) {
      authListenerBound = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ ...applyUser(session?.user ?? null), ready: true });
      });
    }
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
    set(applyUser(data.user));
    return null;
  },

  logout: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    set({ userEmail: null, userName: null });
  },
}));
