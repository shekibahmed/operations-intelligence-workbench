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

export function SlaTable({ title, rows, emptyMessage }: { title: string; rows: SlaRow[]; emptyMessage: string }) {
  return (
    <div aria-labelledby="sla-table-heading" className="rounded-lg border border-border bg-surface p-4">
      <h3 id="sla-table-heading" className="text-sm font-semibold text-ink">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{emptyMessage}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="py-1">Item</th>
              <th scope="col" className="py-1">Due</th>
              <th scope="col" className="py-1">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="py-1">
                  {row.href ? (
                    <a href={row.href} className="font-medium text-[var(--color-accent)] hover:underline">
                      {row.name}
                    </a>
                  ) : (
                    row.name
                  )}
                </td>
                <td className="py-1">{row.dueLabel}</td>
                <td className="py-1">{RISK_LABEL[row.risk]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
