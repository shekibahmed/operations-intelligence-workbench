import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Collapsed into the row's expandable detail at tablet width (UX_SPEC §5.5). */
  collapseOnTablet?: boolean;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  rowHref,
}: {
  caption: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
}) {
  const collapsedColumns = columns.filter((column) => column.collapseOnTablet);

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`px-2 py-2 ${column.collapseOnTablet ? "hidden xl:table-cell" : ""}`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const key = rowKey(row);
          const href = rowHref?.(row);
          return (
            <tr key={key} className="border-b border-border last:border-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-2 py-2 align-top ${column.collapseOnTablet ? "hidden xl:table-cell" : ""}`}
                >
                  {href && column === columns[0] ? (
                    <a href={href} className="font-medium text-[var(--color-accent)] underline-offset-2 hover:underline">
                      {column.render(row)}
                    </a>
                  ) : (
                    column.render(row)
                  )}
                </td>
              ))}
              {collapsedColumns.length > 0 ? (
                <td className="px-2 py-2 align-top xl:hidden">
                  <details>
                    <summary className="cursor-pointer text-xs text-ink-muted">More details</summary>
                    <dl className="mt-1 space-y-1">
                      {collapsedColumns.map((column) => (
                        <div key={column.key}>
                          <dt className="text-xs font-medium text-ink-muted">{column.header}</dt>
                          <dd>{column.render(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
