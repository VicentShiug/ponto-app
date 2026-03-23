"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Plus, Search, ChevronRight, UserX, UserCheck,
  Edit2, X, Check,
} from "lucide-react";
import { toast } from "@/components/Toaster";

interface Employee {
  id: string;
  name: string;
  email: string;
  weeklyHours: number;
  overtimeMode: string;
  active: boolean;
  createdAt: string;
}

interface Props {
  employees: Employee[];
}

interface FormData {
  name: string;
  email: string;
  password: string;
  weeklyHours: string;
  overtimeMode: "HOUR_BANK" | "OVERTIME";
}

const EMPTY_FORM: FormData = {
  name: "",
  email: "",
  password: "",
  weeklyHours: "40",
  overtimeMode: "HOUR_BANK",
};

export default function EmployeesClient({ employees: initial }: Props) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initial);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      email: emp.email,
      password: "",
      weeklyHours: String(emp.weeklyHours),
      overtimeMode: emp.overtimeMode as "HOUR_BANK" | "OVERTIME",
    });
    setShowModal(true);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const url = editingId ? `/api/manager/employees/${editingId}` : "/api/manager/employees";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Erro ao salvar", "error"); return; }
      toast(editingId ? "Funcionário atualizado!" : "Funcionário criado!", "success");
      setShowModal(false);
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
    finally { setLoading(false); }
  }

  async function toggleActive(emp: Employee) {
    try {
      const res = await fetch(`/api/manager/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !emp.active }),
      });
      if (!res.ok) { toast("Erro ao alterar status", "error"); return; }
      toast(emp.active ? "Funcionário desativado" : "Funcionário reativado", "success");
      router.refresh();
    } catch { toast("Erro de conexão", "error"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-base">Funcionários</h1>
          <p className="text-3 text-sm mt-0.5">{employees.filter(e => e.active).length} ativos</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-3" />
        <input
          className="input pl-9"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtered.map((emp) => (
          <div key={emp.id} className={clsx("card flex items-center gap-4", !emp.active && "opacity-50")}>
            <div className="w-10 h-10 bg-surface-3 rounded-full flex items-center justify-center shrink-0">
              <span className="font-bold text-ink-2 text-sm">{emp.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-base truncate">{emp.name}</p>
                {!emp.active && (
                  <span className="text-[10px] bg-surface-3 text-2 px-2 py-0.5 rounded-full">inativo</span>
                )}
              </div>
              <p className="text-xs text-3 truncate">{emp.email} · {emp.weeklyHours}h/sem · {emp.overtimeMode === "HOUR_BANK" ? "Banco" : "Extra"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => openEdit(emp)} className="p-2 text-2 hover:text-base hover:bg-surface-3 rounded-lg transition-all">
                <Edit2 size={15} />
              </button>
              <button onClick={() => toggleActive(emp)} className={clsx("p-2 rounded-lg transition-all", emp.active ? "text-red-400 hover:bg-red-400/10" : "text-green-400 hover:bg-green-400/10")}>
                {emp.active ? <UserX size={15} /> : <UserCheck size={15} />}
              </button>
              <Link href={`/manager/employees/${emp.id}`} className="p-2 text-2 hover:text-base hover:bg-surface-3 rounded-lg transition-all">
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-base/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-base rounded-2xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-syne font-bold text-lg text-base">
                {editingId ? "Editar Funcionário" : "Novo Funcionário"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-3 hover:text-base">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Nome</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
              </div>
              <div>
                <label className="label">{editingId ? "Nova Senha (deixe vazio para não alterar)" : "Senha"}</label>
                <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Carga Semanal (h)</label>
                  <input className="input" type="number" min="1" max="60" value={form.weeklyHours} onChange={(e) => setForm({ ...form, weeklyHours: e.target.value })} />
                </div>
                <div>
                  <label className="label">Modo</label>
                  <select className="input" value={form.overtimeMode} onChange={(e) => setForm({ ...form, overtimeMode: e.target.value as any })}>
                    <option value="HOUR_BANK">Banco de Horas</option>
                    <option value="OVERTIME">Hora Extra</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
