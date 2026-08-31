"use client";

import type { Lens } from "@/lib/lens";
import { workspaceBase, withLens } from "@/lib/routes";

interface NavLink {
  label: string;
  section: string;
  href: string;
}

/**
 * Left rail on desktop, collapsible drawer on tablet (UX_SPEC §1.2). All
 * items are always present and reachable regardless of the active lens —
 * the lens changes emphasis/defaults, never nav visibility (UX_SPEC §1.3).
 */
export function PrimaryNav({
  workspace,
  section,
  lens,
  defaultArtifactId,
  defaultRuleId,
}: {
  workspace: string;
  /** Section of the page rendering the shell — tree-consistent, unlike usePathname() mid-transition. */
  section: string;
  lens: Lens;
  defaultArtifactId: string;
  defaultRuleId: string;
}) {
  const base = workspaceBase(workspace);

  // Nav labels are structural/procedural copy, never pack-configurable
  // (UX_SPEC §8.1) — only the domain nouns rendered inside each screen are
  // pack-supplied.
  const links: NavLink[] = [
    { label: "Overview", section: "overview", href: `${base}/overview` },
    { label: "Inbox", section: "inbox", href: `${base}/inbox` },
    { label: "Review Queue", section: "review", href: `${base}/review` },
    { label: "Cases", section: "cases", href: `${base}/cases` },
    { label: "Entities", section: "entities", href: `${base}/entities` },
    { label: "Decisions", section: "decisions", href: `${base}/decisions` },
    { label: "Audit", section: "audit", href: `${base}/audit` },
    { label: "About this pack", section: "about-pack", href: `${base}/about-pack` },
  ];

  const technicalLinks = [
    { label: "Artifacts", href: `${base}/technical/artifacts/${defaultArtifactId}` },
    { label: "Rules", href: `${base}/technical/rules/${defaultRuleId}` },
  ];

  function isActive(linkSection: string) {
    return section === linkSection || section.startsWith(`${linkSection}-`);
  }

  const technicalActive = section.startsWith("technical");

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.section}>
            <a
              href={withLens(link.href, lens)}
              aria-current={isActive(link.section) ? "page" : undefined}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                isActive(link.section) ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "text-ink hover:bg-surface-muted"
              }`}
            >
              {link.label}
            </a>
          </li>
        ))}
        <li>
          <span
            aria-current={technicalActive ? "page" : undefined}
            className={`block rounded-md px-3 py-2 text-sm font-medium ${technicalActive ? "text-ink" : "text-ink"}`}
          >
            Technical
          </span>
          <ul className="ml-3 flex flex-col gap-1 border-l border-border pl-2">
            {technicalLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={withLens(link.href, lens)}
                  className="block rounded-md px-3 py-1.5 text-sm text-ink hover:bg-surface-muted"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </nav>
  );
}
