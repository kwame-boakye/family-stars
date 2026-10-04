import { useSyncExternalStore } from 'react';

/**
 * Small store for service-worker and install state. The service worker is
 * registered from main.tsx; screens read this store.
 */
export interface PwaState {
  supported: boolean;
  /** All app files are cached; the app will open without internet. */
  offlineReady: boolean;
  /** A new version is downloaded and waiting. */
  updateReady: boolean;
  /** Chrome/Android install prompt is available. */
  canInstall: boolean;
  installed: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let state: PwaState = {
  supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  offlineReady: false,
  updateReady: false,
  canInstall: false,
  installed: isStandalone(),
};
const listeners = new Set<() => void>();
let applyUpdate: (() => Promise<void>) | null = null;
let installEvent: BeforeInstallPromptEvent | null = null;

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
    () => state,
  );
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export async function startPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as BeforeInstallPromptEvent;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => set({ installed: true, canInstall: false }));

  if (!state.supported || import.meta.env.DEV) return;
  const { registerSW } = await import('virtual:pwa-register');
  const update = registerSW({
    immediate: true,
    onOfflineReady: () => set({ offlineReady: true }),
    onNeedRefresh: () => set({ updateReady: true }),
    onRegisteredSW: (_url, reg) => {
      // An already-active worker means the precache finished on an earlier visit.
      if (reg?.active) set({ offlineReady: true });
    },
  });
  applyUpdate = () => update(true);

  // Ask the browser not to clear our storage under pressure (best effort).
  navigator.storage?.persist?.().catch(() => undefined);
}

export async function installApp() {
  if (!installEvent) return;
  await installEvent.prompt();
  await installEvent.userChoice.catch(() => undefined);
  installEvent = null;
  set({ canInstall: false });
}

export function updateApp() {
  return applyUpdate?.();
}
