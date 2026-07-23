import type { LexDesktopAPI } from '../preload/types';

declare global {
  interface Window {
    lexDesktop: LexDesktopAPI;
  }
}
