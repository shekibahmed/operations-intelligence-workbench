import type { ButtonHTMLAttributes } from "react";

export const BUTTON_BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export const VARIANT_CLASSES = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-btn hover:bg-[var(--color-accent-hover)] active:translate-y-px",
  secondary:
    "bg-surface text-ink border border-border-strong hover:border-[var(--color-ink-faint)] hover:bg-surface-muted active:translate-y-px",
  danger:
    "bg-[var(--color-critical-ink)] text-white hover:opacity-90 active:translate-y-px",
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
}
