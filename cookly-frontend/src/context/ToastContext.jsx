/**
 * Tiny toast system: any component can call
 *   const toast = useToast();  toast.success('Saved!')
 * Toasts stack on glass in the corner and disappear after a few seconds.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (type, message, { duration = 4000 } = {}) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((list) => [...list.slice(-3), { id, type, message }]); // keep at most 4
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (msg, opts) => show('success', msg, opts),
      error: (msg, opts) => show('error', msg, opts),
      warning: (msg, opts) => show('warning', msg, opts),
      info: (msg, opts) => show('info', msg, opts),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`toast glass toast--${t.type}`}>
              <Icon size={20} aria-hidden />
              <span>{t.message}</span>
              <button className="icon-btn icon-btn--sm" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
