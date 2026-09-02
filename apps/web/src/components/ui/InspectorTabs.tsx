"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useRouter } from "next/navigation";

/**
 * The Artifact / Rule trace tab strip shared by R12/R13 (UX_SPEC §5.12):
 * "Both routes share one navigation frame... the URL still changes per
 * route." Selecting a tab navigates rather than toggling in place.
 */
export function InspectorTabs({
  active,
  artifactHref,
  ruleHref,
}: {
  active: "artifact" | "rule";
  artifactHref: string;
  ruleHref: string;
}) {
  const router = useRouter();

  return (
    <Tabs.Root
      value={active}
      onValueChange={(value) => router.push(value === "artifact" ? artifactHref : ruleHref)}
    >
      <Tabs.List aria-label="Technical inspector" className="flex gap-1 border-b border-border">
        <Tabs.Trigger
          value="artifact"
          className="rounded-t-md px-3 py-2 text-sm font-medium text-ink-muted data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-ink"
        >
          Artifact
        </Tabs.Trigger>
        <Tabs.Trigger
          value="rule"
          className="rounded-t-md px-3 py-2 text-sm font-medium text-ink-muted data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)] data-[state=active]:text-ink"
        >
          Rule trace
        </Tabs.Trigger>
      </Tabs.List>
      {/*
        Each Trigger's `aria-controls` always references its matching
        Content's id, even for the inactive tab — without a real Content
        element for both values, that reference points at nothing, an
        invalid ARIA attribute value. The real "panel" per tab is the rest
        of this route's page (a full navigation, not an in-place switch),
        so these stay empty and hidden — they exist only to keep the
        Trigger/Content id pairing valid.
      */}
      <Tabs.Content value="artifact" forceMount hidden={active !== "artifact"} />
      <Tabs.Content value="rule" forceMount hidden={active !== "rule"} />
    </Tabs.Root>
  );
}
