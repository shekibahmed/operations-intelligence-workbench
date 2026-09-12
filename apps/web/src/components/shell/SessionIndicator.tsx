"use client";

import { useState } from "react";

import { resetWorkspace } from "@/app/w/[workspace]/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { isRedirectError } from "@/lib/is-redirect-error";

/** Guest session indicator + Reset demo action (UX_SPEC §1.2). */
export function SessionIndicator({ workspace, minutesRemaining }: { workspace: string; minutesRemaining: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function confirmReset() {
    setError(false);
    setPending(true);
    try {
      await resetWorkspace(workspace);
    } catch (thrown) {
      if (isRedirectError(thrown)) throw thrown;
      setPending(false);
      setError(true);
    }
  }

  return (
    <div className="flex items-center gap-2.5 text-xs text-ink-muted">
      <span className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 shadow-card sm:flex">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok-ink)]" />
        Guest session · {minutesRemaining} min remaining
      </span>
      <ConfirmDialog
        trigger={
          <Button variant="secondary" type="button" disabled={pending}>
            {pending ? "Resetting…" : "Reset demo"}
          </Button>
        }
        title="Reset this demo workspace?"
        description="This restores every source, artifact and record to its original seeded state. This cannot be undone."
        confirmLabel="Reset demo"
        onConfirm={() => {
          void confirmReset();
        }}
      />
      {error ? <span role="alert" className="text-[var(--color-critical-ink)]">Could not reset the workspace.</span> : null}
    </div>
  );
}
