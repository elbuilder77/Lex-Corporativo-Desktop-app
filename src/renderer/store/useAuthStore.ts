import { create } from 'zustand';
import { LexUser, UserSubscription, DEFAULT_SUBSCRIPTION } from '../types';

interface AuthState {
  user: LexUser | null;
  isAuthReady: boolean;
  subscription: UserSubscription;
  setUser: (user: LexUser | null) => void;
  setIsAuthReady: (ready: boolean) => void;
  setSubscription: (sub: UserSubscription) => void;
  logoutUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthReady: false,
  subscription: DEFAULT_SUBSCRIPTION,
  setUser: (user) => set({ user }),
  setIsAuthReady: (ready) => set({ isAuthReady: ready }),
  setSubscription: (sub) => set({ subscription: sub }),
  logoutUser: () => {
    localStorage.removeItem('lex_cleared_demo_mercantil');
    localStorage.removeItem('lex_cleared_demo_fiscal');
    set({ user: null, subscription: DEFAULT_SUBSCRIPTION });
  },
}));
