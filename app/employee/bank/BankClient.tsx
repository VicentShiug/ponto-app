"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Plus, Minus, TrendingUp, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { formatMinutes } from "@/lib/hours";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/components/ThemeProvider";
import type { HourBankDetails } from "@/lib/hour-bank";

interface Adjustment {
  id: string;
  minutes: number;
  reason: string;
  managerName: string;
  createdAt: string;
}

interface Props {
  details: HourBankDetails;
  overtimeMode: string;
  adjustments: Adjustment[];
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function BankClient({ details, overtimeMode, adjustments }: Props) {
  const { theme } = useTheme();
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => {
    if (details.monthlyData.length > 0) {
      return { [details.monthlyData[0].monthKey]: true };
    }
    return {};
  });

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const isDark = theme === "dark";
  
  const getValueColor = (val: number) => {
    if (val > 0) return isDark ? "text-green-400" : "text-green-600";
    if (val < 0) return isDark ? "text-red-400" : "text-red-500";
    return isDark ? "text-gray-500" : "text-gray-400";
  };

  const overtimeTitle = overtimeMode === "HOUR_BANK" ? "Banco de Horas" : "Horas Extras";

  const adjustmentsByMonth: Record<string, Adjustment[]> = {};
  for (const adj of adjustments) {
    const date = new Date(adj.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!adjustmentsByMonth[monthKey]) adjustmentsByMonth[monthKey] = [];
    adjustmentsByMonth[monthKey].push(adj);
  }
  const sortedAdjMonths = Object.keys(adjustmentsByMonth).sort().reverse();

  // Helper variables for theming to keep the markup clean
  const bgCard = isDark ? "bg-gray-800" : "bg-white";
  const borderCard = isDark ? "border-gray-700" : "border-gray-100";
  const textTitle = isDark ? "text-gray-200" : "text-gray-700";
  const textTitleBright = isDark ? "text-white" : "text-gray-900";
  const textSub = isDark ? "text-gray-500" : "text-gray-400";
  const bgRow = isDark ? "bg-gray-900" : "bg-gray-50";
  const hoverRow = isDark ? "hover:bg-gray-700" : "hover:bg-gray-100";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className={clsx("font-syne text-2xl font-bold", textTitleBright)}>{overtimeTitle}</h1>
        <p className={clsx("text-sm mt-0.5", textSub)}>Acompanhamento detalhado do seu saldo</p>
      </div>

      {/* 1. Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Saldo Total */}
        <div className={clsx("border shadow-sm rounded-xl p-5 flex flex-col justify-between", bgCard, borderCard)}>
          <div className={clsx("flex items-center gap-2 mb-2", textTitle)}>
            <TrendingUp size={16} className={textSub} />
            <p className={clsx("text-xs font-medium uppercase tracking-wide", textSub)}>Saldo Total</p>
          </div>
          <div>
            <p className={clsx("text-2xl font-semibold", getValueColor(details.totalBalance))}>
              {formatMinutes(details.totalBalance)}
            </p>
          </div>
        </div>

        {/* Mês Atual */}
        <div className={clsx("border shadow-sm rounded-xl p-5 flex flex-col justify-between", bgCard, borderCard)}>
          <div className={clsx("flex items-center gap-2 mb-2", textTitle)}>
            <Calendar size={16} className={textSub} />
            <p className={clsx("text-xs font-medium uppercase tracking-wide", textSub)}>Mês Atual</p>
          </div>
          <div>
            <p className={clsx("text-2xl font-semibold", getValueColor(details.currentMonthBalance))}>
              {formatMinutes(details.currentMonthBalance)}
            </p>
          </div>
        </div>

        {/* Ajustes Recebidos */}
        <div className={clsx("border shadow-sm rounded-xl p-5 flex flex-col justify-between", bgCard, borderCard)}>
          <div className={clsx("flex items-center gap-2 mb-2", textTitle)}>
            <Clock size={16} className={textSub} />
            <p className={clsx("text-xs font-medium uppercase tracking-wide", textSub)}>Ajustes Recebidos</p>
          </div>
          <div>
            <p className={clsx("text-2xl font-semibold", getValueColor(details.totalAdjustments))}>
              {formatMinutes(details.totalAdjustments)}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Histórico Mensal */}
      <div className="space-y-4">
        <h2 className={clsx("font-syne text-lg font-bold mt-8 mb-4", textTitleBright)}>Histórico Mensal</h2>
        
        {details.monthlyData.length === 0 ? (
          <EmptyState message="Nenhum histórico encontrado" />
        ) : (
          details.monthlyData.map((month) => {
            const isExpanded = !!expandedMonths[month.monthKey];
            
            return (
              <div key={month.monthKey} className={clsx("border shadow-sm rounded-xl overflow-hidden transition-all duration-200", bgCard, borderCard)}>
                <button 
                  onClick={() => toggleMonth(month.monthKey)}
                  className={clsx("w-full flex items-center justify-between py-4 px-5 transition-colors", 
                    isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"
                  )}
                >
                  <div className="text-left">
                    <p className={clsx("font-medium", textTitle)}>{month.monthLabel}</p>
                    <p className={clsx("text-xs", textSub)}>{month.daysWorked} dias apontados</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <p className={clsx("font-semibold", getValueColor(month.balanceMinutes))}>
                      {formatMinutes(month.balanceMinutes)}
                    </p>
                    <div className={textSub}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className={clsx("border-t", borderCard, bgCard)}>
                    {month.outliers.length === 0 ? (
                      <div className={clsx("py-4 px-5 text-sm", textSub)}>
                        <p>Nenhuma variação maior que ±30 minutos neste mês.</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {month.outliers.map((outlier, i) => {
                          return (
                            <div key={i} className={clsx("flex justify-between items-center py-3 px-4 rounded-lg transition-colors", bgRow, hoverRow)}>
                              <div className="flex items-center gap-2">
                                <span className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>{outlier.dateLabel}</span>
                                {outlier.isHoliday && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-subtle text-accent border border-accent">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                    Feriado
                                  </span>
                                )}
                              </div>
                              <span className={clsx("text-sm font-medium", getValueColor(outlier.deltaMinutes))}>
                                {formatMinutes(outlier.deltaMinutes)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Lista de Histórico de Ajustes */}
      <h2 className={clsx("font-syne text-lg font-bold mt-10 mb-4", textTitleBright)}>Histórico de Ajustes</h2>
      <div className={clsx("border shadow-sm rounded-xl p-5", bgCard, borderCard)}>
        {adjustments.length === 0 ? (
          <EmptyState message="Nenhum ajuste registrado" />
        ) : (
          <div className="space-y-6">
            {sortedAdjMonths.map((monthKey) => {
              const [year, month] = monthKey.split("-");
              const monthLabel = `${MONTHS[parseInt(month) - 1]} ${year}`;
              const monthAdjustments = adjustmentsByMonth[monthKey];

              return (
                <div key={monthKey}>
                  <p className={clsx("text-xs font-medium uppercase tracking-widest mb-3", textSub)}>{monthLabel}</p>
                  <div className="space-y-2">
                    {monthAdjustments.map((adj) => {
                      const isAdd = adj.minutes >= 0;
                      return (
                        <div key={adj.id} className={clsx("rounded-xl py-3 px-4", bgRow)}>
                          <div className="flex items-center gap-4">
                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border", 
                              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                            )}>
                              {isAdd ? <Plus size={14} className={getValueColor(adj.minutes)} /> : <Minus size={14} className={getValueColor(adj.minutes)} />}
                            </div>
                            <div className="flex-1">
                              <p className={clsx("text-sm", textTitle)}>
                                <span className="font-medium">{adj.managerName}</span>{" "}
                                <span className={textSub}> {isAdd ? "adicionou" : "descontou"} </span>
                                <span className={getValueColor(adj.minutes)}>{formatMinutes(Math.abs(adj.minutes))}</span>
                                <span className={textSub}> {isAdd ? "no banco de horas" : "do banco de horas"}</span>
                              </p>
                              {adj.reason && (
                                <p className={clsx("text-xs mt-0.5", textSub)}>{adj.reason}</p>
                              )}
                            </div>
                            <p className={clsx("text-xs shrink-0", textSub)}>
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
