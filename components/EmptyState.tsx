"use client";

interface EmptyStateProps {
  message: string;
  submessage?: string;
}

export function EmptyState({ message, submessage }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: "var(--text-3)" }}>
      <p className="text-sm font-medium">{message}</p>
      {submessage && (
        <p className="text-xs mt-1" style={{ color: "var(--text-4)" }}>
          {submessage}
        </p>
      )}
    </div>
  );
}
