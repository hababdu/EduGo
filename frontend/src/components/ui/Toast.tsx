import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

let pushExternal: ((t: Omit<ToastState, 'id'>) => void) | null = null;

export function toast(type: ToastType, message: string) {
  pushExternal?.({ type, message });
}

export function ToastHost() {
  const [items, setItems] = useState<ToastState[]>([]);

  useEffect(() => {
    pushExternal = ({ type, message }) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
    return () => {
      pushExternal = null;
    };
  }, []);

  const colors: Record<ToastType, string> = {
    success: 'bg-emerald-500/90 text-white',
    error: 'bg-red-500/90 text-white',
    info: 'bg-sky-500/90 text-white',
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-2xl text-xs font-semibold shadow-lg backdrop-blur-md animate-in slide-in-from-top ${colors[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}