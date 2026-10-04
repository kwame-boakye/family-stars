import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon, MinusIcon, PlusIcon } from './icons';
import { MAX_STARS } from '../domain/validation';

/** Modal bottom sheet built on <dialog> for focus trapping and Escape handling. */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
  accent,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  accent?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`sheet ${accent ? `accent-${accent}` : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Tap on the backdrop closes the sheet.
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="sheet-inner">
          <header className="sheet-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          <div className="sheet-body">{children}</div>
          {footer && <footer className="sheet-foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function Stepper({
  value,
  onChange,
  label,
  min = 1,
  max = MAX_STARS,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  min?: number;
  max?: number;
  id?: string;
}) {
  const n = Number(value);
  const valid = value.trim() !== '' && Number.isInteger(n);
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  return (
    <div className="stepper">
      <button
        type="button"
        className="step-btn"
        aria-label={`Fewer ${label.toLowerCase()}`}
        disabled={valid && n <= min}
        onClick={() => onChange(String(valid ? Math.max(min, n - 1) : min))}
      >
        <MinusIcon />
      </button>
      <input
        id={inputId}
        className="step-input"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="step-btn"
        aria-label={`More ${label.toLowerCase()}`}
        disabled={valid && n >= max}
        onClick={() => onChange(String(valid ? Math.min(max, n + 1) : min))}
      >
        <PlusIcon />
      </button>
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="error-note" role="alert">
      {children}
    </p>
  );
}

export const EMOJI_CHOICES = ['🧸', '🧹', '📚', '🪥', '🛏️', '🍽️', '🤝', '🌱', '👕', '🎒', '🙏', '💛', '⛸️', '🍔', '🍦', '🎈', '🎨', '⚽', '🎬', '🛝', '🏊', '🧁', '📖', '🎁'];

export function EmojiPicker({ value, onChange, label = 'Icon (optional)' }: { value?: string; onChange: (v?: string) => void; label?: string }) {
  return (
    <fieldset className="emoji-picker">
      <legend className="field-label">{label}</legend>
      <div className="emoji-grid">
        <button type="button" className={`emoji-opt ${!value ? 'selected' : ''}`} aria-pressed={!value} onClick={() => onChange(undefined)}>
          <span className="emoji-none">None</span>
        </button>
        {EMOJI_CHOICES.map((e) => (
          <button key={e} type="button" className={`emoji-opt ${value === e ? 'selected' : ''}`} aria-pressed={value === e} onClick={() => onChange(e)}>
            <span aria-hidden="true">{e}</span>
            <span className="sr-only">{emojiName(e)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const EMOJI_NAMES: Record<string, string> = {
  '🧸': 'Teddy bear', '🧹': 'Broom', '📚': 'Books', '🪥': 'Toothbrush', '🛏️': 'Bed', '🍽️': 'Plate', '🤝': 'Helping hands',
  '🌱': 'Plant', '👕': 'Shirt', '🎒': 'School bag', '🙏': 'Thank you', '💛': 'Heart', '⛸️': 'Skate', '🍔': 'Burger',
  '🍦': 'Ice cream', '🎈': 'Balloon', '🎨': 'Paint', '⚽': 'Football', '🎬': 'Film', '🛝': 'Slide', '🏊': 'Swimming',
  '🧁': 'Cupcake', '📖': 'Story book', '🎁': 'Gift',
};
const emojiName = (e: string) => EMOJI_NAMES[e] ?? 'Icon';

export function QuickReasons({ options, onPick }: { options: string[]; onPick: (v: string) => void }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} type="button" className="chip" onClick={() => onPick(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
