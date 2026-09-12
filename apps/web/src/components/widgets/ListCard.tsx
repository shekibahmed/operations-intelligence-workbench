export interface ListCardItem {
  key: string;
  title: string;
  supportingLine: string;
  href?: string;
}

export function ListCard({
  title,
  items,
  viewAllHref,
  emptyMessage,
}: {
  title: string;
  items: ListCardItem[];
  viewAllHref: string;
  emptyMessage: string;
}) {
  return (
    <div aria-labelledby={`list-card-${title}`} className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 id={`list-card-${title}`} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        <a href={viewAllHref} className="text-xs font-medium text-[var(--color-accent)] underline-offset-2 hover:underline">
          View all
        </a>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.key} className="py-2.5 text-sm first:pt-1 last:pb-0">
              {item.href ? (
                <a href={item.href} className="font-medium text-[var(--color-accent)] underline-offset-2 hover:underline">
                  {item.title}
                </a>
              ) : (
                <span className="font-medium text-ink">{item.title}</span>
              )}
              <p className="mt-0.5 text-xs text-ink-muted">{item.supportingLine}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
