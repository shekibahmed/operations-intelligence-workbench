import Link from "next/link";

import { LogoMark } from "@/components/brand/Logo";
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from "@/components/ui/Button";

/**
 * Branded 404. The copy "This page could not be found." is asserted by the
 * e2e security spec (unauthenticated workspace access lands here) — keep the
 * exact string.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <LogoMark size={40} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-soft-ink)]">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          This page could not be found.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">
          The link may be stale, or the demonstration workspace you followed
          may have expired — guest workspaces are isolated and time-limited by
          design.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/demo" className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.primary}`}>
          Start the demonstration
        </Link>
        <Link href="/" className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.secondary}`}>
          Back to the start
        </Link>
      </div>
    </main>
  );
}
