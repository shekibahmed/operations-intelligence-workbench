"use client";

import { Button } from "@/components/ui/Button";

/**
 * `onRetryHref` navigates there on Retry; otherwise Retry reloads the
 * current page. Either way this is a single real `<button>` — not a
 * `<button>` wrapping an `<a>`, which is invalid, ambiguous-to-assistive-
 * tech nested interactive markup.
 */
export function ErrorState({
  message = "Something went wrong loading this content.",
  onRetryHref,
}: {
  message?: string;
  onRetryHref?: string;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-4 text-sm text-[var(--color-critical-ink)]">
      <p>{message}</p>
      <Button
        variant="secondary"
        type="button"
        onClick={() => {
          if (onRetryHref !== undefined) window.location.assign(onRetryHref);
          else window.location.reload();
        }}
      >
        Retry
      </Button>
    </div>
  );
}
