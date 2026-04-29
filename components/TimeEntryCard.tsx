import { Edit2, Check, X, Trash2 } from "lucide-react";
import TimeInput from "@/components/TimeInput";
import { formatMinutes } from "@/lib/hours";
import { getDaySP, getDate } from "@/lib/dates";
import { clsx } from "clsx";
import HolidayBadge from "@/components/HolidayBadge";
import CertificateBadge from "@/components/CertificateBadge";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface TimeEntryCardProps {
  date: Date;
  holiday?: { name: string } | null;
  certificate?: {
    type: "PARTIAL" | "FULL_DAY";
    startTime: string | null;
    endTime: string | null;
  } | null;
  
  isToday?: boolean;
  
  clockIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  clockOut: string | null;
  
  // Sugestões para o dia atual (Dashboard)
  suggestions?: {
    lunchOut: string | null;
    lunchIn: string | null;
    clockOut: string | null;
  } | null;
  
  workedMinutes: number;
  diffMinutes: number;
  diffTooltip?: string;
  
  isEditing: boolean;
  editForm?: { clockIn: string; lunchOut: string; lunchIn: string; clockOut: string; };
  onEditFormChange?: (field: "clockIn" | "lunchOut" | "lunchIn" | "clockOut", value: string) => void;
  
  saving?: boolean;
  
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

function hasTime(t: string | undefined | null): boolean {
  return !!t && t !== "--:--";
}

export default function TimeEntryCard({
  date, holiday, certificate, isToday,
  clockIn, lunchOut, lunchIn, clockOut, suggestions,
  workedMinutes, diffMinutes, diffTooltip,
  isEditing, editForm, onEditFormChange, saving,
  onSave, onCancel, onDelete, onEdit
}: TimeEntryCardProps) {
  const hasCert = !!certificate;
  
  return (
    <div
      className="rounded-xl p-3 relative overflow-hidden"
      style={{
        backgroundColor: holiday ? "var(--accent-subtle)" : isToday ? "var(--accent-subtle)" : "var(--surface-2)",
        border: `1px solid ${holiday ? "var(--accent-border)" : isToday ? "var(--accent-border)" : "var(--border)"}`,
      }}
    >
      {/* Opcional: Gradient de fundo para feriados no Dashboard */}
      {holiday && !certificate && isToday === undefined /* Only in Dashboard? No, History uses badges instead. Dashboard uses gradient. Let's align on History's Badge for both or keep both? Dashboard uses simple background gradient. Let's standardize on badges! */}
      {holiday && (
        <HolidayBadge
          variant="banner"
          name={holiday.name}
          className={clsx("-mt-3 -mx-3 px-3 py-1.5", !hasCert ? "mb-3" : "")}
        />
      )}
      {hasCert && (
        <CertificateBadge
          variant="banner"
          className={clsx("-mx-3 mb-3 px-3 py-1.5", !holiday && "-mt-3")}
          type={certificate!.type}
          startTime={certificate!.startTime}
          endTime={certificate!.endTime}
        />
      )}

      <div className="flex items-center relative z-10">
        {/* Dia */}
        <div className="w-10 shrink-0 flex flex-col items-start justify-center">
          <p className="text-[9px] uppercase mb-0.5" style={{ color: "var(--text)" }}>{WEEKDAYS[getDaySP(date)]}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-syne font-bold text-sm" style={{ color: "var(--text)" }}>
              {getDate(date).toString().padStart(2, "0")}
            </p>
          </div>
          {/* Se não estiver usando badges banner, usar fallback? Deixaremos as badges */}
        </div>

        {/* Horários: view ou edit */}
        {isEditing && editForm && onEditFormChange ? (
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-1.5">
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
                  onChange={(val) => onEditFormChange(field, val)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2 text-center">
            {[clockIn, lunchOut, lunchIn, clockOut].map((t, i) => {
              let suggestion: string | null = null;
              if (isToday && suggestions) {
                suggestion = [null, suggestions.lunchOut, suggestions.lunchIn, suggestions.clockOut][i];
              }
              const isActual = hasTime(t);
              const display = isActual ? t : suggestion;
              return (
                <div key={i}>
                  <p className="text-[10px] uppercase font-medium" style={{ color: "var(--text-3)" }}>
                    {["Entrada", "Almoço", "Volta", "Saída"][i]}
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
                    {display ? (
                      isActual ? display : <span style={{ opacity: 0.4 }}>~{display}</span>
                    ) : (
                      t ?? "--:--"
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Saldo (só quando não editando) */}
        {!isEditing && (
          <div className="text-right shrink-0 min-w-[4.5rem] whitespace-nowrap">
            <p className="font-syne text-sm font-bold" style={{ color: "var(--text)" }}>
              {formatMinutes(workedMinutes)}
            </p>
            {hasTime(clockOut) && (
              <p
                className="text-[9px] cursor-help"
                style={{ color: diffMinutes >= 0 ? "var(--accent)" : "var(--text-3)" }}
                title={diffTooltip}
              >
                {diffMinutes >= 0 ? "+" : ""}{formatMinutes(diffMinutes)}
              </p>
            )}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-1 shrink-0">
          {isEditing ? (
            <>
              {onSave && (
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  {saving ? (
                    <span
                      className="w-3 h-3 border border-t-transparent rounded-full animate-spin block"
                      style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                    />
                  ) : (
                    <Check size={13} />
                  )}
                </button>
              )}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-3)" }}
                >
                  <X size={13} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  disabled={saving}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "#ef4444" }}
                  title="Apagar registro inteiro"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </>
          ) : (
            onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-4)" }}
              >
                <Edit2 size={13} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
