import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import "@/app/globals.css";

/**
 * Vendored variable font (SIL OFL 1.1, licence alongside the file) so the
 * demo needs no network access and builds stay reproducible offline.
 */
const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  style: "normal",
});

const SITE_NAME = "Operations Intelligence Workbench";
const DESCRIPTION =
  "Turn scattered operational information into evidence-backed observations, governed decisions and a complete audit trail. Open-source, industry-neutral, deterministic demo.";

/** Canonical origin for social cards; override when a hosted demo exists. */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — evidence-backed operations, human-approved`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "operations intelligence",
    "audit trail",
    "human in the loop",
    "decision governance",
    "evidence-based operations",
    "scenario packs",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — evidence-backed operations, human-approved`,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — evidence-backed operations, human-approved`,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1f4fd8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-muted font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
