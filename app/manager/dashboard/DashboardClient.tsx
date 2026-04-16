"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, CheckCircle2, AlertCircle, XCircle, TrendingUp, TrendingDown, Search, ChevronRight } from "lucide-react";
import { formatMinutes } from "@/lib/hours";
import { parseZonedStart } from "@/lib/dates";
import { EmptyState } from "@/components/EmptyState";

interface Employee {
  id: string; name: string; email: string; weeklyHours: number;
  overtimeMode: string; balanceMinutes: number; balanceLabel: string;
  todayStatus: "present" | "absent" | "incomplete";
}
interface Props {
  employees: Employee[];
  summary: { present: number; incomplete: number; absent: number; total: number };
  today: string;
  todayHoliday?: { name: string } | null;
}

export default function ManagerDashboardClient({ employees, summary, today, todayHoliday }: Props) {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)) &&
      (statusFilter === "all" || e.todayStatus === statusFilter)
    );
  });

  const d = parseZonedStart(today);
  const statusLabels: Record<string, string> = { present: "Presente", incomplete: "Incompleto", absent: "Ausente" };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-syne text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
          {d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {todayHoliday && (
        <div className="rounded-xl px-4 py-3 bg-accent-subtle text-accent flex items-center gap-2 text-sm font-medium border border-accent">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          Hoje é feriado: {todayHoliday.name}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: summary.total,      icon: <Users size={18} /> },
          { label: "Presentes",   value: summary.present,    icon: <CheckCircle2 size={18} /> },
          { label: "Incompletos", value: summary.incomplete, icon: <AlertCircle size={18} /> },
          { label: "Ausentes",    value: summary.absent,     icon: <XCircle size={18} /> },
        ].map((c) => (
          <div key={c.label} className="card flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)" }}>
              {c.icon}
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>{c.label}</p>
              <p className="font-syne text-2xl font-bold" style={{ color: "var(--text)" }}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
          <input className="input pl-9" placeholder="Buscar funcionário..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {["all","present","incomplete","absent"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                backgroundColor: statusFilter === s ? "var(--accent-subtle)" : "var(--surface-2)",
                color: statusFilter === s ? "var(--accent)" : "var(--text-3)",
                border: statusFilter === s ? "1px solid var(--accent-border)" : "1px solid var(--border)",
              }}
            >
              {s === "all" ? "Todos" : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && <EmptyState message="Nenhum funcionário encontrado." />}
        {filtered.map((emp) => (
          <Link
            key={emp.id}
            href={`/manager/employees/${emp.id}`}
            className="card flex items-center gap-4 transition-all group"
            style={{ textDecoration: "none" }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm" style={{ backgroundColor: "var(--surface-3)", color: "var(--text-2)" }}>
              {emp.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: "var(--text)" }}>{emp.name}</p>
              <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>{emp.email}</p>
            </div>
            <div className="text-right shrink-0 hidden sm:block">
              <p className="text-[9px] uppercase" style={{ color: "var(--text-3)" }}>{emp.overtimeMode === "HOUR_BANK" ? "Banco" : "Extra"}</p>
              <div className="flex items-center gap-1 justify-end" style={{ color: emp.balanceMinutes >= 0 ? "var(--accent)" : "var(--text-3)" }}>
                {emp.balanceMinutes >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span className="font-syne font-bold text-sm">{emp.balanceLabel}</span>
              </div>
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full hidden sm:inline"
              style={{
                backgroundColor: emp.todayStatus === "present" ? "var(--accent-subtle)" : "var(--surface-2)",
                color: emp.todayStatus === "present" ? "var(--accent)" : "var(--text-3)",
                border: `1px solid ${emp.todayStatus === "present" ? "var(--accent-border)" : "var(--border)"}`,
              }}
            >
              {statusLabels[emp.todayStatus]}
            </span>
            <ChevronRight size={15} style={{ color: "var(--text-4)", flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
