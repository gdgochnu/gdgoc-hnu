'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms — default 4000
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ─────────────────────────────────────────────
// Meta helpers
// ─────────────────────────────────────────────
function getToastMeta(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        Icon: CheckCircle2,
        color: '#34D399',
        bg: 'rgba(16, 185, 129, 0.14)',
        border: 'rgba(16, 185, 129, 0.35)',
        progressColor: '#10B981',
      };
    case 'error':
      return {
        Icon: XCircle,
        color: '#F87171',
        bg: 'rgba(239, 68, 68, 0.14)',
        border: 'rgba(239, 68, 68, 0.35)',
        progressColor: '#EF4444',
      };
    case 'warning':
      return {
        Icon: AlertTriangle,
        color: '#FBBF24',
        bg: 'rgba(251, 188, 4, 0.14)',
        border: 'rgba(251, 188, 4, 0.35)',
        progressColor: '#F59E0B',
      };
    case 'info':
    default:
      return {
        Icon: Info,
        color: '#60A5FA',
        bg: 'rgba(66, 133, 244, 0.14)',
        border: 'rgba(66, 133, 244, 0.35)',
        progressColor: '#4285F4',
      };
  }
}

// ─────────────────────────────────────────────
// Single Toast Item
// ─────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const meta = getToastMeta(toast.type);
  const duration = toast.duration ?? 4000;
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        handleDismiss();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 280);
  }, [onRemove, toast.id]);

  return (
    <div
      onClick={handleDismiss}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '340px',
        maxWidth: 'calc(100vw - 2rem)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.97) 0%, rgba(19, 27, 46, 0.97) 100%)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${meta.border}`,
        borderRadius: '14px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${meta.border}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(32px) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.28s ease',
        pointerEvents: 'all',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '0.95rem 1rem' }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            background: meta.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <meta.Icon size={18} color={meta.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#FFFFFF', lineHeight: 1.3 }}>
            {toast.title}
          </div>
          {toast.description && (
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem', lineHeight: 1.45 }}>
              {toast.description}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px', display: 'flex', flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress}%`,
            background: meta.progressColor,
            borderRadius: '0 999px 999px 0',
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Toast Stack
// ─────────────────────────────────────────────
function ToastStack({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 999998,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastStack toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function createToastHelpers(addToast: ToastContextValue['addToast']) {
  return {
    success: (title: string, description?: string) =>
      addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) =>
      addToast({ type: 'error', title, description }),
    warning: (title: string, description?: string) =>
      addToast({ type: 'warning', title, description }),
    info: (title: string, description?: string) =>
      addToast({ type: 'info', title, description }),
  };
}
