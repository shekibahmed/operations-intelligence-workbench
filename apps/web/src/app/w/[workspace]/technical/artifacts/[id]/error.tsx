"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function ArtifactInspectorError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div>
      <ErrorState message="Could not load derived data for this artifact." />
      <button type="button" onClick={reset} className="mt-2 text-sm font-medium text-[var(--color-accent)] hover:underline">
        Try again
      </button>
    </div>
  );
}
