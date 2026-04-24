import { FileText } from "lucide-react";
import { clsx } from "clsx";

interface CertificateBadgeProps {
  type?: "PARTIAL" | "FULL_DAY";
  startTime?: string | null;
  endTime?: string | null;
  customLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  variant?: "inline" | "banner";
}

export default function CertificateBadge({
  type,
  startTime,
  endTime,
  customLabel,
  className,
  style,
  variant = "inline",
}: CertificateBadgeProps) {
  const label =
    customLabel ||
    (type === "PARTIAL" && startTime && endTime
      ? `Atestado ${startTime}–${endTime}`
      : "Atestado");

  if (variant === "banner") {
    return (
      <div
        className={clsx(
          "border-b flex items-center justify-center gap-2",
          className
        )}
        style={{
          backgroundColor: "rgba(245, 158, 11, 0.15)",
          borderColor: "rgba(245, 158, 11, 0.25)",
          color: "rgba(217, 119, 6, 1)", // fallback if not overriden
          ...style,
        }}
      >
        <FileText size={12} style={{ color: "rgba(217, 119, 6, 1)" }} />
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "rgba(217, 119, 6, 1)" }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
        className
      )}
      style={{
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        color: "rgba(217, 119, 6, 1)",
        border: "1px solid rgba(245, 158, 11, 0.25)",
        ...style,
      }}
    >
      <FileText size={10} />
      {label}
    </span>
  );
}
