/**
 * Persistent, non-dismissible notice (PRD §16.4, §13.1; UX_SPEC §1.2, §2).
 * Never rendered as a toast — it stays in the shell top bar on every screen.
 */
export function SyntheticDataNotice() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--color-warn-ink)]">
      <svg viewBox="0 0 20 20" width={13} height={13} aria-hidden="true" className="shrink-0">
        <path
          d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zm0 4v4m0 2.8v.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      This demonstration uses synthetic operational information. No real
      organisation or customer data is shown.
    </p>
  );
}
