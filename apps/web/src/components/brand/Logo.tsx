/** Brand mark: a signal trace inside a rounded tile. Purely decorative. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="oiw-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2b5ce6" />
          <stop offset="1" stopColor="#1a41b5" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#oiw-logo-grad)" />
      <path
        d="M6.5 20.5h4l3-9.5 4 13 3-8.5h4.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25" cy="15.5" r="1.8" fill="#ffffff" />
    </svg>
  );
}

/** Full lock-up: mark + wordmark. Wordmark is the accessible name carrier. */
export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
    >
      <LogoMark size={compact ? 24 : 28} />
      <span className="flex flex-col leading-none">
        <span className="text-[0.95rem] font-semibold tracking-tight text-ink">
          Operations Intelligence
        </span>
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Workbench
        </span>
      </span>
    </a>
  );
}
