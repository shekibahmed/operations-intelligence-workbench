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
    <div aria-labelledby={`list-card-${title}`} className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 id={`list-card-${title}`} className="text-sm font-semibold text-ink">
          {title}
        </h3>
        <a href={viewAllHref} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
          View all
        </a>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.key} className="text-sm">
              {item.href ? (
                <a href={item.href} className="font-medium text-[var(--color-accent)] hover:underline">
                  {item.title}
                </a>
              ) : (
                <span className="font-medium text-ink">{item.title}</span>
              )}
              <p className="text-xs text-ink-muted">{item.supportingLine}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
