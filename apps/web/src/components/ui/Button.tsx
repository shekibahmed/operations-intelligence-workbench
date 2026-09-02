import type { ButtonHTMLAttributes } from "react";

export const BUTTON_BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export const VARIANT_CLASSES = {
  primary: "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:opacity-90",
  secondary: "bg-transparent text-ink border border-border hover:bg-surface-muted",
  danger: "bg-[var(--color-critical-ink)] text-white hover:opacity-90",
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
}
