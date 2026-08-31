/**
 * Persistent, non-dismissible notice (PRD §16.4, §13.1; UX_SPEC §1.2, §2).
 * Never rendered as a toast — it stays in the shell top bar on every screen.
 */
export function SyntheticDataNotice() {
  return (
    <p className="text-xs text-ink-muted">
      This demonstration uses synthetic operational information. No real
      organisation or customer data is shown.
    </p>
  );
}
