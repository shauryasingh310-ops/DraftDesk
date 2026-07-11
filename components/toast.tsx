'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Check, Undo2, X, AlertTriangle } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: string
  kind: ToastKind
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { ...t, id }])
      window.setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-sm transition-base animate-panel-in"
          >
            <span className="mt-0.5 shrink-0">
              {t.kind === 'success' && <Check className="size-4 text-status-resolved" />}
              {t.kind === 'error' && <AlertTriangle className="size-4 text-destructive" />}
              {t.kind === 'info' && <Check className="size-4 text-primary" />}
            </span>
            <p className="flex-1 text-sm leading-snug text-foreground">{t.message}</p>
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick()
                  remove(t.id)
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-fast hover:text-primary/80"
              >
                <Undo2 className="size-3.5" />
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
              className="shrink-0 text-muted-foreground transition-fast hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
