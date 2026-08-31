import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Operations Intelligence Workbench",
  description: "A neutral operational-intelligence platform demonstration.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-muted text-ink antialiased">{children}</body>
    </html>
  );
}
