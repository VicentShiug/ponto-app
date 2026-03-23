"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { clsx } from "clsx";

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
      setTimeout(() => {
        setToasts((p) => p.filter((t) => t.id !== id));
      }, 4000);
    };
  }, []);

  function removeToast(id: string) {
    setToasts((p) => p.filter((t) => t.id !== id));
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 300);
    }, 3700);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-xl pointer-events-auto transition-all duration-300",
        exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0 animate-slide-in"
      )}
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border-2)",
        color: "var(--text-2)",
      }}
    >
      {toast.type === "success"
        ? <CheckCircle size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
        : <XCircle size={14} style={{ color: "var(--text-3)", flexShrink: 0 }} />
      }
      {toast.message}
      <button
        onClick={() => { setExiting(true); setTimeout(onClose, 300); }}
        className="ml-1"
        style={{ color: "var(--text-4)" }}
      >
        <X size={12} />
      </button>
    </div>
  );
}