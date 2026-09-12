import type { MetricClassification } from "@/components/widgets/ProvenanceBadge";
import { ProvenanceBadge } from "@/components/widgets/ProvenanceBadge";

export function StatCard({
  label,
  value,
  classification,
  subtext,
  href,
}: {
  label: string;
  value: string | number;
  classification: MetricClassification;
  subtext?: string | undefined;
  href?: string | undefined;
}) {
  const headingId = `stat-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div aria-labelledby={headingId} className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h2 id={headingId} className="text-xs font-medium uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </h2>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{value}</span>
        <ProvenanceBadge classification={classification} />
      </div>
      {subtext ? <p className="mt-1.5 text-xs text-ink-muted">{subtext}</p> : null}
      {href ? (
        <a
          href={href}
          className="mt-2 inline-block text-xs font-medium text-[var(--color-accent)] underline-offset-2 hover:underline"
        >
          View
        </a>
      ) : null}
    </div>
  );
}
