export interface ActivityEntry {
  key: string;
  timestamp: string;
  summary: string;
  href?: string;
}

export function ActivityFeed({ entries, auditHref }: { entries: ActivityEntry[]; auditHref: string }) {
  return (
    <div aria-labelledby="activity-feed-heading" className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 id="activity-feed-heading" className="text-sm font-semibold text-ink">
          Recent activity
        </h2>
        <a href={auditHref} className="text-xs font-medium text-[var(--color-accent)] underline-offset-2 hover:underline">
          View full audit log
        </a>
      </div>
      <ol className="mt-4 space-y-4">
        {entries.map((entry) => (
          <li key={entry.key} className="relative border-l border-border pl-4">
            <span
              aria-hidden="true"
              className="absolute -left-[3.5px] top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
            />
            <time dateTime={entry.timestamp} className="block text-xs text-ink-faint">
              {new Date(entry.timestamp).toLocaleString()}
            </time>
            {entry.href ? (
              <a href={entry.href} className="mt-0.5 block text-sm text-[var(--color-accent)] underline-offset-2 hover:underline">
                {entry.summary}
              </a>
            ) : (
              <span className="mt-0.5 block text-sm text-ink">{entry.summary}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
