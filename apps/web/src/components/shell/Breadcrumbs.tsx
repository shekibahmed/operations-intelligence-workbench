"use client";

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
  section,
  lens,
  itemLabel,
}: {
  workspace: string;
  packName: string;
  /** Section of the page rendering the shell — tree-consistent, unlike usePathname() mid-transition. */
  section: string;
  lens: Lens;
  itemLabel?: string | undefined;
}) {
  const base = workspaceBase(workspace);
  // "cases-detail" → base section "cases" with a detail crumb; technical
  // sections are "technical-artifacts" / "technical-rules".
  const [baseSection, detail] = section.startsWith("technical-")
    ? ["technical", section.slice("technical-".length)]
    : [section.replace(/-detail$/, ""), section.endsWith("-detail") ? "detail" : undefined];

  const crumbs: Crumb[] = [{ label: packName, href: withLens(`${base}/overview`, lens) }];

  if (baseSection === "technical") {
    crumbs.push({ label: "Technical" });
    crumbs.push({ label: detail === "rules" ? "Rules" : "Artifacts" });
    if (itemLabel) crumbs.push({ label: itemLabel });
  } else if (baseSection && baseSection !== "overview") {
    const sectionLabel = SECTION_LABEL[baseSection] ?? baseSection;
    const hasDetail = detail === "detail";
    crumbs.push({
      label: sectionLabel,
      href: hasDetail ? withLens(`${base}/${baseSection}`, lens) : undefined,
    });
    if (hasDetail && itemLabel) crumbs.push({ label: itemLabel });
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden="true" className="text-ink-faint">
                /
              </span>
            ) : null}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="rounded-sm font-medium text-[var(--color-accent)] underline-offset-2 hover:underline"
              >
                {crumb.label}
              </Link>
            ) : (
              <span aria-current={index === crumbs.length - 1 ? "page" : undefined} className={index === crumbs.length - 1 ? "font-medium text-ink" : undefined}>
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
