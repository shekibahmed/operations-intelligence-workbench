export interface SeverityTier {
  key: string;
  label: string;
  count: number;
  href?: string;
}

export function SeverityBreakdown({ title, tiers }: { title: string; tiers: SeverityTier[] }) {
  const total = tiers.reduce((sum, tier) => sum + tier.count, 0);
  return (
    <div aria-labelledby="severity-breakdown-heading" className="rounded-lg border border-border bg-surface p-4">
      <h3 id="severity-breakdown-heading" className="text-sm font-semibold text-ink">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {tiers.map((tier) => (
          <li key={tier.key} className="flex items-center gap-2 text-sm">
            <span className="w-24 shrink-0 text-ink-muted">{tier.label}</span>
            <span className="h-2 flex-1 rounded-full bg-surface-muted">
              <span
                className="block h-2 rounded-full bg-[var(--color-accent)]"
                style={{ width: total === 0 ? "0%" : `${(tier.count / total) * 100}%` }}
              />
            </span>
            {tier.href ? (
              <a href={tier.href} className="w-8 shrink-0 text-right font-medium text-[var(--color-accent)] hover:underline">
                {tier.count}
              </a>
            ) : (
              <span className="w-8 shrink-0 text-right font-medium text-ink">{tier.count}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
