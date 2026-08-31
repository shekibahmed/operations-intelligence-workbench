import type { ReactNode } from "react";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function SectionCard({
  title,
  children,
  actions,
  id,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  id?: string;
}) {
  const headingId = `section-heading-${id ?? slugify(title)}`;
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-sm font-semibold text-ink">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
