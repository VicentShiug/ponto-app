"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Plus, Search, Edit2, X, Check, Trash2 } from "lucide-react";
import { toast } from "@/components/Toaster";
import { EmptyState } from "@/components/EmptyState";

interface Manager {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Props {
  managers: Manager[];
}

interface FormData {
  name: string;
  email: string;
  password?: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  email: "",
  password: "",
};

export default function ManagersClient({ managers: initial }: Props) {
  const router = useRouter();
  const [managers, setManagers] = useState(initial);
  const [search, setSearch] = useState("");
  
  // Create / Edit states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  // Delete states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingManager, setDeletingManager] = useState<Manager | null>(null);

  useEffect(() => {
    if (showModal || showDeleteModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal, showDeleteModal]);

  const filtered = managers.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(manager: Manager) {
    setEditingId(manager.id);
    setForm({
      name: manager.name,
      email: manager.email,
      password: "",
    });
    setShowModal(true);
  }

  function openDelete(manager: Manager) {
    setDeletingManager(manager);
    setShowDeleteModal(true);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const url = editingId ? `/api/admin/managers/${editingId}` : "/api/admin/managers";
      const method = editingId ? "PATCH" : "POST";

      const payload = { ...form };
      if (editingId && !payload.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error || "Erro ao salvar", "error");
        return;
      }

      toast(editingId ? "Gestor atualizado!" : "Gestor criado!", "success");
      setShowModal(false);
      
      if (editingId) {
        setManagers((prev) => prev.map((m) => (m.id === editingId ? data.user : m)));
      } else {
        setManagers((prev) => [data.user, ...prev]);
      }
      
      router.refresh();
    } catch { 
      toast("Erro de conexão", "error"); 
    } finally { 
      setLoading(false); 
    }
  }

  async function handleDelete() {
    if (!deletingManager) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/managers/${deletingManager.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      
      if (!res.ok) {
        toast(data.error || "Erro ao remover", "error");
        return;
      }

      toast("Gestor removido com sucesso", "success");
      setShowDeleteModal(false);
      setManagers((prev) => prev.filter((m) => m.id !== deletingManager.id));
      router.refresh();
    } catch { 
      toast("Erro de conexão", "error"); 
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold" style={{ color: "var(--text)" }}>Gerenciamento de Gestores</h1>
          <p className="text-3 text-sm mt-0.5">{managers.length} gestores cadastrados</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo Gestor
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
        {filtered.length === 0 && (
          <EmptyState 
            message="Nenhum gestor encontrado." 
            submessage="Adicione um gestor para começar." 
          />
        )}
        {filtered.map((manager) => (
          <div key={manager.id} className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-surface-3 rounded-full flex items-center justify-center shrink-0">
              <span className="font-bold text-ink-2 text-sm">{manager.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate" style={{ color: "var(--text)" }}>{manager.name}</p>
              </div>
              <p className="text-xs text-3 truncate">{manager.email} · Criado em {new Date(manager.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => openEdit(manager)} 
                className="p-2 text-2 hover:text-ink hover:bg-surface-3 rounded-lg transition-all"
                title="Editar"
              >
                <Edit2 size={15} />
              </button>
              <button 
                onClick={() => openDelete(manager)} 
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                title="Remover"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal - Create/Edit */}
      {showModal && (
        <div className="fixed z-50 flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md bg-surface border border-base rounded-2xl p-6 animate-fade-in relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-syne font-bold text-lg" style={{ color: "var(--text)" }}>
                {editingId ? "Editar Gestor" : "Novo Gestor"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-3 hover:text-ink">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Nome</label>
                <input 
                  className="input" 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  placeholder="Nome completo" 
                />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input 
                  className="input" 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  placeholder="email@empresa.com" 
                />
              </div>
              <div>
                <label className="label">{editingId ? "Nova Senha (opcional)" : "Senha (obrigatório)"}</label>
                <input 
                  className="input" 
                  type="password" 
                  value={form.password} 
                  onChange={(e) => setForm({ ...form, password: e.target.value })} 
                  placeholder="••••••••" 
                />
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

      {/* Modal - Delete */}
      {showDeleteModal && deletingManager && (
        <div className="fixed z-50 flex items-center justify-center p-4" style={{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm bg-surface border border-base rounded-2xl p-6 animate-fade-in relative">
            <h2 className="font-syne font-bold text-lg text-red-500 mb-2">Remover Gestor?</h2>
            
            <p className="text-sm text-2 mb-6">
              Tem certeza que deseja remover o gestor <strong>{deletingManager.name}</strong>?
              Esta ação removerá todos os dados vinculados a ele.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleDelete} disabled={loading} className="btn-primary !bg-red-500 !text-white hover:!bg-red-600 flex-1 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}
                {loading ? "Removendo" : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
