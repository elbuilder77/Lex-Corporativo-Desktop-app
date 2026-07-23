import { create } from 'zustand';
import { AppNotification, NotificationType, ModuleTab } from '../types';

export type RuntimeHealth = Awaited<ReturnType<typeof window.lexDesktop.runtime.getHealth>>;

interface UiState {
  notifications: AppNotification[];
  isMobile: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeTab: ModuleTab;
  isOnline: boolean;
  runtimeHealth: RuntimeHealth | null;
  runtimeHealthLoading: boolean;
  notify: (message: string, type?: NotificationType, title?: string) => void;
  dismissNotification: (id: string) => void;
  setIsMobile: (mobile: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: ModuleTab) => void;
  setIsOnline: (online: boolean) => void;
  refreshRuntimeHealth: () => Promise<RuntimeHealth | null>;
}

export const useUiStore = create<UiState>((set) => ({
  notifications: [],
  isMobile: typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  sidebarOpen: typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  sidebarCollapsed: true,
  activeTab: 'fiscal-consultation',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  runtimeHealth: null,
  runtimeHealthLoading: false,
  notify: (message, type = 'info', title) => {
    const id = crypto.randomUUID();
    set((state) => ({ notifications: [...state.notifications, { id, type, message, title }] }));
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) }));
      }, 5000);
    }
  },
  dismissNotification: (id) => set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) })),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsOnline: (online) => set({ isOnline: online }),
  refreshRuntimeHealth: async () => {
    set({ runtimeHealthLoading: true });
    try {
      const runtimeHealth = await window.lexDesktop.runtime.getHealth();
      set({ runtimeHealth, runtimeHealthLoading: false });
      return runtimeHealth;
    } catch {
      set({ runtimeHealth: null, runtimeHealthLoading: false });
      return null;
    }
  },
}));
