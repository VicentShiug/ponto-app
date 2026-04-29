"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Clock, CalendarDays, Edit2, Check, X, Trash2 } from "lucide-react";
import ClockButton from "@/components/ClockButton";
import TimeInput from "@/components/TimeInput";
import { formatMinutes } from "@/lib/hours";
import { getDay, getDate, startOfDay, isSameDay, parseDateFromAPI } from "@/lib/dates";
import { toast } from "@/components/Toaster";
import TimeEntryCard from "@/components/TimeEntryCard";

interface RecentEntry {
  id: string; date: string;
  clockIn: string; lunchOut: string; lunchIn: string; clockOut: string;
  workedMinutes: number; expectedMinutes: number;
  holiday?: { name: string } | null;
}

interface Journey {
  start: string | null;
  lunch: string | null;
  lunchReturn: string | null;
  end: string | null;
}

interface Props {
  user: { name: string; weeklyHours: number; overtimeMode: string };
  todayEntryId: string | null;
  todayEntry: { clockIn: string; lunchOut: string; lunchIn: string; clockOut: string } | null;
  currentStep: 0 | 1 | 2 | 3 | 4;
  balanceMinutes: number;
  balanceLabel: string;
  recentEntries: RecentEntry[];
  expectedPerDay: number;
  todayHoliday?: { name: string } | null;
  journey: Journey;
}

const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

interface EditForm { clockIn: string; lunchOut: string; lunchIn: string; clockOut: string; }

export default function EmployeeDashboardClient({
  user, todayEntryId, todayEntry, currentStep: initialStep,
  balanceMinutes, balanceLabel, recentEntries, expectedPerDay, todayHoliday, journey,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [entryId, setEntryId] = useState(todayEntryId);

  useEffect(() => {
    setStep(initialStep);
    setEntryId(todayEntryId);
  }, [initialStep, todayEntryId]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ clockIn: "", lunchOut: "", lunchIn: "", clockOut: "" });
  const [saving, setSaving] = useState(false);

  const handleClockSuccess = useCallback((newId?: string) => {
    if (newId) setEntryId(newId);
    router.refresh();
    setStep((s) => s < 4 ? (s + 1) as 0|1|2|3|4 : s);
  }, [router]);

  function openEdit(e: RecentEntry) {
    setEditingId(e.id);
    setEditForm({
      clockIn:  e.clockIn  && e.clockIn  !== "--:--" ? e.clockIn  : "",
      lunchOut: e.lunchOut && e.lunchOut !== "--:--" ? e.lunchOut : "",
      lunchIn:  e.lunchIn  && e.lunchIn  !== "--:--" ? e.lunchIn  : "",
      clockOut: e.clockOut && e.clockOut !== "--:--" ? e.clockOut : "",
    });
  }

  async function saveEdit(e: RecentEntry) {
    setSaving(true);
    const toISO = (t: string) => t ? `${e.date}T${t}:00-03:00` : null;
    try {
      const res = await fetch(`/api/employee/entries/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockIn:  toISO(editForm.clockIn),
          lunchOut: toISO(editForm.lunchOut),
          lunchIn:  toISO(editForm.lunchIn),
          clockOut: toISO(editForm.clockOut),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao salvar", "error"); return; }
      toast("Registro atualizado!", "success");
      setEditingId(null);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setSaving(false); }
  }

  async function deleteEntry(e: RecentEntry) {
    if (!window.confirm("Certeza que deseja apagar este registro inteiro? Esta ação não pode ser desfeita.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employee/entries/${e.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao apagar", "error"); return; }
      toast("Registro apagado!", "success");
      setEditingId(null);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setSaving(false); }
  }

  const now = new Date();

  const todayLabels = ["Entrada", "Almoço", "Volta", "Saída"];
  const todayTimes = todayEntry
    ? [todayEntry.clockIn, todayEntry.lunchOut, todayEntry.lunchIn, todayEntry.clockOut]
    : null;

  // ── Dynamic journey suggestions ──────────────────────────────────
  function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = Math.round(mins % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  function hasTime(t: string | undefined | null): boolean {
    return !!t && t !== "--:--";
  }

  /**
   * Compute suggested times for a single day entry.
   * Returns { lunchOut, lunchIn, clockOut } as HH:mm strings or null.
   */
  function computeSuggestions(
    entry: { clockIn: string; lunchOut: string; lunchIn: string; clockOut: string },
  ): { lunchOut: string | null; lunchIn: string | null; clockOut: string | null } {
    const result: { lunchOut: string | null; lunchIn: string | null; clockOut: string | null } = {
      lunchOut: null, lunchIn: null, clockOut: null,
    };

    // Need at least the configured lunch interval + a real clockIn to produce suggestions
    if (!hasTime(entry.clockIn)) return result;

    const jLunch = journey.lunch ?? "12:00";
    const jLunchReturn = journey.lunchReturn ?? "13:00";
    const configuredLunchDuration = timeToMinutes(jLunchReturn) - timeToMinutes(jLunch);

    const clockInMins = timeToMinutes(entry.clockIn);

    // --- Suggestion for lunchOut ---
    if (!hasTime(entry.lunchOut) && !hasTime(entry.clockOut)) {
      // Use configured lunch time, or clockIn + half the working hours
      result.lunchOut = jLunch;
    }

    // --- Suggestion for lunchIn ---
    if (!hasTime(entry.lunchIn) && !hasTime(entry.clockOut)) {
      if (hasTime(entry.lunchOut)) {
        // Lunch started: suggest return = actual lunchOut + configured lunch duration
        result.lunchIn = minutesToTime(timeToMinutes(entry.lunchOut) + configuredLunchDuration);
      } else {
        // Lunch hasn't started: use configured return time
        result.lunchIn = jLunchReturn;
      }
    }

    // --- Suggestion for clockOut ---
    if (!hasTime(entry.clockOut)) {
      if (hasTime(entry.lunchIn) && hasTime(entry.lunchOut)) {
        // Full lunch interval is known
        const actualLunchDuration = timeToMinutes(entry.lunchIn) - timeToMinutes(entry.lunchOut);
        result.clockOut = minutesToTime(clockInMins + expectedPerDay + actualLunchDuration);
      } else if (hasTime(entry.lunchOut) && !hasTime(entry.lunchIn)) {
        // On lunch right now: use suggested lunchIn to compute
        const suggestedLunchInMins = timeToMinutes(entry.lunchOut) + configuredLunchDuration;
        const lunchDuration = suggestedLunchInMins - timeToMinutes(entry.lunchOut);
        result.clockOut = minutesToTime(clockInMins + expectedPerDay + lunchDuration);
      } else if (!hasTime(entry.lunchOut)) {
        // No lunch at all — could be skipping (step goes directly to clockOut)
        // If we're at step 3 (skip lunch path), suggest clockIn + expectedPerDay
        // If still at step 1, suggest with configured lunch
        if (step >= 3) {
          // Skipped lunch
          result.clockOut = minutesToTime(clockInMins + expectedPerDay);
        } else {
          // Still before lunch — suggest with configured lunch duration
          result.clockOut = minutesToTime(clockInMins + expectedPerDay + configuredLunchDuration);
        }
      }
    }

    return result;
  }

  // Today's suggestions
  const todaySuggestions = todayEntry
    ? computeSuggestions(todayEntry)
    : { lunchOut: null, lunchIn: null, clockOut: null };

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

      {todayHoliday && (
        <div className="rounded-xl px-4 py-3 bg-accent-subtle text-accent flex items-center gap-2 text-sm font-medium border border-accent">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          Hoje é feriado: {todayHoliday.name}
        </div>
      )}

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

      {/* Registro de Hoje */}
      <div className="card flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2 self-start">
          <Clock size={13} style={{ color: "var(--text-3)" }} />
          <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Registro de Hoje</p>
        </div>

        {/* Marcações de hoje */}
        {todayTimes && (
          <div className="w-full grid grid-cols-4 gap-2 text-center mb-4 px-1">
            {todayTimes.map((t, i) => {
              const suggestion = [null, todaySuggestions.lunchOut, todaySuggestions.lunchIn, todaySuggestions.clockOut][i];
              const isActual = hasTime(t);
              const display = isActual ? t : suggestion;
              return (
                <div key={i}>
                  <p className="text-[10px] uppercase font-medium" style={{ color: "var(--text-3)" }}>
                    {todayLabels[i]}
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: isActual ? "var(--text)" : display ? "var(--text-4)" : "var(--text-4)" }}
                  >
                    {display ? (
                      isActual ? display : <span style={{ opacity: 0.45 }}>~{display}</span>
                    ) : (
                      "--:--"
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}

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
            const date = startOfDay(parseDateFromAPI(e.date));
            const diff = e.workedMinutes - e.expectedMinutes;
            const isToday = isSameDay(date, now);
            const isEditing = editingId === e.id;

            let entrySuggestions: { lunchOut: string | null; lunchIn: string | null; clockOut: string | null } | undefined;
            if (isToday) {
              entrySuggestions = computeSuggestions(e);
            }

            return (
              <TimeEntryCard
                key={e.id}
                date={date}
                holiday={e.holiday}
                isToday={isToday}
                clockIn={e.clockIn}
                lunchOut={e.lunchOut}
                lunchIn={e.lunchIn}
                clockOut={e.clockOut}
                suggestions={entrySuggestions}
                workedMinutes={e.workedMinutes}
                diffMinutes={diff}
                isEditing={isEditing}
                editForm={isEditing ? editForm : undefined}
                onEditFormChange={isEditing ? (field, val) => setEditForm({ ...editForm, [field]: val }) : undefined}
                saving={saving}
                onSave={() => saveEdit(e)}
                onCancel={() => setEditingId(null)}
                onDelete={() => deleteEntry(e)}
                onEdit={() => openEdit(e)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
