import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-border-strong bg-surface p-7 text-sm text-ink-muted">
      <p className="font-medium text-ink">{title}</p>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
