import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from "@/components/ui/Button";
import { FIRM } from "@/lib/firm";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#scenarios", label: "Scenarios" },
  { href: "https://github.com/shekibahmed/operations-intelligence-workbench", label: "GitHub" },
];

/** Sticky marketing header shown on the public, pre-workspace routes. */
export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Marketing" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/adapt"
            className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.secondary} hidden sm:inline-flex`}
          >
            Adapt this workflow
          </Link>
          <Link href="/demo" className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.primary}`}>
            Try the demo
          </Link>
        </div>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    heading: "Platform",
    links: [
      { href: "/demo", label: "Guided demonstration" },
      { href: "/adapt", label: "Adapt this workflow" },
      {
        href: "https://github.com/shekibahmed/operations-intelligence-workbench",
        label: "Source repository",
      },
      {
        href: "https://github.com/shekibahmed/operations-intelligence-workbench/blob/main/docs/ARCHITECTURE.md",
        label: "Architecture",
      },
      {
        href: "https://github.com/shekibahmed/operations-intelligence-workbench/blob/main/docs/SECURITY.md",
        label: "Security model",
      },
    ],
  },
  {
    heading: "Scenario packs",
    links: [
      { href: "/demo/asset-reliability", label: "Asset Reliability" },
      { href: "/demo/process-exceptions", label: "Process Exception Management" },
      { href: "/demo/document-assurance", label: "Document Assurance" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { href: FIRM.site, label: "bekaamchor.com" },
      { href: `mailto:${FIRM.email}`, label: FIRM.email },
      { href: FIRM.whatsapp, label: "WhatsApp" },
      { href: FIRM.linkedin, label: "LinkedIn" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm text-ink-muted">
              An open-source reference platform for evidence-backed operational decisions —
              every conclusion cited, every high-risk action human-approved.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                {column.heading}
              </h2>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built by{" "}
            <a href={FIRM.site} className="font-medium text-ink-muted hover:text-ink">
              {FIRM.name}
            </a>{" "}
            · Apache-2.0
          </p>
          <p>The demonstration uses synthetic operational information only.</p>
        </div>
      </div>
    </footer>
  );
}
