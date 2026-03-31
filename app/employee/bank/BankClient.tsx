"use client";

import { clsx } from "clsx";
import { Plus, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { formatMinutes } from "@/lib/hours";
import { getYear, getMonth } from "@/lib/dates";
import { useTheme } from "@/components/ThemeProvider";

interface Adjustment {
  id: string;
  minutes: number;
  reason: string;
  managerName: string;
  createdAt: string;
}

interface Props {
  balanceMinutes: number;
  balanceLabel: string;
  overtimeMode: string;
  adjustments: Adjustment[];
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function BankClient({ balanceMinutes, balanceLabel, overtimeMode, adjustments }: Props) {
  const { theme } = useTheme();
  const positive = balanceMinutes >= 0;

  const adjustmentsByMonth: Record<string, Adjustment[]> = {};
  
  for (const adj of adjustments) {
    const date = new Date(adj.createdAt);
    const monthKey = `${getYear(date)}-${getMonth(date).toString().padStart(2, "0")}`;
    if (!adjustmentsByMonth[monthKey]) {
      adjustmentsByMonth[monthKey] = [];
    }
    adjustmentsByMonth[monthKey].push(adj);
  }

  const sortedMonths = Object.keys(adjustmentsByMonth).sort().reverse();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="font-syne text-2xl font-bold" style={{ color: "var(--text)" }}>Banco de Horas</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>Histórico de ajustes</p>
      </div>

      {/* Card de saldo */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center", 
            positive ? (theme === "dark" ? "bg-green-500/15" : "bg-green-600/15") : (theme === "dark" ? "bg-red-500/15" : "bg-red-600/15")
          )}>
            {positive ? <TrendingUp size={22} className={theme === "dark" ? "text-green-400" : "text-green-600"} /> : <TrendingDown size={22} className={theme === "dark" ? "text-red-400" : "text-red-600"} />}
          </div>
          <div>
            <p className="text-xs text-3 uppercase tracking-widest">
              {overtimeMode === "HOUR_BANK" ? "Banco de Horas" : "Horas Extras"}
            </p>
            <p className={clsx("font-syne text-3xl font-bold", positive ? (theme === "dark" ? "text-green-400" : "text-green-600") : (theme === "dark" ? "text-red-400" : "text-red-600"))}>
              {balanceLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de ajustes por mês */}
      <div className="card">
        <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--text-3)" }}>Histórico de ajustes</p>
        
        {adjustments.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: "var(--text-3)" }}>
            Nenhum ajuste registrado
          </div>
        ) : (
          <div className="space-y-6">
            {sortedMonths.map((monthKey) => {
              const [year, month] = monthKey.split("-");
              const monthLabel = `${MONTHS[parseInt(month)]} ${year}`;
              const monthAdjustments = adjustmentsByMonth[monthKey];

              return (
                <div key={monthKey}>
                  <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>{monthLabel}</p>
                  <div className="space-y-2">
                    {monthAdjustments.map((adj) => {
                      const isAdd = adj.minutes >= 0;
                      const colorClass = isAdd 
                        ? theme === "dark" ? "text-green-400" : "text-green-600"
                        : theme === "dark" ? "text-red-400" : "text-red-600";
                      const bgClass = isAdd
                        ? theme === "dark" ? "bg-green-500/15" : "bg-green-600/15"
                        : theme === "dark" ? "bg-red-500/15" : "bg-red-600/15";

                      return (
                        <div key={adj.id} className="rounded-xl p-3" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
                          <div className="flex items-center gap-3">
                            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", bgClass)}>
                              {isAdd ? <Plus size={16} className={colorClass} /> : <Minus size={16} className={colorClass} />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm" style={{ color: "var(--text)" }}>
                                <span className="font-medium">{adj.managerName}</span>{" "}
                                <span style={{ color: "var(--text-2)" }}> {isAdd ? "adicionou" : "descontou"} </span>
                                <span className={colorClass}>{formatMinutes(Math.abs(adj.minutes))}</span>
                                <span style={{ color: "var(--text-2)" }}> {isAdd ? "no banco de horas" : "do banco de horas"}</span>
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{adj.reason}</p>
                            </div>
                            <p className="text-xs shrink-0" style={{ color: "var(--text-3)" }}>
                              {new Date(adj.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
