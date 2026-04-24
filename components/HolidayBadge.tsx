import { clsx } from "clsx";

interface HolidayBadgeProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
  variant?: "inline" | "banner";
}

export default function HolidayBadge({
  name,
  className,
  style,
  variant = "inline",
}: HolidayBadgeProps) {
  if (variant === "banner") {
    return (
      <div
        className={clsx(
          "border-b flex items-center justify-center gap-2",
          className
        )}
        style={{
          backgroundColor: "var(--accent-subtle)",
          borderColor: "var(--border)",
          ...style,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "var(--accent)" }}
        >
          {name}
        </span>
      </div>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
        className
      )}
      style={{
        backgroundColor: "var(--accent-subtle)",
        color: "var(--accent)",
        border: "1px solid var(--accent-border)",
        ...style,
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Feriado
    </span>
  );
}
