import { Badge } from "@/components/ui/Badge";

export interface SlaRow {
  key: string;
  name: string;
  dueLabel: string;
  risk: "on-track" | "at-risk" | "overdue";
  href?: string;
}

const RISK_LABEL: Record<SlaRow["risk"], string> = {
  "on-track": "On track",
  "at-risk": "At risk",
  overdue: "Overdue",
};

const RISK_TONE: Record<SlaRow["risk"], "ok" | "warn" | "critical"> = {
  "on-track": "ok",
  "at-risk": "warn",
  overdue: "critical",
};

export function SlaTable({ title, rows, emptyMessage }: { title: string; rows: SlaRow[]; emptyMessage: string }) {
  return (
    <div aria-labelledby="sla-table-heading" className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h2 id="sla-table-heading" className="text-sm font-semibold text-ink">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{emptyMessage}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-ink-faint">
              <th scope="col" className="py-1 font-medium">Item</th>
              <th scope="col" className="py-1 font-medium">Due</th>
              <th scope="col" className="py-1 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="py-2">
                  {row.href ? (
                    <a href={row.href} className="font-medium text-[var(--color-accent)] underline-offset-2 hover:underline">
                      {row.name}
                    </a>
                  ) : (
                    row.name
                  )}
                </td>
                <td className="py-2 tabular-nums text-ink-muted">{row.dueLabel}</td>
                <td className="py-2">
                  <Badge tone={RISK_TONE[row.risk]}>{RISK_LABEL[row.risk]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
