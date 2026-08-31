"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import type { Lens } from "@/lib/lens";
import { workspaceBase, withLens } from "@/lib/routes";

interface Crumb {
  label: string;
  href?: string | undefined;
}

const SECTION_LABEL: Record<string, string> = {
  inbox: "Inbox",
  review: "Review Queue",
  cases: "Cases",
  entities: "Entities",
  decisions: "Decisions",
  audit: "Audit",
  "about-pack": "About this pack",
};

/**
 * `<Pack name> / <Section> / <Item>` (UX_SPEC §1.2, §1.4). Pack-name crumb
 * always links to Overview, independent of lens.
 */
export function Breadcrumbs({
  workspace,
  packName,
  lens,
  itemLabel,
}: {
  workspace: string;
  packName: string;
  lens: Lens;
  itemLabel?: string | undefined;
}) {
  const pathname = usePathname();
  const base = workspaceBase(workspace);
  const rest = pathname.startsWith(base) ? pathname.slice(base.length + 1) : "";
  const segments = rest.split("/").filter(Boolean);

  const crumbs: Crumb[] = [{ label: packName, href: withLens(`${base}/overview`, lens) }];

  if (segments[0] === "technical") {
    crumbs.push({ label: "Technical" });
    const kind = segments[1] === "rules" ? "Rules" : "Artifacts";
    crumbs.push({ label: kind });
    if (itemLabel) crumbs.push({ label: itemLabel });
  } else if (segments[0] && segments[0] !== "overview") {
    const sectionLabel = SECTION_LABEL[segments[0]] ?? segments[0];
    const hasDetail = segments.length > 1;
    crumbs.push({
      label: sectionLabel,
      href: hasDetail ? withLens(`${base}/${segments[0]}`, lens) : undefined,
    });
    if (hasDetail && itemLabel) crumbs.push({ label: itemLabel });
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="text-[var(--color-accent)] hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current={index === crumbs.length - 1 ? "page" : undefined} className={index === crumbs.length - 1 ? "text-ink" : undefined}>
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
