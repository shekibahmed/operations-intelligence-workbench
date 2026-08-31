import type { ReactNode } from "react";

const TONE_CLASSES = {
  neutral: "bg-surface-muted text-ink border-border",
  ok: "bg-[var(--color-ok-surface)] text-[var(--color-ok-ink)] border-transparent",
  warn: "bg-[var(--color-warn-surface)] text-[var(--color-warn-ink)] border-transparent",
  critical: "bg-[var(--color-critical-surface)] text-[var(--color-critical-ink)] border-transparent",
} as const;

export type BadgeTone = keyof typeof TONE_CLASSES;

export function Badge({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
