import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { STAR_PATH } from './icons';

interface ToastAction {
  label: string;
  run: () => Promise<void> | void;
}

interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
  tone?: 'ok' | 'error';
}

interface FeedbackApi {
  /** Visual toast. Also announced unless `announce` is false. */
  toast: (message: string, opts?: { action?: ToastAction; tone?: 'ok' | 'error'; announce?: boolean }) => void;
  dismissToast: () => void;
  /** Screen-reader announcement only. */
  announce: (message: string) => void;
  celebrate: () => void;
}

const Ctx = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useFeedback outside FeedbackProvider');
  return api;
}

const TOAST_MS = 8000;

export function FeedbackProvider({ children, celebrations, screenKey }: { children: ReactNode; celebrations: boolean; screenKey?: string }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const [spoken, setSpoken] = useState('');
  const [burst, setBurst] = useState(0);
  const seq = useRef(0);

  const announce = useCallback((message: string) => {
    // Clearing first makes a repeat of the same text announce again.
    setSpoken('');
    requestAnimationFrame(() => setSpoken(message));
  }, []);

  const api = useMemo<FeedbackApi>(
    () => ({
      toast: (message, opts) => {
        setToast({ id: ++seq.current, message, action: opts?.action, tone: opts?.tone });
        if (opts?.announce !== false) announce(message);
      },
      dismissToast: () => setToast(null),
      announce,
      celebrate: () => {
        if (!celebrations) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        setBurst((n) => n + 1);
      },
    }),
    [announce, celebrations],
  );

  // A message belongs to the screen it was shown on.
  useEffect(() => setToast(null), [screenKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  async function runAction(a: ToastAction) {
    if (busy) return;
    setBusy(true);
    try {
      await a.run();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {spoken}
      </div>
      <div className="toast-slot">
        {toast && (
          <div className={`toast ${toast.tone === 'error' ? 'toast-error' : ''}`} key={toast.id}>
            <span className="toast-msg">{toast.message}</span>
            {toast.action && (
              <button type="button" className="toast-action" disabled={busy} onClick={() => runAction(toast.action!)}>
                {toast.action.label}
              </button>
            )}
            <button type="button" className="toast-close" aria-label="Dismiss message" onClick={() => setToast(null)}>
              ×
            </button>
          </div>
        )}
      </div>
      {burst > 0 && <StarBurst key={burst} />}
    </Ctx.Provider>
  );
}

const BURST = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2 + 0.3;
  const dist = 90 + (i % 3) * 30;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, s: 0.6 + (i % 4) * 0.2, r: (i * 47) % 360 };
});

/** Short, non-blocking burst of stars. Never delays interaction. */
function StarBurst() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 900);
    return () => clearTimeout(t);
  }, []);
  if (done) return null;
  return (
    <div className="burst" aria-hidden="true">
      <svg className="burst-center" viewBox="0 0 24 24" width="88" height="88">
        <path d={STAR_PATH} fill="var(--gold)" stroke="var(--gold-deep)" strokeWidth="1" />
      </svg>
      {BURST.map((b, i) => (
        <svg
          key={i}
          className="burst-star"
          viewBox="0 0 24 24"
          width="28"
          height="28"
          style={{ '--x': `${b.x}px`, '--y': `${b.y}px`, '--s': b.s, '--r': `${b.r}deg` } as CSSProperties}
        >
          <path d={STAR_PATH} fill="var(--gold)" />
        </svg>
      ))}
    </div>
  );
}
