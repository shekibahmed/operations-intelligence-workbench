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
    <div aria-labelledby={headingId} className="rounded-lg border border-border bg-surface p-4">
      <h3 id={headingId} className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-ink">{value}</span>
        <ProvenanceBadge classification={classification} />
      </div>
      {subtext ? <p className="mt-1 text-xs text-ink-muted">{subtext}</p> : null}
      {href ? (
        <a href={href} className="mt-2 inline-block text-xs font-medium text-[var(--color-accent)] hover:underline">
          View
        </a>
      ) : null}
    </div>
  );
}
