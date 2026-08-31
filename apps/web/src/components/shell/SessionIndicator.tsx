"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

/**
 * Guest session indicator + Reset demo action (UX_SPEC §1.2). P0 has no
 * server-side session store (non-goal), so Reset simply returns the visitor
 * to the scenario selector to start a fresh guided workspace.
 */
export function SessionIndicator({ minutesRemaining }: { minutesRemaining: number }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2 text-xs text-ink-muted">
      <span>Guest session · {minutesRemaining} min remaining</span>
      <Button variant="secondary" type="button" onClick={() => router.push("/demo")}>
        Reset demo
      </Button>
    </div>
  );
}
