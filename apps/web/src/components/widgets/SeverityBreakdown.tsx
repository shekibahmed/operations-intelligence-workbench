export interface SeverityTier {
  key: string;
  label: string;
  count: number;
  href?: string;
}

/**
 * Presentation-only mapping from a pack-supplied severity key to the shared
 * badge palette (the same tones `Badge` uses). Falls back to the neutral
 * accent for any other key — the count stays textual either way, so colour
 * never carries the value alone.
 */
function tierBarClass(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes("critical") || normalized.includes("blocker")) {
    return "bg-[var(--color-critical-ink)]";
  }
  if (normalized.includes("warn") || normalized.includes("major") || normalized.includes("medium")) {
    return "bg-[#c07a17]";
  }
  if (normalized.includes("ok") || normalized.includes("low") || normalized.includes("minor")) {
    return "bg-[var(--color-ok-ink)]";
  }
  return "bg-[var(--color-accent)]";
}

export function SeverityBreakdown({ title, tiers }: { title: string; tiers: SeverityTier[] }) {
  const total = tiers.reduce((sum, tier) => sum + tier.count, 0);
  return (
    <div aria-labelledby="severity-breakdown-heading" className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h2 id="severity-breakdown-heading" className="text-sm font-semibold text-ink">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">
        {tiers.map((tier) => (
          <li key={tier.key} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 truncate text-ink-muted">{tier.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <span
                className={`block h-2 rounded-full ${tierBarClass(tier.key)}`}
                style={{ width: total === 0 ? "0%" : `${Math.max((tier.count / total) * 100, tier.count > 0 ? 6 : 0)}%` }}
              />
            </span>
            {tier.href ? (
              <a
                href={tier.href}
                className="w-8 shrink-0 text-right font-medium tabular-nums text-[var(--color-accent)] underline-offset-2 hover:underline"
              >
                {tier.count}
              </a>
            ) : (
              <span className="w-8 shrink-0 text-right font-medium tabular-nums text-ink">{tier.count}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
