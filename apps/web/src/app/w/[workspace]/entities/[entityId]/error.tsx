"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function EntityDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div>
      <ErrorState message="Could not load this entity." />
      <button type="button" onClick={reset} className="mt-2 text-sm font-medium text-[var(--color-accent)] hover:underline">
        Try again
      </button>
    </div>
  );
}
