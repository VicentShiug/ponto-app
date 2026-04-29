"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Edit2, Check, X, ChevronLeft, ChevronRight, Trash2, FileText, Plus } from "lucide-react";
import TimeInput from "@/components/TimeInput";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatMinutes } from "@/lib/hours";
import { getDaySP, getDate, getYear, getMonth, startOfDay, parseDateFromAPI, toSP } from "@/lib/dates";
import { toast } from "@/components/Toaster";
import { EmptyState } from "@/components/EmptyState";
import { clsx } from "clsx";
import CertificateBadge from "@/components/CertificateBadge";
import HolidayBadge from "@/components/HolidayBadge";
import TimeEntryCard from "@/components/TimeEntryCard";

interface DayData {
  id?: string; date: string; isWeekend: boolean; isFuture: boolean;
  holiday?: { name: string } | null;
  certificate?: { type: "PARTIAL" | "FULL_DAY"; startTime: string | null; endTime: string | null; startDate: string | null; endDate: string | null } | null;
  clockIn: string | null; lunchOut: string | null; lunchIn: string | null; clockOut: string | null;
  workedMinutes: number; diffMinutes: number; status: string;
}

interface Certificate {
  id: string; userId: string; createdById: string; createdByName: string;
  type: "PARTIAL" | "FULL_DAY";
  date: string | null; startDate: string | null; endDate: string | null;
  startTime: string | null; endTime: string | null;
  reason: string | null; createdAt: string;
}

interface Props {
  days: DayData[];
  weeks: { week: string; worked: number; expected: number }[];
  monthLabel: string; totalWorkedLabel: string; totalExpectedLabel: string;
  balanceLabel: string; balanceMinutes: number;
  certificates: Certificate[];
  userId: string;
}

const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  complete:    { bg: "var(--accent-subtle)", text: "var(--accent)",  border: "var(--accent-border)", label: "Completo"      },
  incomplete:  { bg: "var(--surface-2)",     text: "var(--text-2)",  border: "var(--border)",        label: "Incompleto"    },
  absent:      { bg: "var(--surface-2)",     text: "var(--text-3)",  border: "var(--border)",        label: "Ausente"       },
  weekend:     { bg: "transparent",          text: "var(--text-4)",  border: "transparent",          label: "Fim de semana" },
  future:      { bg: "transparent",          text: "var(--text-4)",  border: "transparent",          label: "—"             },
  certificate: { bg: "var(--surface-2)",     text: "var(--text-2)",  border: "var(--border)",        label: "Atestado"      },
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

export default function HistoryClient({ days, weeks, monthLabel, totalWorkedLabel, totalExpectedLabel, balanceLabel, balanceMinutes, certificates, userId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstDow = days[0]?.date ? getDaySP(parseDateFromAPI(days[0].date)) : 0;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ clockIn: "", lunchOut: "", lunchIn: "", clockOut: "" });
  const [saving, setSaving] = useState(false);

  // Certificate modal states
  const [showCertModal, setShowCertModal] = useState(false);
  const [certSubType, setCertSubType] = useState<"PARTIAL" | "FULL_DAY">("PARTIAL");
  const [certDate, setCertDate] = useState("");
  const [certStartTime, setCertStartTime] = useState("");
  const [certEndTime, setCertEndTime] = useState("");
  const [certStartDate, setCertStartDate] = useState("");
  const [certEndDate, setCertEndDate] = useState("");
  const [certReason, setCertReason] = useState("");
  const [certLoading, setCertLoading] = useState(false);

  // Edit certificate modal
  const [showEditCertModal, setShowEditCertModal] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [editCertSubType, setEditCertSubType] = useState<"PARTIAL" | "FULL_DAY">("PARTIAL");
  const [editCertDate, setEditCertDate] = useState("");
  const [editCertStartTime, setEditCertStartTime] = useState("");
  const [editCertEndTime, setEditCertEndTime] = useState("");
  const [editCertStartDate, setEditCertStartDate] = useState("");
  const [editCertEndDate, setEditCertEndDate] = useState("");
  const [editCertReason, setEditCertReason] = useState("");
  const [savingCert, setSavingCert] = useState(false);

  // Delete certificate
  const [showDeleteCertModal, setShowDeleteCertModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [deletingCert, setDeletingCert] = useState(false);

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

  // Certificate handlers
  function resetCertFields() {
    setCertDate(""); setCertStartTime(""); setCertEndTime("");
    setCertStartDate(""); setCertEndDate(""); setCertReason("");
    setCertSubType("PARTIAL");
  }

  async function handleCreateCert() {
    setCertLoading(true);
    try {
      const payload: any = { userId };
      if (certSubType === "PARTIAL") {
        if (!certDate || !certStartTime || !certEndTime) {
          toast("Preencha data e horários", "error"); setCertLoading(false); return;
        }
        payload.type = "PARTIAL";
        payload.date = certDate;
        payload.startTime = certStartTime;
        payload.endTime = certEndTime;
        payload.reason = certReason || undefined;
      } else {
        if (!certStartDate || !certEndDate) {
          toast("Preencha as datas", "error"); setCertLoading(false); return;
        }
        payload.type = "FULL_DAY";
        payload.startDate = certStartDate;
        payload.endDate = certEndDate;
        payload.reason = certReason || undefined;
      }

      const res = await fetch("/api/medical-certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao registrar atestado", "error"); return; }
      toast("Atestado registrado!", "success");
      setShowCertModal(false);
      resetCertFields();
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setCertLoading(false); }
  }

  function openEditCert(cert: Certificate) {
    setEditingCert(cert);
    setEditCertSubType(cert.type);
    if (cert.type === "PARTIAL") {
      setEditCertDate(cert.date?.split("T")[0] || "");
      setEditCertStartTime(cert.startTime || "");
      setEditCertEndTime(cert.endTime || "");
    } else {
      setEditCertStartDate(cert.startDate?.split("T")[0] || "");
      setEditCertEndDate(cert.endDate?.split("T")[0] || "");
    }
    setEditCertReason(cert.reason || "");
    setShowEditCertModal(true);
  }

  async function handleEditCert() {
    if (!editingCert) return;
    setSavingCert(true);
    try {
      const payload: any = {};
      if (editCertSubType === "PARTIAL") {
        if (!editCertDate || !editCertStartTime || !editCertEndTime) {
          toast("Preencha data e horários", "error"); setSavingCert(false); return;
        }
        payload.type = "PARTIAL";
        payload.date = editCertDate;
        payload.startTime = editCertStartTime;
        payload.endTime = editCertEndTime;
        payload.reason = editCertReason || undefined;
      } else {
        if (!editCertStartDate || !editCertEndDate) {
          toast("Preencha as datas", "error"); setSavingCert(false); return;
        }
        payload.type = "FULL_DAY";
        payload.startDate = editCertStartDate;
        payload.endDate = editCertEndDate;
        payload.reason = editCertReason || undefined;
      }

      const res = await fetch(`/api/medical-certificates/${editingCert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao editar atestado", "error"); return; }
      toast("Atestado editado!", "success");
      setShowEditCertModal(false);
      setEditingCert(null);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setSavingCert(false); }
  }

  function openDeleteCert(cert: Certificate) {
    setSelectedCert(cert);
    setShowDeleteCertModal(true);
  }

  async function handleDeleteCert() {
    if (!selectedCert) return;
    setDeletingCert(true);
    try {
      const res = await fetch(`/api/medical-certificates/${selectedCert.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao remover atestado", "error"); return; }
      toast("Atestado removido!", "success");
      setShowDeleteCertModal(false);
      setSelectedCert(null);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setDeletingCert(false); }
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
        <button
          onClick={() => setShowCertModal(true)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <FileText size={15} />
          Registrar Atestado
        </button>
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
      <div className="card overflow-hidden">
        <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Calendário</p>
        <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
          <div className="min-w-[280px]">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => <div key={d} className="text-center text-[9px] uppercase font-medium py-1" style={{ color: "var(--text-4)" }}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
              {days.map((d) => {
                const date = parseDateFromAPI(d.date);
                const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.absent;
                const hasCert = !!d.certificate;
                return (
                  <div
                    key={d.date}
                    className="relative aspect-square min-h-[44px] rounded-lg flex flex-col items-center justify-center font-semibold overflow-hidden"
                    style={{ 
                      backgroundColor: cfg.bg, 
                      color: cfg.text, 
                      border: `1px solid ${d.holiday ? 'var(--accent-border)' : hasCert ? 'var(--border-2)' : cfg.border}`,
                      backgroundImage: d.holiday && d.status !== 'complete'
                        ? "repeating-linear-gradient(45deg, transparent, transparent 8px, var(--accent-subtle) 8px, var(--accent-subtle) 16px)" 
                        : d.holiday 
                          ? "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.05) 8px, rgba(0,0,0,0.05) 16px)"
                          : undefined
                    }}
                    title={d.status !== "weekend" && d.status !== "future" ? `${cfg.label} — ${formatMinutes(d.workedMinutes)}${d.holiday ? `\nFeriado: ${d.holiday.name}` : ""}${hasCert ? "\nAtestado" : ""}` : d.holiday ? `Feriado: ${d.holiday.name}` : undefined}
                  >
                    <span className="text-[11px] z-10 px-1 rounded backdrop-blur-sm" style={{ color: d.holiday ? "var(--accent)" : undefined }}>
                      {date.getUTCDate()}
                    </span>
                    {d.holiday && (
                      <span className="text-[7px] text-center w-full truncate px-0.5 z-10 mt-0.5 backdrop-blur-sm uppercase font-bold" style={{ color: "var(--accent)" }}>
                        {d.holiday.name}
                      </span>
                    )}
                    {hasCert && !d.holiday && (
                      <span className="text-[7px] text-center w-full truncate px-0.5 z-10 mt-0.5 backdrop-blur-sm uppercase font-bold" style={{ color: "var(--text-2)" }}>
                        Atestado
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
              const hasCert = !!d.certificate;

              return (
                <TimeEntryCard
                  key={d.date}
                  date={date}
                  holiday={d.holiday}
                  certificate={d.certificate}
                  clockIn={d.clockIn}
                  lunchOut={d.lunchOut}
                  lunchIn={d.lunchIn}
                  clockOut={d.clockOut}
                  workedMinutes={d.workedMinutes}
                  diffMinutes={d.diffMinutes}
                  diffTooltip={d.holiday ? "Horas em feriado contam como extra" : hasCert && d.certificate!.type === "FULL_DAY" ? "Dia coberto por atestado" : undefined}
                  isEditing={isEditing}
                  editForm={isEditing ? editForm : undefined}
                  onEditFormChange={isEditing ? (field, val) => setEditForm({ ...editForm, [field]: val }) : undefined}
                  saving={saving}
                  onSave={() => saveEdit(d)}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => deleteEntry(d)}
                  onEdit={() => openEdit(d)}
                />
              );
            });
          })()}
        </div>
      </div>

      {/* Certificates list */}
      {certificates.length > 0 && (
        <div className="card">
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Meus Atestados</p>
          <div className="space-y-1.5">
            {certificates.map((cert) => {
              const canEdit = cert.createdById === userId;
              const label = cert.type === "PARTIAL"
                ? `Atestado ${cert.startTime}–${cert.endTime}`
                : (() => {
                    const start = cert.startDate?.split("T")[0] || "";
                    const end = cert.endDate?.split("T")[0] || "";
                    if (start === end) {
                      const [y, m, d] = start.split("-");
                      return `Atestado ${d}/${m}`;
                    }
                    const [, sm, sd] = start.split("-");
                    const [, em, ed] = end.split("-");
                    return `Atestado ${sd}/${sm} a ${ed}/${em}`;
                  })();

              return (
                <div key={cert.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--surface)" }}>
                    <FileText size={14} style={{ color: "var(--text-2)" }} />
                  </div>
                  <div className="flex-1">
                    <CertificateBadge
                      customLabel={label}
                      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                      por {cert.createdByName} · {new Date(cert.createdAt).toLocaleDateString("pt-BR")}
                      {cert.reason && <> · {cert.reason}</>}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEditCert(cert)} className="p-1 transition-colors" style={{ color: "var(--text-4)" }} title="Editar atestado">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => openDeleteCert(cert)} className="p-1 transition-colors" style={{ color: "var(--text-4)" }} title="Remover atestado">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Certificate Modal */}
      {showCertModal && (
        <div className="fixed z-50" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface border border-base rounded-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-lg" style={{ color: "var(--text)" }}>Registrar Atestado</h2>
                <button onClick={() => { setShowCertModal(false); resetCertFields(); }} className="text-3 hover:text-ink"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["PARTIAL", "FULL_DAY"] as const).map((st) => (
                    <button key={st} onClick={() => setCertSubType(st)}
                      className={clsx("flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                        certSubType === st ? "bg-accent-subtle border-accent text-accent" : "border-base text-2 hover:text-ink"
                      )}
                    >
                      {st === "PARTIAL" ? "Período do dia" : "Dias completos"}
                    </button>
                  ))}
                </div>

                {certSubType === "PARTIAL" ? (
                  <>
                    <div>
                      <label className="label">Data</label>
                      <input type="date" className="input" value={certDate} onChange={(e) => setCertDate(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Início da Ausência</label>
                        <input type="time" className="input" value={certStartTime} onChange={(e) => setCertStartTime(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Fim da Ausência</label>
                        <input type="time" className="input" value={certEndTime} onChange={(e) => setCertEndTime(e.target.value)} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Data Início</label>
                      <input type="date" className="input" value={certStartDate} onChange={(e) => setCertStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Data Fim</label>
                      <input type="date" className="input" value={certEndDate} onChange={(e) => setCertEndDate(e.target.value)} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Motivo (opcional)</label>
                  <textarea className="input resize-none" rows={2} value={certReason} onChange={(e) => setCertReason(e.target.value)} placeholder="Descreva o motivo..." />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowCertModal(false); resetCertFields(); }} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleCreateCert} disabled={certLoading} className="btn-primary flex-1">
                  {certLoading ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Certificate Modal */}
      {showEditCertModal && (
        <div className="fixed z-50" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface border border-base rounded-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-lg" style={{ color: "var(--text)" }}>Editar Atestado</h2>
                <button onClick={() => setShowEditCertModal(false)} className="text-3 hover:text-ink"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["PARTIAL", "FULL_DAY"] as const).map((st) => (
                    <button key={st} onClick={() => setEditCertSubType(st)}
                      className={clsx("flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                        editCertSubType === st ? "bg-accent-subtle border-accent text-accent" : "border-base text-2 hover:text-ink"
                      )}
                    >
                      {st === "PARTIAL" ? "Período do dia" : "Dias completos"}
                    </button>
                  ))}
                </div>

                {editCertSubType === "PARTIAL" ? (
                  <>
                    <div>
                      <label className="label">Data</label>
                      <input type="date" className="input" value={editCertDate} onChange={(e) => setEditCertDate(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Início da Ausência</label>
                        <input type="time" className="input" value={editCertStartTime} onChange={(e) => setEditCertStartTime(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Fim da Ausência</label>
                        <input type="time" className="input" value={editCertEndTime} onChange={(e) => setEditCertEndTime(e.target.value)} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Data Início</label>
                      <input type="date" className="input" value={editCertStartDate} onChange={(e) => setEditCertStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Data Fim</label>
                      <input type="date" className="input" value={editCertEndDate} onChange={(e) => setEditCertEndDate(e.target.value)} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Motivo (opcional)</label>
                  <textarea className="input resize-none" rows={2} value={editCertReason} onChange={(e) => setEditCertReason(e.target.value)} placeholder="Descreva o motivo..." />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditCertModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleEditCert} disabled={savingCert} className="btn-primary flex-1">
                  {savingCert ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Certificate Modal */}
      {showDeleteCertModal && (
        <div className="fixed z-50" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface border border-base rounded-2xl p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-lg" style={{ color: "var(--text)" }}>Confirmar exclusão</h2>
                <button onClick={() => setShowDeleteCertModal(false)} className="text-3 hover:text-ink"><X size={20} /></button>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text-2)" }}>
                Tem certeza que deseja remover este atestado? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteCertModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleDeleteCert} disabled={deletingCert} 
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50">
                  {deletingCert ? "Excluindo..." : "Remover"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
