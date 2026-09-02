import { ProvenanceBadge } from "@/components/widgets/ProvenanceBadge";

export interface TrendPoint {
  label: string;
  value: number;
}

/**
 * Line chart with a text/table alternative for the same data (UX_SPEC §5.4,
 * PRD §16.3) — the table is not visually hidden, it is the accessible
 * representation shown alongside a lightweight SVG sparkline.
 */
export function TrendLine({ title, points, seriesLabel }: { title: string; points: TrendPoint[]; seriesLabel: string }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const width = 240;
  const height = 60;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${index * step} ${height - (point.value / max) * height}`)
    .join(" ");

  return (
    <div aria-labelledby="trend-line-heading" className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 id="trend-line-heading" className="text-sm font-semibold text-ink">
          {title}
        </h2>
        <ProvenanceBadge classification="calculated" />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="presentation" aria-hidden="true" className="mt-3 h-16 w-full">
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
      </svg>
      <table className="mt-2 w-full text-xs">
        <caption className="sr-only">{`${title} — ${seriesLabel} by period`}</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left text-ink-muted">Period</th>
            <th scope="col" className="text-right text-ink-muted">{seriesLabel}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <td>{point.label}</td>
              <td className="text-right">{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
