"use client";

import { useState } from "react";
import { ClipboardList, Search, ChevronDown, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface AuditLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
  actor: { name: string; email: string };
  targetUser: { name: string; email: string } | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE_EMPLOYEE:    { label: "Criou funcionário",    color: "text-green-400 bg-green-400/10" },
  UPDATE_EMPLOYEE:    { label: "Editou funcionário",   color: "text-cyan-400 bg-cyan-400/10" },
  DEACTIVATE_EMPLOYEE:{ label: "Desativou funcionário",color: "text-red-400 bg-red-400/10" },
  UPDATE_ENTRY:       { label: "Editou registro",      color: "text-yellow-400 bg-yellow-400/10" },
  ADD_ADJUSTMENT:     { label: "Ajuste banco de horas",color: "text-purple-400 bg-purple-400/10" },
  CHANGE_MODE:        { label: "Alterou modo horas",   color: "text-orange-400 bg-orange-400/10" },
};

export default function AuditClient({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actor.name.toLowerCase().includes(q) ||
      l.targetUser?.name.toLowerCase().includes(q) ||
      ACTION_LABELS[l.action]?.label.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-syne text-2xl font-bold text-base">Auditoria</h1>
        <p className="text-3 text-sm mt-0.5">
          Histórico de todas as alterações realizadas por gestores
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-3" />
        <input
          className="input pl-10"
          placeholder="Filtrar por ação, gestor ou funcionário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Log list */}
      <div className="card divide-y divide-line !p-0 overflow-hidden">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-4">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
            <p>Nenhum registro encontrado</p>
          </div>
        )}
        {filtered.map((log) => {
          const meta = ACTION_LABELS[log.action] ?? {
            label: log.action,
            color: "text-2 bg-surface-3",
          };
          const isExpanded = expanded === log.id;
          const date = new Date(log.createdAt);

          return (
            <div key={log.id} className="p-4 hover:bg-surface-2/40 transition-colors">
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : log.id)}
              >
                <span className={clsx("text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 mt-0.5", meta.color)}>
                  {meta.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-medium text-base">{log.actor.name}</span>
                    {log.targetUser && log.targetUser.email !== log.actor.email && (
                      <>
                        <ChevronRight size={12} className="text-4" />
                        <span className="text-2">{log.targetUser.name}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-3 mt-0.5">
                    {date.toLocaleDateString("pt-BR")} às{" "}
                    {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-3 shrink-0 mt-1" />
                ) : (
                  <ChevronRight size={16} className="text-3 shrink-0 mt-1" />
                )}
              </div>

              {isExpanded && (
                <div className="mt-3 ml-0 bg-surface rounded-xl p-4 text-xs font-mono text-2 overflow-x-auto">
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-4 text-center">
          Exibindo {filtered.length} de {logs.length} registros
        </p>
      )}
    </div>
  );
}
