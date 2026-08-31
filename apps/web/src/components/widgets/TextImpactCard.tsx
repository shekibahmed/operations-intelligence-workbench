import type { MetricClassification } from "@/components/widgets/ProvenanceBadge";
import { ProvenanceBadge } from "@/components/widgets/ProvenanceBadge";

/**
 * The only widget permitted to show Hypothetical/Estimated values as its
 * headline content, and only with the badge and qualifying language in the
 * same visual frame (UX_SPEC §6.8, §7.2).
 */
export function TextImpactCard({
  heading,
  body,
  metric,
}: {
  heading: string;
  body: string;
  metric?: { value: string; classification: MetricClassification } | undefined;
}) {
  return (
    <div aria-labelledby={`text-impact-${heading}`} className="rounded-lg border border-border bg-surface p-4">
      <h3 id={`text-impact-${heading}`} className="text-sm font-semibold text-ink">
        {heading}
      </h3>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
      {metric ? (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-semibold text-ink">{metric.value}</span>
          <ProvenanceBadge classification={metric.classification} />
        </div>
      ) : null}
    </div>
  );
}
