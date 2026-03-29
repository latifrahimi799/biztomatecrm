import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userEmail: string | null;
  userName: string | null;
  login: (email: string, name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userEmail: null,
      userName: null,
      login: (email, name) => set({ userEmail: email, userName: name }),
      logout: () => set({ userEmail: null, userName: null }),
    }),
    { name: 'biztomate-crm-auth' },
  ),
);
