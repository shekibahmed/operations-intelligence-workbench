"use client";

import { useState } from "react";

import { startGuestWorkspace } from "@/app/demo/[pack]/actions";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { isRedirectError } from "@/lib/is-redirect-error";

/**
 * `forcedState` lets `?state=loading|error` demonstrate those states without
 * a click, for review/screenshot purposes (PRD §16.2 default state remains a
 * real click against `startGuestWorkspace`).
 */
export function GuidedStartActions({
  packId,
  forcedState,
}: {
  packId: string;
  forcedState?: "loading" | "error" | undefined;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function start(target: "tour" | "free") {
    setError(false);
    setPending(true);
    try {
      await startGuestWorkspace(packId, target);
      // startGuestWorkspace redirects on success; falling through here means
      // it returned without redirecting, which should never happen.
    } catch (thrown) {
      if (isRedirectError(thrown)) throw thrown;
      setPending(false);
      setError(true);
    }
  }

  if (forcedState === "loading" || pending) {
    return (
      <div role="status" aria-live="polite" className="text-sm text-ink-muted">
        Creating your synthetic workspace…
      </div>
    );
  }

  if (forcedState === "error" || error) {
    return (
      <ErrorState message="Could not create the workspace. No partial workspace was created." />
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary" type="button" onClick={() => start("tour")}>
        Start guided tour
      </Button>
      <Button variant="secondary" type="button" onClick={() => start("free")}>
        Explore freely
      </Button>
    </div>
  );
}
