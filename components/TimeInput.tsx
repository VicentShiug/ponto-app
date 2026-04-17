import { X } from "lucide-react";

interface TimeInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

export default function TimeInput({ label, value, onChange }: TimeInputProps) {
  return (
    <div className="flex flex-col min-w-0">
      <p className="text-[8px] uppercase mb-0.5 truncate opacity-70 px-1" style={{ color: "var(--text)" }}>
        {label}
      </p>
      <div 
        className="flex items-center h-8 bg-[var(--surface)] border border-[var(--border-2)] rounded-lg focus-within:border-[var(--text-3)] transition-all"
        style={{ color: "var(--text)" }}
      >
        <input
          type="time"
          className="flex-1 min-w-0 pl-2 pr-0 py-1.5 text-[10px] sm:text-xs bg-transparent focus:outline-none [&::-webkit-clear-button]:hidden [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:p-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer opacity-90 hover:opacity-100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex items-center gap-0.5 pr-1 shrink-0">
          {value && value !== "--:--" && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1 rounded-md opacity-40 hover:opacity-100 hover:bg-[var(--surface-2)] transition-all"
              title="Limpar horário"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
