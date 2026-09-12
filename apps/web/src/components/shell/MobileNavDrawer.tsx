"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/** Left rail at desktop (≥1280px); collapsible drawer below that (UX_SPEC §1.2). */
export function MobileNavDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="border-b border-border p-2 xl:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="primary-nav-drawer"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-card transition-colors hover:bg-surface-muted"
        >
          <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            {open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          {open ? "Close menu" : "Menu"}
        </button>
      </div>
      <div
        id="primary-nav-drawer"
        className={`${open ? "block" : "hidden"} border-r border-border bg-surface p-3 xl:block xl:w-60 xl:shrink-0`}
      >
        {children}
      </div>
    </>
  );
}
