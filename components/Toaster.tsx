"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

interface Toast { id: string; message: string; type: "success" | "error"; }

let addToast: (message: string, type: "success" | "error") => void = () => {};

export function toast(message: string, type: "success" | "error" = "success") {
  addToast(message, type);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToast = (message, type) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((p) => [...p, { id, message, type }]);
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-xl pointer-events-auto animate-fade-in"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border-2)",
            color: "var(--text-2)",
          }}
        >
          {t.type === "success"
            ? <CheckCircle size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
            : <XCircle size={14} style={{ color: "var(--text-3)", flexShrink: 0 }} />
          }
          {t.message}
          <button
            onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
            className="ml-1"
            style={{ color: "var(--text-4)" }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
