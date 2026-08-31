export interface ActivityEntry {
  key: string;
  timestamp: string;
  summary: string;
  href?: string;
}

export function ActivityFeed({ entries, auditHref }: { entries: ActivityEntry[]; auditHref: string }) {
  return (
    <div aria-labelledby="activity-feed-heading" className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 id="activity-feed-heading" className="text-sm font-semibold text-ink">
          Recent activity
        </h3>
        <a href={auditHref} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
          View full audit log
        </a>
      </div>
      <ol className="mt-3 space-y-2 text-sm">
        {entries.map((entry) => (
          <li key={entry.key}>
            <time dateTime={entry.timestamp} className="block text-xs text-ink-muted">
              {new Date(entry.timestamp).toLocaleString()}
            </time>
            {entry.href ? (
              <a href={entry.href} className="text-[var(--color-accent)] hover:underline">
                {entry.summary}
              </a>
            ) : (
              <span>{entry.summary}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
