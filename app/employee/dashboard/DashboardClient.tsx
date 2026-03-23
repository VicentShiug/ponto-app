"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Clock, CalendarDays } from "lucide-react";
import ClockButton from "@/components/ClockButton";
import { formatMinutes } from "@/lib/hours";

interface RecentEntry {
  id: string; date: string;
  clockIn: string; lunchOut: string; lunchIn: string; clockOut: string;
  workedMinutes: number; expectedMinutes: number;
}

interface Props {
  user: { name: string; weeklyHours: number; overtimeMode: string };
  todayEntryId: string | null;
  currentStep: 0 | 1 | 2 | 3 | 4;
  balanceMinutes: number;
  balanceLabel: string;
  recentEntries: RecentEntry[];
  expectedPerDay: number;
}

const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export default function EmployeeDashboardClient({
  user, todayEntryId, currentStep: initialStep,
  balanceMinutes, balanceLabel, recentEntries, expectedPerDay,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [entryId] = useState(todayEntryId);

  const handleClockSuccess = useCallback(() => {
    router.refresh();
    setStep((s) => s < 4 ? (s + 1) as 0|1|2|3|4 : s);
  }, [router]);

  const now = new Date();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="font-syne text-2xl font-bold" style={{ color: "var(--text)" }}>
          Olá, {user.name.split(" ")[0]}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
          {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Saldo */}
      <div className="card flex items-center gap-5">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
          {balanceMinutes >= 0
            ? <TrendingUp size={20} style={{ color: "var(--accent)" }} />
            : <TrendingDown size={20} style={{ color: "var(--text-3)" }} />}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "var(--text-3)" }}>
            {user.overtimeMode === "HOUR_BANK" ? "Banco de Horas" : "Horas Extras"}
          </p>
          <p className="font-syne text-3xl font-bold" style={{ color: balanceMinutes >= 0 ? "var(--text)" : "var(--text-3)" }}>
            {balanceLabel}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
            {user.weeklyHours}h/sem · {formatMinutes(expectedPerDay)}/dia
          </p>
        </div>
      </div>

      {/* Clock button */}
      <div className="card flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2 self-start">
          <Clock size={13} style={{ color: "var(--text-3)" }} />
          <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Registro de Hoje</p>
        </div>
        <ClockButton currentStep={step} entryId={entryId} onSuccess={handleClockSuccess} />
      </div>

      {/* Histórico recente */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={13} style={{ color: "var(--text-3)" }} />
          <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Últimos 7 dias</p>
        </div>
        <div className="space-y-1.5">
          {recentEntries.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-4)" }}>Nenhum registro ainda.</p>
          )}
          {recentEntries.map((e) => {
            const date = new Date(e.date);
            const diff = e.workedMinutes - e.expectedMinutes;
            const isToday = date.toDateString() === now.toDateString();
            return (
              <div
                key={e.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  backgroundColor: isToday ? "var(--accent-subtle)" : "var(--surface-2)",
                  border: `1px solid ${isToday ? "var(--accent-border)" : "transparent"}`,
                }}
              >
                <div className="text-center w-9 shrink-0">
                  <p className="text-[9px] uppercase" style={{ color: "var(--text-4)" }}>{WEEKDAYS[date.getDay()]}</p>
                  <p className="font-syne font-bold text-sm" style={{ color: "var(--text)" }}>
                    {date.getDate().toString().padStart(2, "0")}
                  </p>
                </div>
                <div className="flex-1 grid grid-cols-4 gap-1 text-center">
                  {[e.clockIn, e.lunchOut, e.lunchIn, e.clockOut].map((t, i) => (
                    <div key={i}>
                      <p className="text-[8px] uppercase" style={{ color: "var(--text-4)" }}>
                        {["Entrada","Almoço","Volta","Saída"][i]}
                      </p>
                      <p className="text-xs font-medium" style={{ color: "var(--text-2)" }}>{t}</p>
                    </div>
                  ))}
                </div>
                <div className="text-right shrink-0 w-14">
                  <p className="font-syne text-sm font-bold" style={{ color: "var(--text)" }}>
                    {formatMinutes(e.workedMinutes)}
                  </p>
                  {e.clockOut !== "--:--" && (
                    <p className="text-[9px]" style={{ color: diff >= 0 ? "var(--accent)" : "var(--text-3)" }}>
                      {diff >= 0 ? "+" : ""}{formatMinutes(diff)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
