"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

type ToastKind = "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<{
  success: (message: string) => void;
  error: (message: string) => void;
} | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: ToastKind) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const success = useCallback((m: string) => push(m, "success"), [push]);
  const error = useCallback((m: string) => push(m, "error"), [push]);

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
                t.kind === "success"
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-danger/40 bg-danger/15 text-danger"
              }`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
