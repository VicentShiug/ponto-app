"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Edit2, Check, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import TimeInput from "@/components/TimeInput";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatMinutes } from "@/lib/hours";
import { getDaySP, getDate, getYear, getMonth, startOfDay, parseDateFromAPI, toSP } from "@/lib/dates";
import { toast } from "@/components/Toaster";
import { EmptyState } from "@/components/EmptyState";

interface DayData {
  id?: string; date: string; isWeekend: boolean; isFuture: boolean;
  holiday?: { name: string } | null;
  clockIn: string | null; lunchOut: string | null; lunchIn: string | null; clockOut: string | null;
  workedMinutes: number; diffMinutes: number; status: string;
}
interface Props {
  days: DayData[];
  weeks: { week: string; worked: number; expected: number }[];
  monthLabel: string; totalWorkedLabel: string; totalExpectedLabel: string;
  balanceLabel: string; balanceMinutes: number;
}

const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  complete:   { bg: "var(--accent-subtle)", text: "var(--accent)",  border: "var(--accent-border)", label: "Completo"      },
  incomplete: { bg: "var(--surface-2)",     text: "var(--text-2)",  border: "var(--border)",        label: "Incompleto"    },
  absent:     { bg: "var(--surface-2)",     text: "var(--text-3)",  border: "var(--border)",        label: "Ausente"       },
  weekend:    { bg: "transparent",          text: "var(--text-4)",  border: "transparent",          label: "Fim de semana" },
  future:     { bg: "transparent",          text: "var(--text-4)",  border: "transparent",          label: "—"             },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-2)" }}>
      <p className="mb-1.5" style={{ color: "var(--text-3)" }}>{label}</p>
      <p style={{ color: "var(--text)" }}>Trabalhado: {payload[0]?.value}h</p>
      <p style={{ color: "var(--text-3)" }}>Esperado: {payload[1]?.value}h</p>
    </div>
  );
};

interface EditForm { clockIn: string; lunchOut: string; lunchIn: string; clockOut: string; }

export default function HistoryClient({ days, weeks, monthLabel, totalWorkedLabel, totalExpectedLabel, balanceLabel, balanceMinutes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstDow = days[0]?.date ? getDaySP(parseDateFromAPI(days[0].date)) : 0;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ clockIn: "", lunchOut: "", lunchIn: "", clockOut: "" });
  const [saving, setSaving] = useState(false);

  const currentYear = parseInt(searchParams.get("year") || getYear(new Date()).toString());
  const currentMonth = parseInt(searchParams.get("month") || (getMonth(new Date()) + 1).toString());

  function goToMonth(year: number, month: number) {
    router.push(`/employee/history?year=${year}&month=${month}`);
  }

  function prevMonth() {
    if (currentMonth === 1) {
      goToMonth(currentYear - 1, 12);
    } else {
      goToMonth(currentYear, currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 12) {
      goToMonth(currentYear + 1, 1);
    } else {
      goToMonth(currentYear, currentMonth + 1);
    }
  }

  function openEdit(d: DayData) {
    if (!d.id) return;
    setEditingId(d.id);
    setEditForm({
      clockIn:  d.clockIn  && d.clockIn  !== "--:--" ? d.clockIn  : "",
      lunchOut: d.lunchOut && d.lunchOut !== "--:--" ? d.lunchOut : "",
      lunchIn:  d.lunchIn  && d.lunchIn  !== "--:--" ? d.lunchIn  : "",
      clockOut: d.clockOut && d.clockOut !== "--:--" ? d.clockOut : "",
    });
  }

  async function saveEdit(d: DayData) {
    if (!d.id) return;
    setSaving(true);
    const dateStr = d.date.split("T")[0];
    const toISO = (t: string) => t ? `${dateStr}T${t}:00-03:00` : null;
    try {
      const res = await fetch(`/api/employee/entries/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clockIn: toISO(editForm.clockIn), lunchOut: toISO(editForm.lunchOut), lunchIn: toISO(editForm.lunchIn), clockOut: toISO(editForm.clockOut) }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao salvar", "error"); return; }
      toast("Registro atualizado!", "success");
      setEditingId(null);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setSaving(false); }
  }

  async function deleteEntry(d: DayData) {
    if (!d.id) return;
    if (!window.confirm("Certeza que deseja apagar este registro inteiro? Esta ação não pode ser desfeita.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employee/entries/${d.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao apagar", "error"); return; }
      toast("Registro apagado!", "success");
      setEditingId(null);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors" style={{ color: "var(--text-3)" }}>
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-syne text-2xl font-bold capitalize" style={{ color: "var(--text)" }}>{monthLabel}</h1>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors" style={{ color: "var(--text-3)" }}>
              <ChevronRight size={20} />
            </button>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>Histórico de horas</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Trabalhado",  value: totalWorkedLabel,   highlight: true },
          { label: "Esperado",    value: totalExpectedLabel, highlight: false },
          { label: "Saldo",       value: balanceLabel,       highlight: balanceMinutes > 0 },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>{s.label}</p>
            <p className="font-syne text-xl font-bold" style={{ color: s.highlight ? "var(--text)" : "var(--text-3)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="card">
        <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Horas por semana</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeks} barGap={3}>
            <XAxis dataKey="week" tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--text-3)", fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-2)" }} />
            <ReferenceLine y={weeks[0]?.expected} stroke="var(--border-2)" strokeDasharray="4 4" />
            <Bar dataKey="worked"   fill="var(--accent)"    radius={[4,4,0,0]} />
            <Bar dataKey="expected" fill="var(--surface-3)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Calendário */}
      <div className="card">
        <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Calendário</p>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => <div key={d} className="text-center text-[9px] uppercase font-medium py-1" style={{ color: "var(--text-4)" }}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
          {days.map((d) => {
            const date = parseDateFromAPI(d.date);
            const cfg = STATUS_CONFIG[d.status];
            return (
              <div
                key={d.date}
                className="relative aspect-square rounded-lg flex flex-col items-center justify-center font-semibold overflow-hidden"
                style={{ 
                  backgroundColor: cfg.bg, 
                  color: cfg.text, 
                  border: `1px solid ${d.holiday ? 'var(--accent-border)' : cfg.border}`,
                  backgroundImage: d.holiday && d.status !== 'complete'
                    ? "repeating-linear-gradient(45deg, transparent, transparent 8px, var(--accent-subtle) 8px, var(--accent-subtle) 16px)" 
                    : d.holiday 
                      ? "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.05) 8px, rgba(0,0,0,0.05) 16px)"
                      : undefined
                }}
                title={d.status !== "weekend" && d.status !== "future" ? `${cfg.label} — ${formatMinutes(d.workedMinutes)}${d.holiday ? `\nFeriado: ${d.holiday.name}` : ""}` : d.holiday ? `Feriado: ${d.holiday.name}` : undefined}
              >
                <span className="text-[11px] z-10 px-1 rounded backdrop-blur-sm" style={{ color: d.holiday ? "var(--accent)" : undefined }}>
                  {date.getUTCDate()}
                </span>
                {d.holiday && (
                  <span className="text-[6px] text-center w-full truncate px-0.5 z-10 mt-0.5 backdrop-blur-sm uppercase font-bold" style={{ color: "var(--accent)" }}>
                    {d.holiday.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "future").map(([, cfg]) => (
            <span key={cfg.label} className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Detalhe por dia</p>
        <div className="space-y-1.5">
          {(() => {
            const filteredDays = days.filter((d) => !d.isWeekend && !d.isFuture);
            if (filteredDays.length === 0) {
              return (
                <EmptyState 
                  message="Nenhum registro encontrado." 
                  submessage="Seus registros de ponto aparecerão aqui." 
                />
              );
            }
            return filteredDays.slice().reverse().map((d) => {
              const date = parseDateFromAPI(d.date);
              const isEditing = editingId === d.id;
              return (
                <div key={d.date} className="rounded-xl p-3 relative overflow-hidden" style={{ 
                  backgroundColor: d.holiday ? "var(--accent-subtle)" : "var(--surface-2)", 
                  border: `1px solid ${d.holiday ? "var(--accent-border)" : "var(--border)"}` 
                }}>
                  {d.holiday && (
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg, var(--accent), var(--accent) 10px, transparent 10px, transparent 20px)" }} />
                  )}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-24 shrink-0 flex flex-col items-start justify-center">
                      <p className="text-[9px] uppercase mb-0.5" style={{ color: "var(--text-4)" }}>{WEEKDAYS[getDaySP(date)]}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-syne font-bold text-sm" style={{ color: "var(--text)" }}>{date.getUTCDate().toString().padStart(2,"0")}</p>
                        {d.holiday && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-subtle text-accent border border-accent">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                            Feriado
                          </span>
                        )}
                      </div>
                      {d.holiday && (
                        <p className="text-[8px] mt-1 leading-tight text-gray-500 line-clamp-1" title={d.holiday.name}>
                          {d.holiday.name}
                        </p>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="flex-1 grid grid-cols-4 gap-1.5">
                        {(["clockIn", "lunchOut", "lunchIn", "clockOut"] as const).map((field) => {
                          const labels = {
                            clockIn: "Entrada",
                            lunchOut: "Saída Alm.",
                            lunchIn: "Volta Alm.",
                            clockOut: "Saída"
                          };
                          return (
                            <TimeInput
                              key={field}
                              label={labels[field]}
                              value={editForm[field]}
                              onChange={(val) => setEditForm({ ...editForm, [field]: val })}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex-1 grid grid-cols-4 gap-2 text-center">
                        {[d.clockIn, d.lunchOut, d.lunchIn, d.clockOut].map((t, i) => (
                          <div key={i}>
                            <p className="text-[10px] uppercase font-medium" style={{ color: "var(--text-3)" }}>{["Entrada","Almoço","Volta","Saída"][i]}</p>
                            <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>{t ?? "--:--"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!isEditing && (
                      <div className="text-right shrink-0 min-w-[4.5rem] whitespace-nowrap">
                        <p className="font-syne text-sm font-bold" style={{ color: "var(--text)" }}>{formatMinutes(d.workedMinutes)}</p>
                        {d.clockOut && d.clockOut !== "--:--" && (
                          <p 
                            className="text-[9px] cursor-help" 
                            style={{ color: d.diffMinutes >= 0 ? "var(--accent)" : "var(--text-3)" }}
                            title={d.holiday ? "Horas em feriado contam como extra" : undefined}
                          >
                            {d.diffMinutes >= 0 ? "+" : ""}{formatMinutes(d.diffMinutes)}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(d)} disabled={saving} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--accent)" }}>
                            {saving ? <span className="w-3 h-3 border border-t-transparent rounded-full animate-spin block" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} /> : <Check size={13} />}
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-3)" }}>
                            <X size={13} />
                          </button>
                          <button onClick={() => deleteEntry(d)} disabled={saving} className="p-1.5 rounded-lg transition-colors" style={{ color: "#ef4444" }} title="Apagar registro inteiro">
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        d.id && d.status !== "absent" && (
                          <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-4)" }}>
                            <Edit2 size={13} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
