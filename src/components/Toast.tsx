import { useEffect, useState } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

let nextId = 0;

const toastStore = {
  toasts: [] as Toast[],
  listeners: [] as ((toasts: Toast[]) => void)[],
  add(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = ++nextId;
    const toast: Toast = { id, message, type };
    this.toasts = [...this.toasts, toast];
    this.listeners.forEach(fn => fn(this.toasts));
    setTimeout(() => this.remove(id), duration);
  },
  remove(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.listeners.forEach(fn => fn(this.toasts));
  },
  subscribe(fn: (toasts: Toast[]) => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  },
};

export const toast = {
  success: (msg: string) => toastStore.add(msg, 'success'),
  error: (msg: string) => toastStore.add(msg, 'error'),
  warning: (msg: string) => toastStore.add(msg, 'warning'),
  info: (msg: string) => toastStore.add(msg, 'info'),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => toastStore.subscribe(setToasts), []);

  const iconMap = {
    success: (
      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
        {toasts.map(t => (
          <div
            key={t.id}
            className="flex items-start gap-3 px-5 py-3 rounded-xl bg-[#1a1a1a]/95 backdrop-blur text-white text-sm font-medium shadow-2xl border border-white/10 animate-slide-up max-w-[500px]"
          >
            <span className="shrink-0 mt-0.5">{iconMap[t.type]}</span>
            <span className="flex-1 break-words">{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
