"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  TrendingUp, TrendingDown, Plus, Minus, Edit2, Check, X, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/Toaster";
import { formatMinutes } from "@/lib/hours";

interface Entry {
  id: string; date: string;
  clockIn: string; lunchOut: string; lunchIn: string; clockOut: string;
  workedMinutes: number; expectedMinutes: number;
  rawClockIn: string | null; rawLunchOut: string | null;
  rawLunchIn: string | null; rawClockOut: string | null;
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
  expectedPerDay: number;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function EmployeeDetailClient({
  employee, entries, adjustments, balanceMinutes, balanceLabel, expectedPerDay,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"entries" | "adjustments">("entries");
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjMinutes, setAdjMinutes] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjType, setAdjType] = useState<"add" | "remove">("add");
  const [loading, setLoading] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState({ clockIn: "", lunchOut: "", lunchIn: "", clockOut: "" });

  const positive = balanceMinutes >= 0;

  async function handleAdjustment() {
    const mins = parseInt(adjMinutes);
    if (!mins || !adjReason.trim()) { toast("Preencha todos os campos", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/employees/${employee.id}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: adjType === "add" ? mins : -mins, reason: adjReason }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro", "error"); return; }
      toast("Ajuste registrado!", "success");
      setShowAdjModal(false);
      setAdjMinutes(""); setAdjReason("");
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/manager/employees" className="p-2 text-2 hover:text-base hover:bg-surface-2 rounded-xl transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-syne text-2xl font-bold text-base">{employee.name}</h1>
          <p className="text-3 text-sm">{employee.email} · {employee.weeklyHours}h/sem</p>
        </div>
      </div>

      {/* Saldo card */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center", positive ? "bg-green-400/10" : "bg-red-400/10")}>
            {positive ? <TrendingUp size={22} className="text-green-400" /> : <TrendingDown size={22} className="text-red-400" />}
          </div>
          <div>
            <p className="text-xs text-3 uppercase tracking-widest">
              {employee.overtimeMode === "HOUR_BANK" ? "Banco de Horas" : "Horas Extras"}
            </p>
            <p className={clsx("font-syne text-3xl font-bold", positive ? "text-green-400" : "text-red-400")}>
              {balanceLabel}
            </p>
          </div>
        </div>
        <button onClick={() => setShowAdjModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
          <Plus size={15} /> Ajustar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface border border-base rounded-2xl w-fit">
        {(["entries", "adjustments"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx("px-4 py-2 rounded-xl text-sm font-medium transition-all",
              tab === t ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20" : "text-2 hover:text-base"
            )}
          >
            {t === "entries" ? `Registros (${entries.length})` : `Ajustes (${adjustments.length})`}
          </button>
        ))}
      </div>

      {tab === "entries" && (
        <div className="space-y-2">
          {entries.map((entry) => {
            const d = new Date(entry.date);
            const diff = entry.workedMinutes - entry.expectedMinutes;
            const isEditing = editEntry?.id === entry.id;
            return (
              <div key={entry.id} className="card">
                <div className="flex items-center gap-3">
                  <div className="text-center w-10 shrink-0">
                    <p className="text-[10px] text-3 uppercase">{WEEKDAYS[d.getDay()]}</p>
                    <p className="font-syne font-bold text-base">{d.getDate().toString().padStart(2, "0")}/{(d.getMonth()+1).toString().padStart(2,"0")}</p>
                  </div>
                  {isEditing ? (
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      {["clockIn","lunchOut","lunchIn","clockOut"].map((field) => (
                        <div key={field}>
                          <p className="text-[9px] text-3 uppercase mb-0.5">
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
                    <div className="flex-1 grid grid-cols-4 gap-1 text-center">
                      {[entry.clockIn, entry.lunchOut, entry.lunchIn, entry.clockOut].map((t, i) => (
                        <div key={i}>
                          <p className="text-[9px] text-4 uppercase">{["Entrada","Almoço","Volta","Saída"][i]}</p>
                          <p className="text-xs text-ink-2 font-medium">{t}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-right w-14 shrink-0">
                    <p className="font-syne text-sm font-bold text-base">{formatMinutes(entry.workedMinutes)}</p>
                    {entry.clockOut !== "--:--" && (
                      <p className={clsx("text-[10px]", diff >= 0 ? "text-green-400" : "text-red-400")}>
                        {diff >= 0 ? "+" : ""}{formatMinutes(diff)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={saveEditEntry} disabled={loading} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditEntry(null)} className="p-1.5 text-3 hover:bg-surface-3 rounded-lg">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => openEditEntry(entry)} className="p-1.5 text-3 hover:text-base hover:bg-surface-3 rounded-lg">
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
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", adj.minutes >= 0 ? "bg-green-400/10" : "bg-red-400/10")}>
                {adj.minutes >= 0 ? <Plus size={16} className="text-green-400" /> : <Minus size={16} className="text-red-400" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-base">{adj.reason}</p>
                <p className="text-xs text-3">por {adj.managerName} · {new Date(adj.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
              <p className={clsx("font-syne font-bold", adj.minutes >= 0 ? "text-green-400" : "text-red-400")}>
                {adj.minutes >= 0 ? "+" : ""}{formatMinutes(adj.minutes)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Adjustment modal */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-base/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface border border-base rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-syne font-bold text-lg">Ajustar Banco de Horas</h2>
              <button onClick={() => setShowAdjModal(false)} className="text-3 hover:text-base"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                {(["add","remove"] as const).map((t) => (
                  <button key={t} onClick={() => setAdjType(t)}
                    className={clsx("flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-2",
                      adjType === t
                        ? t === "add" ? "bg-green-400/10 border-green-400/20 text-green-400" : "bg-red-400/10 border-red-400/20 text-red-400"
                        : "border-base text-2 hover:text-base"
                    )}
                  >
                    {t === "add" ? <><Plus size={14} /> Adicionar</> : <><Minus size={14} /> Descontar</>}
                  </button>
                ))}
              </div>
              <div>
                <label className="label">Quantidade (minutos)</label>
                <input className="input" type="number" min="1" value={adjMinutes}
                  onChange={(e) => setAdjMinutes(e.target.value)} placeholder="ex: 60 = 1 hora" />
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
      )}
    </div>
  );
}
