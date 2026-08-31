"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";

/**
 * Workspace creation (PRD §16.2: "should feel immediate") is simulated with
 * a short delay against the in-repo stub workspace — there is no real
 * workspace-creation backend in Wave 1 (OIW-201 non-goal). `forcedState`
 * lets `?state=loading|error` demonstrate those states without a click, for
 * review/screenshot purposes.
 */
export function GuidedStartActions({
  workspaceSlug,
  forcedState,
}: {
  workspaceSlug: string;
  forcedState?: "loading" | "error" | undefined;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  function start(target: "tour" | "free") {
    setError(false);
    setPending(true);
    window.setTimeout(() => {
      const href =
        target === "tour"
          ? `/w/${workspaceSlug}/inbox?lens=operations&tour=1`
          : `/w/${workspaceSlug}/overview?lens=leadership`;
      router.push(href);
    }, 400);
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
