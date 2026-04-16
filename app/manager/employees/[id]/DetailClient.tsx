"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  TrendingUp, TrendingDown, Plus, Minus, Edit2, Check, X, ArrowLeft, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/Toaster";
import { useTheme } from "@/components/ThemeProvider";
import { formatMinutes } from "@/lib/hours";
import { getDay, getDate, getMonth, parseDateFromAPI } from "@/lib/dates";

interface Entry {
  id: string; date: string;
  clockIn: string; lunchOut: string; lunchIn: string; clockOut: string;
  workedMinutes: number; expectedMinutes: number;
  rawClockIn: string | null; rawLunchOut: string | null;
  rawLunchIn: string | null; rawClockOut: string | null;
  holiday?: { name: string } | null;
}

interface Adjustment {
  id: string; minutes: number; reason: string;
  managerName: string; createdAt: string;
}

interface Props {
  employee: { id: string; name: string; email: string; weeklyHours: number; overtimeMode: string };
  entries: Entry[];
  adjustments: Adjustment[];
  balanceMinutes: number;
  balanceLabel: string;
  monthLabel: string;
  monthBalanceLabel: string;
  currentYear: number;
  currentMonth: number;
  expectedPerDay: number;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function EmployeeDetailClient({
  employee, entries, adjustments, balanceMinutes, balanceLabel, monthLabel, monthBalanceLabel, currentYear, currentMonth, expectedPerDay,
}: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const [tab, setTab] = useState<"entries" | "adjustments">("entries");
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjHours, setAdjHours] = useState("");
  const [adjMinutes, setAdjMinutes] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjType, setAdjType] = useState<"add" | "remove">("add");
  const [loading, setLoading] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // states for edit/delete adjustments
  const [showDeleteAdjModal, setShowDeleteAdjModal] = useState(false);
  const [deletingAdj, setDeletingAdj] = useState(false);
  const [selectedAdj, setSelectedAdj] = useState<Adjustment | null>(null);

  const [showEditAdjModal, setShowEditAdjModal] = useState(false);
  const [editingAdj, setEditingAdj] = useState<Adjustment | null>(null);
  const [editAdjHours, setEditAdjHours] = useState("");
  const [editAdjMinutes, setEditAdjMinutes] = useState("");
  const [editAdjReason, setEditAdjReason] = useState("");
  const [editAdjType, setEditAdjType] = useState<"add" | "remove">("add");
  const [savingAdj, setSavingAdj] = useState(false);

  // states for edit employee
  const [emp, setEmp] = useState(employee);
  const [showEditEmpModal, setShowEditEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState({
    name: employee.name,
    email: employee.email,
    password: "",
    weeklyHours: String(employee.weeklyHours),
    overtimeMode: employee.overtimeMode as "HOUR_BANK" | "OVERTIME",
  });
  const [savingEmp, setSavingEmp] = useState(false);

  function goToMonth(year: number, month: number) {
    router.push(`/manager/employees/${employee.id}?year=${year}&month=${month}`);
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
  const [editForm, setEditForm] = useState({ clockIn: "", lunchOut: "", lunchIn: "", clockOut: "" });

  useEffect(() => {
    if (showAdjModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAdjModal]);

  const positive = balanceMinutes >= 0;

  async function handleAdjustment() {
    const hours = parseInt(adjHours) || 0;
    const mins = parseInt(adjMinutes) || 0;
    const totalMinutes = hours * 60 + mins;
    if (!totalMinutes || !adjReason.trim()) { toast("Preencha todos os campos", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/employees/${employee.id}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: adjType === "add" ? totalMinutes : -totalMinutes, reason: adjReason }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro", "error"); return; }
      toast("Ajuste registrado!", "success");
      setShowAdjModal(false);
      setAdjHours(""); setAdjMinutes(""); setAdjReason("");
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setLoading(false); }
  }

  function openEditEntry(entry: Entry) {
    setEditEntry(entry);
    setEditForm({
      clockIn: entry.rawClockIn ? new Date(entry.rawClockIn).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
      lunchOut: entry.rawLunchOut ? new Date(entry.rawLunchOut).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
      lunchIn: entry.rawLunchIn ? new Date(entry.rawLunchIn).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
      clockOut: entry.rawClockOut ? new Date(entry.rawClockOut).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
    });
  }

  async function saveEditEntry() {
    if (!editEntry) return;
    setLoading(true);
    const date = editEntry.date.split("T")[0];
    function buildDateTime(time: string) {
      if (!time) return null;
      return `${date}T${time}:00`;
    }
    try {
      const res = await fetch(`/api/manager/entries/${editEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockIn: buildDateTime(editForm.clockIn),
          lunchOut: buildDateTime(editForm.lunchOut),
          lunchIn: buildDateTime(editForm.lunchIn),
          clockOut: buildDateTime(editForm.clockOut),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao editar", "error"); return; }
      toast("Registro atualizado!", "success");
      setEditEntry(null);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setLoading(false); }
  }

  async function handleDeleteAllEntries() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/manager/employees/${employee.id}/entries`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao excluir", "error"); return; }
      toast(`${data.deletedCount} registros excluídos!`, "success");
      setShowDeleteModal(false);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setDeleting(false); }
  }

  function openDeleteAdj(adj: Adjustment) {
    setSelectedAdj(adj);
    setShowDeleteAdjModal(true);
  }

  async function handleDeleteAdj() {
    if (!selectedAdj) return;
    setDeletingAdj(true);
    try {
      const res = await fetch(`/api/manager/hour-bank/${selectedAdj.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao excluir ajuste", "error"); return; }
      toast("Ajuste removido!", "success");
      setShowDeleteAdjModal(false);
      setSelectedAdj(null);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setDeletingAdj(false); }
  }

  function openEditAdj(adj: Adjustment) {
    setEditingAdj(adj);
    const absMinutes = Math.abs(adj.minutes);
    setEditAdjHours(Math.floor(absMinutes / 60).toString());
    setEditAdjMinutes((absMinutes % 60).toString());
    setEditAdjReason(adj.reason);
    setEditAdjType(adj.minutes >= 0 ? "add" : "remove");
    setShowEditAdjModal(true);
  }

  async function handleEditAdj() {
    if (!editingAdj) return;
    const hours = parseInt(editAdjHours) || 0;
    const mins = parseInt(editAdjMinutes) || 0;
    const totalMinutes = hours * 60 + mins;
    if (!totalMinutes || !editAdjReason.trim()) { toast("Preencha todos os campos", "error"); return; }

    setSavingAdj(true);
    try {
      const res = await fetch(`/api/manager/hour-bank/${editingAdj.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes: editAdjType === "add" ? totalMinutes : -totalMinutes,
          reason: editAdjReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao editar ajuste", "error"); return; }
      toast("Ajuste editado!", "success");
      setShowEditAdjModal(false);
      setEditingAdj(null);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setSavingAdj(false); }
  }

  async function handleEditEmployee() {
    setSavingEmp(true);
    try {
      const res = await fetch(`/api/manager/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...empForm,
          weeklyHours: Number(empForm.weeklyHours),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao editar funcionário", "error"); return; }
      toast("Dados atualizados!", "success");
      setEmp(data.user);
      setShowEditEmpModal(false);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setSavingEmp(false); }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/manager/employees" className="p-2 text-2 hover:text-ink hover:bg-surface-2 rounded-xl transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-syne text-2xl font-bold" style={{ color: "var(--text)" }}>{emp.name}</h1>
          <p className="text-3 text-sm">{emp.email} · {emp.weeklyHours}h/sem</p>
        </div>
      </div>

      {/* Saldo card */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center", 
            positive ? (theme === "dark" ? "bg-green-500/15" : "bg-green-600/15") : (theme === "dark" ? "bg-red-500/15" : "bg-red-600/15")
          )}>
            {positive ? <TrendingUp size={22} className={theme === "dark" ? "text-green-400" : "text-green-600"} /> : <TrendingDown size={22} className={theme === "dark" ? "text-red-400" : "text-red-600"} />}
          </div>
          <div>
            <p className="text-xs text-3 uppercase tracking-widest">
              {emp.overtimeMode === "HOUR_BANK" ? "Banco de Horas" : "Horas Extras"}
            </p>
            <div className="flex items-baseline gap-2">
              <p className={clsx("font-syne text-3xl font-bold", positive ? (theme === "dark" ? "text-green-400" : "text-green-600") : (theme === "dark" ? "text-red-400" : "text-red-600"))}>
                {balanceLabel}
              </p>
              <span className="text-xs" style={{ color: "var(--accent)" }}>
                deste mês: {monthBalanceLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEditEmpModal(true)} className="btn-secondary flex items-center gap-2 text-sm px-3">
            <Edit2 size={15} /> Editar
          </button>
          <button onClick={() => setShowAdjModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Plus size={15} /> Ajustar
          </button>
        </div>
      </div>

      {tab === "entries" && entries.length > 0 && (
        <div className="flex justify-end">
          <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all">
            <Trash2 size={15} /> Apagar todos os registros
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-surface border border-base rounded-2xl w-fit">
          {(["entries", "adjustments"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx("px-4 py-2 rounded-xl text-sm font-medium transition-all",
                tab === t ? "bg-accent-subtle text-accent border-accent" : "text-2 hover:text-ink"
              )}
            >
              {t === "entries" ? `Registros (${entries.length})` : `Ajustes (${adjustments.length})`}
            </button>
          ))}
        </div>
        {tab === "entries" && (
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors" style={{ color: "var(--text-3)" }}>
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium capitalize" style={{ color: "var(--text-2)" }}>{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors" style={{ color: "var(--text-3)" }}>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {tab === "entries" && (
        <div className="space-y-2">
          {entries.length === 0 && (
            <div className="card text-center py-8 text-sm" style={{ color: "var(--text-3)" }}>
              Nenhum registro neste mês
            </div>
          )}
          {entries.map((entry) => {
            const d = parseDateFromAPI(entry.date);
            const diff = entry.workedMinutes - entry.expectedMinutes;
            const isEditing = editEntry?.id === entry.id;
            return (
              <div key={entry.id} className="card relative overflow-hidden" style={entry.holiday ? { backgroundColor: "var(--accent-subtle)", borderColor: "var(--accent-border)" } : {}}>
                {entry.holiday && (
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg, var(--accent), var(--accent) 10px, transparent 10px, transparent 20px)" }} />
                )}
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-28 shrink-0 flex flex-col items-start justify-center">
                    <p className="text-[10px] text-3 uppercase mb-0.5">{WEEKDAYS[getDay(d)]}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-syne font-bold" style={{ color: "var(--text)" }}>
                        {getDate(d).toString().padStart(2, "0")}/{(getMonth(d)+1).toString().padStart(2,"0")}
                      </p>
                      {entry.holiday && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-subtle text-accent border border-accent">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                          Feriado
                        </span>
                      )}
                    </div>
                    {entry.holiday && (
                      <p className="text-[9px] mt-1 leading-tight text-gray-500 line-clamp-1" title={entry.holiday.name}>
                        {entry.holiday.name}
                      </p>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      {["clockIn","lunchOut","lunchIn","clockOut"].map((field) => (
                        <div key={field}>
                          <p className="text-[10px] font-medium text-3 uppercase mb-0.5">
                            {field === "clockIn" ? "Entrada" : field === "lunchOut" ? "Saída Alm." : field === "lunchIn" ? "Volta Alm." : "Saída"}
                          </p>
                          <input type="time" className="input py-1.5 text-xs"
                            value={editForm[field as keyof typeof editForm]}
                            onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 grid grid-cols-4 gap-2 text-center">
                      {[entry.clockIn, entry.lunchOut, entry.lunchIn, entry.clockOut].map((t, i) => (
                        <div key={i}>
                          <p className="text-[10px] font-medium text-3 uppercase">{["Entrada","Almoço","Volta","Saída"][i]}</p>
                          <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>{t}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-right shrink-0 min-w-[4.5rem] whitespace-nowrap">
                    <p className="font-syne text-sm font-bold" style={{ color: "var(--text)" }}>{formatMinutes(entry.workedMinutes)}</p>
                    {entry.clockOut !== "--:--" && (
                      <p 
                        className={clsx("text-xs cursor-help", diff >= 0 ? (theme === "dark" ? "text-green-400" : "text-green-600") : (theme === "dark" ? "text-red-400" : "text-red-600"))}
                        title={entry.holiday ? "Horas em feriado contam como extra" : undefined}
                      >
                        {diff >= 0 ? "+" : ""}{formatMinutes(diff)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={saveEditEntry} disabled={loading} className={clsx("p-1.5 rounded-lg", theme === "dark" ? "text-green-400 hover:bg-green-400/10" : "text-green-600 hover:bg-green-600/10")}>
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditEntry(null)} className="p-1.5 text-3 hover:bg-surface-3 rounded-lg">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => openEditEntry(entry)} className="p-1.5 text-3 hover:text-ink hover:bg-surface-3 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "adjustments" && (
        <div className="space-y-2">
          {adjustments.length === 0 && <div className="card text-center py-8 text-3">Nenhum ajuste registrado.</div>}
          {adjustments.map((adj) => (
            <div key={adj.id} className="card flex items-center gap-4">
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", 
                adj.minutes >= 0 ? (theme === "dark" ? "bg-green-500/15" : "bg-green-600/15") : (theme === "dark" ? "bg-red-500/15" : "bg-red-600/15")
              )}>
                {adj.minutes >= 0 ? <Plus size={16} className={theme === "dark" ? "text-green-400" : "text-green-600"} /> : <Minus size={16} className={theme === "dark" ? "text-red-400" : "text-red-600"} />}
              </div>
              <div className="flex-1">
                <p className="text-sm" style={{ color: "var(--text)" }}>{adj.reason}</p>
                <p className="text-xs text-3">por {adj.managerName} · {new Date(adj.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
              <p className={clsx("font-syne font-bold", adj.minutes >= 0 ? (theme === "dark" ? "text-green-400" : "text-green-600") : (theme === "dark" ? "text-red-400" : "text-red-600"))}>
                {adj.minutes >= 0 ? "+" : ""}{formatMinutes(adj.minutes)}
              </p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEditAdj(adj)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Editar ajuste"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => openDeleteAdj(adj)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remover ajuste"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjustment modal */}
      {showAdjModal && (
        <div className="fixed z-50" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface border border-base rounded-2xl p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-lg">Ajustar Banco de Horas</h2>
                <button onClick={() => setShowAdjModal(false)} className="text-3 hover:text-ink"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["add","remove"] as const).map((t) => (
                    <button key={t} onClick={() => setAdjType(t)}
                      className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2",
                        adjType === t
                          ? t === "add"
                            ? theme === "dark" ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-green-600/15 border-green-600/30 text-green-600"
                            : theme === "dark" ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-red-600/15 border-red-600/30 text-red-600"
                          : "border-base text-2 hover:text-ink"
                      )}
                    >
                      {t === "add" ? <><Plus size={14} /> Adicionar</> : <><Minus size={14} /> Descontar</>}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Horas</label>
                    <input className="input" type="number" min="0" value={adjHours}
                      onChange={(e) => setAdjHours(e.target.value)} placeholder="ex: 2" />
                  </div>
                  <div>
                    <label className="label">Minutos</label>
                    <input className="input" type="number" min="0" max="59" value={adjMinutes}
                      onChange={(e) => setAdjMinutes(e.target.value)} placeholder="ex: 30" />
                  </div>
                </div>
                <div>
                  <label className="label">Motivo</label>
                  <textarea className="input resize-none" rows={3} value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)} placeholder="Descreva o motivo do ajuste..." />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAdjModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleAdjustment} disabled={loading} className="btn-primary flex-1">
                  {loading ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed z-50" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface border border-base rounded-2xl p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-lg" style={{ color: "var(--text)" }}>Confirmar exclusão</h2>
                <button onClick={() => setShowDeleteModal(false)} className="text-3 hover:text-ink"><X size={20} /></button>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text-2)" }}>
                Tem certeza que deseja apagar <strong>todos os {entries.length} registros</strong> de <strong>{employee.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleDeleteAllEntries} disabled={deleting} 
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50">
                  {deleting ? "Excluindo..." : "Confirmar exclusão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditAdjModal && (
        <div className="fixed z-50" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface border border-base rounded-2xl p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-lg" style={{ color: "var(--text)" }}>Editar Ajuste</h2>
                <button onClick={() => setShowEditAdjModal(false)} className="text-3 hover:text-ink"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["add","remove"] as const).map((t) => (
                    <button key={t} onClick={() => setEditAdjType(t)}
                      className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2",
                        editAdjType === t
                          ? t === "add"
                            ? theme === "dark" ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-green-600/15 border-green-600/30 text-green-600"
                            : theme === "dark" ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-red-600/15 border-red-600/30 text-red-600"
                          : "border-base text-2 hover:text-ink"
                      )}
                    >
                      {t === "add" ? <><Plus size={14} /> Adicionar</> : <><Minus size={14} /> Descontar</>}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Horas</label>
                    <input className="input" type="number" min="0" value={editAdjHours}
                      onChange={(e) => setEditAdjHours(e.target.value)} placeholder="ex: 2" />
                  </div>
                  <div>
                    <label className="label">Minutos</label>
                    <input className="input" type="number" min="0" max="59" value={editAdjMinutes}
                      onChange={(e) => setEditAdjMinutes(e.target.value)} placeholder="ex: 30" />
                  </div>
                </div>
                <div>
                  <label className="label">Motivo</label>
                  <textarea className="input resize-none" rows={3} value={editAdjReason}
                    onChange={(e) => setEditAdjReason(e.target.value)} placeholder="Descreva o motivo do ajuste..." />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditAdjModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleEditAdj} disabled={savingAdj} className="btn-primary flex-1">
                  {savingAdj ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteAdjModal && (
        <div className="fixed z-50" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface border border-base rounded-2xl p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-lg" style={{ color: "var(--text)" }}>Confirmar exclusão</h2>
                <button onClick={() => setShowDeleteAdjModal(false)} className="text-3 hover:text-ink"><X size={20} /></button>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text-2)" }}>
                Tem certeza que deseja remover este ajuste? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteAdjModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleDeleteAdj} disabled={deletingAdj} 
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50">
                  {deletingAdj ? "Excluindo..." : "Remover"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEditEmpModal && (
        <div className="fixed z-50" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface border border-base rounded-2xl p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-lg" style={{ color: "var(--text)" }}>Editar Funcionário</h2>
                <button onClick={() => setShowEditEmpModal(false)} className="text-3 hover:text-ink"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Nome</label>
                  <input className="input" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} placeholder="Nome completo" />
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input className="input" type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} placeholder="email@empresa.com" />
                </div>
                <div>
                  <label className="label">Nova Senha (deixe vazio para manter)</label>
                  <input className="input" type="password" value={empForm.password} onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })} placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Carga Semanal (h)</label>
                    <input className="input" type="number" min="1" max="60" value={empForm.weeklyHours} onChange={(e) => setEmpForm({ ...empForm, weeklyHours: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Modo</label>
                    <select className="input" value={empForm.overtimeMode} onChange={(e) => setEmpForm({ ...empForm, overtimeMode: e.target.value as any })}>
                      <option value="HOUR_BANK">Banco de Horas</option>
                      <option value="OVERTIME">Hora Extra</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEditEmpModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleEditEmployee} disabled={savingEmp} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {savingEmp ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                  {savingEmp ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
