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
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink"
        >
          {open ? "Close menu" : "Menu"}
        </button>
      </div>
      <div
        id="primary-nav-drawer"
        className={`${open ? "block" : "hidden"} border-r border-border bg-surface p-3 xl:block xl:w-56 xl:shrink-0`}
      >
        {children}
      </div>
    </>
  );
}
