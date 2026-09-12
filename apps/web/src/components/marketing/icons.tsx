import type { ReactNode, SVGProps } from "react";

/**
 * Small hand-rolled stroke icon set for the marketing pages (24×24 grid,
 * 1.8px stroke). Decorative only — every consumer supplies adjacent text.
 */
function IconBase({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconFiles(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </IconBase>
  );
}

export function IconScan(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function IconEye(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function IconZap(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </IconBase>
  );
}

export function IconBranch(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 3v12" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </IconBase>
  );
}

export function IconShieldCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 11.5 2 2 4-4" />
    </IconBase>
  );
}

export function IconChart(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 20h16" />
      <path d="M7 16v-5M12 16V6M17 16v-8" />
    </IconBase>
  );
}

export function IconDownload(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 3v12" />
    </IconBase>
  );
}

export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </IconBase>
  );
}

export function IconLock(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </IconBase>
  );
}

export function IconPackage(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </IconBase>
  );
}

export function IconTarget(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </IconBase>
  );
}

export function IconMessage(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </IconBase>
  );
}

export function IconChecklist(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m3 6 1.5 1.5L7 5" />
      <path d="m3 12 1.5 1.5L7 11" />
      <path d="m3 18 1.5 1.5L7 17" />
      <path d="M11 6h10M11 12h10M11 18h10" />
    </IconBase>
  );
}

export function IconTrendUp(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </IconBase>
  );
}
