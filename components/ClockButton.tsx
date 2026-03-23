"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "./Toaster";

interface ClockButtonProps {
  currentStep: 0 | 1 | 2 | 3 | 4;
  entryId: string | null;
  onSuccess: () => void;
}

const STEPS = [
  { label: "Registrar Entrada",  sub: "Início da jornada",  action: "clock_in"  },
  { label: "Saída para Almoço",  sub: "Iniciar intervalo",  action: "lunch_out" },
  { label: "Retorno do Almoço",  sub: "Encerrar intervalo", action: "lunch_in"  },
  { label: "Registrar Saída",    sub: "Encerrar jornada",   action: "clock_out" },
];

export default function ClockButton({ currentStep, entryId, onSuccess }: ClockButtonProps) {
  const [loading, setLoading] = useState(false);

  if (currentStep === 4) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ border: "2px solid var(--accent-border)", backgroundColor: "var(--accent-subtle)" }}>
          <Clock size={28} style={{ color: "var(--accent)" }} />
        </div>
        <p className="font-syne font-bold" style={{ color: "var(--text)" }}>Jornada Completa</p>
        <p className="text-sm" style={{ color: "var(--text-3)" }}>Todas as marcações registradas.</p>
      </div>
    );
  }

  const step = STEPS[currentStep];

  async function handleMark() {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: step.action, entryId }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao registrar ponto", "error"); return; }
      toast(`${step.label} — ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, "success");
      onSuccess();
    } catch { toast("Erro de conexão", "error"); }
    finally { setLoading(false); }
  }

  async function handleSkipLunch() {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip_lunch", entryId }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro", "error"); return; }
      toast("Intervalo pulado.", "success");
      onSuccess();
    } catch { toast("Erro de conexão", "error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <button
        onClick={handleMark}
        disabled={loading}
        className="w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-30 pulse-ring"
        style={{ border: "1px solid var(--border-2)", backgroundColor: "var(--surface-2)" }}
      >
        {loading ? (
          <div className="w-6 h-6 border border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--text)", borderTopColor: "transparent" }} />
        ) : (
          <>
            <Clock size={24} style={{ color: "var(--accent)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
              Marcar
            </span>
          </>
        )}
      </button>

      <div className="text-center">
        <p className="font-syne font-bold" style={{ color: "var(--text)" }}>{step.label}</p>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>{step.sub}</p>
      </div>

      {currentStep === 1 && (
        <button
          onClick={handleSkipLunch}
          disabled={loading}
          className="text-xs underline underline-offset-4 transition-colors"
          style={{ color: "var(--text-4)" }}
        >
          Pular intervalo
        </button>
      )}
    </div>
  );
}
