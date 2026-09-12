"use client";

import type { ReactNode } from "react";

import type { Lens } from "@/lib/lens";
import { workspaceBase, withLens } from "@/lib/routes";

interface NavLink {
  label: string;
  section: string;
  href: string;
  icon: ReactNode;
}

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  overview: (
    <NavIcon>
      <path d="M4 20h16" />
      <path d="M7 16v-5M12 16V6M17 16v-8" />
    </NavIcon>
  ),
  inbox: (
    <NavIcon>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
    </NavIcon>
  ),
  review: (
    <NavIcon>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </NavIcon>
  ),
  cases: (
    <NavIcon>
      <path d="m3 6 1.5 1.5L7 5" />
      <path d="m3 12 1.5 1.5L7 11" />
      <path d="m3 18 1.5 1.5L7 17" />
      <path d="M11 6h10M11 12h10M11 18h10" />
    </NavIcon>
  ),
  entities: (
    <NavIcon>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </NavIcon>
  ),
  decisions: (
    <NavIcon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 11.5 2 2 4-4" />
    </NavIcon>
  ),
  audit: (
    <NavIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </NavIcon>
  ),
  about: (
    <NavIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-5M12 8v.2" />
    </NavIcon>
  ),
  branch: (
    <NavIcon>
      <path d="M6 3v12" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </NavIcon>
  ),
} as const;

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
    { label: "Overview", section: "overview", href: `${base}/overview`, icon: ICONS.overview },
    { label: "Inbox", section: "inbox", href: `${base}/inbox`, icon: ICONS.inbox },
    { label: "Review Queue", section: "review", href: `${base}/review`, icon: ICONS.review },
    { label: "Cases", section: "cases", href: `${base}/cases`, icon: ICONS.cases },
    { label: "Entities", section: "entities", href: `${base}/entities`, icon: ICONS.entities },
    { label: "Decisions", section: "decisions", href: `${base}/decisions`, icon: ICONS.decisions },
    { label: "Audit", section: "audit", href: `${base}/audit`, icon: ICONS.audit },
    { label: "About this pack", section: "about-pack", href: `${base}/about-pack`, icon: ICONS.about },
  ];

  const technicalLinks = [
    { label: "Artifacts", href: `${base}/technical/artifacts/${defaultArtifactId}` },
    { label: "Rules", href: `${base}/technical/rules/${defaultRuleId}` },
  ];

  function isActive(linkSection: string) {
    return section === linkSection || section.startsWith(`${linkSection}-`);
  }

  const technicalActive = section.startsWith("technical");

  const linkClasses = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-soft-ink)]"
        : "text-ink-muted hover:bg-surface-muted hover:text-ink"
    }`;

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      <ul className="flex flex-col gap-0.5">
        {links.map((link) => (
          <li key={link.section}>
            <a
              href={withLens(link.href, lens)}
              aria-current={isActive(link.section) ? "page" : undefined}
              className={linkClasses(isActive(link.section))}
            >
              {link.icon}
              {link.label}
            </a>
          </li>
        ))}
        <li className="pt-2">
          <span
            aria-current={technicalActive ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
              technicalActive ? "text-[var(--color-accent-soft-ink)]" : "text-ink-faint"
            }`}
          >
            {ICONS.branch}
            Technical
          </span>
          <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
            {technicalLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={withLens(link.href, lens)}
                  className="block rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
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
