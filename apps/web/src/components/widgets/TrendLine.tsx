import { ProvenanceBadge } from "@/components/widgets/ProvenanceBadge";

export interface TrendPoint {
  label: string;
  value: number;
}

/**
 * Line chart with a text/table alternative for the same data (UX_SPEC §5.4,
 * PRD §16.3) — the table is not visually hidden, it is the accessible
 * representation shown alongside a lightweight SVG area chart.
 */
export function TrendLine({ title, points, seriesLabel }: { title: string; points: TrendPoint[]; seriesLabel: string }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const width = 240;
  const height = 64;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const y = (value: number) => height - (value / max) * (height - 6) - 3;
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${index * step} ${y(point.value)}`)
    .join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L ${width} ${height} L 0 ${height} Z`
      : "";
  // One gradient per widget instance — titles are unique within a dashboard,
  // so the ids don't collide (axe flags duplicate ids).
  const gradientId = `trend-fill-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const last = points.at(-1);
  // The SVG stretches non-uniformly, so the endpoint dot is an HTML overlay
  // (a stretched SVG circle renders as a smudge).
  const lastTopPercent = last ? (y(last.value) / height) * 100 : 0;

  return (
    <div aria-labelledby="trend-line-heading" className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 id="trend-line-heading" className="text-sm font-semibold text-ink">
          {title}
        </h2>
        <ProvenanceBadge classification="calculated" />
      </div>
      <div className="relative mt-4 h-20 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="presentation"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line
              key={fraction}
              x1="0"
              x2={width}
              y1={height * fraction}
              y2={height * fraction}
              stroke="var(--color-border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {last ? (
          <span
            aria-hidden="true"
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-surface)]"
            style={{ left: "100%", top: `${lastTopPercent}%` }}
          />
        ) : null}
      </div>
      <table className="mt-3 w-full text-xs">
        <caption className="sr-only">{`${title} — ${seriesLabel} by period`}</caption>
        <thead>
          <tr className="text-left">
            <th scope="col" className="font-medium text-ink-faint">Period</th>
            <th scope="col" className="text-right font-medium text-ink-faint">{seriesLabel}</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {points.map((point) => (
            <tr key={point.label} className="border-t border-border">
              <td className="py-1 text-ink-muted">{point.label}</td>
              <td className="py-1 text-right font-medium text-ink">{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
