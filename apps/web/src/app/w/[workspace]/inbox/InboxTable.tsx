"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Artifact } from "@oiw/contracts";

import { processArtifactAction } from "@/app/w/[workspace]/inbox/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface InboxRow {
  artifact: Artifact;
  sourceName: string;
  linkedEntity: string | null;
  observationsFound: number;
  reviewRequired: boolean;
  relatedCaseTitle: string | null;
  technicalHref: string;
  fixtureId: string | null;
}

/** The guided tour's pinned artifact (UX_SPEC §4; asset-reliability only, DEMO_SCRIPT step 3). */
export const TOUR_TARGET_FIXTURE_ID = "asset-reliability-demo-001";

const STATUS_LABEL: Record<Artifact["processingStatus"], string> = {
  received: "Received",
  processing: "Processing",
  processed: "Processed",
  "needs-review": "Needs review",
  "failed-retryable": "Failed (retryable)",
  "failed-terminal": "Failed",
};

const RETRYABLE_STATUSES: ReadonlySet<Artifact["processingStatus"]> = new Set([
  "received",
  "failed-retryable",
  "failed-terminal",
]);

/**
 * Process (UX_SPEC §5.5, NFR §16.1) synchronously runs the real
 * `processArtifact` orchestration (OIW-301) server-side. The row updates in
 * place from the action's result without a full table reload; `router.refresh()`
 * then re-syncs the rest of the table's server-derived columns (observation
 * counts, review-required) in the background on the next paint.
 */
export function InboxTable({ workspace, rows }: { workspace: string; rows: InboxRow[] }) {
  const router = useRouter();
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Artifact["processingStatus"]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  async function process(artifactId: string) {
    setProcessingIds((prev) => new Set(prev).add(artifactId));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[artifactId];
      return next;
    });

    const result = await processArtifactAction(workspace, artifactId);

    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(artifactId);
      return next;
    });

    if (result.ok) {
      setStatusOverrides((prev) => ({ ...prev, [artifactId]: result.status }));
      router.refresh();
    } else {
      setErrors((prev) => ({ ...prev, [artifactId]: result.message }));
    }
  }

  return (
    <table data-tour="tour-inbox-table" className="w-full border-collapse text-sm">
      <caption className="sr-only">Artifact inbox</caption>
      <thead>
        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
          <th scope="col" className="px-2 py-2">Source</th>
          <th scope="col" className="px-2 py-2">Artifact type</th>
          <th scope="col" className="px-2 py-2">Received</th>
          <th scope="col" className="px-2 py-2">Status</th>
          <th scope="col" className="hidden px-2 py-2 xl:table-cell">Linked entity</th>
          <th scope="col" className="hidden px-2 py-2 xl:table-cell">Observations</th>
          <th scope="col" className="hidden px-2 py-2 xl:table-cell">Review required</th>
          <th scope="col" className="hidden px-2 py-2 xl:table-cell">Related case</th>
          <th scope="col" className="px-2 py-2">Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const { artifact, sourceName, linkedEntity, observationsFound, reviewRequired, relatedCaseTitle, technicalHref, fixtureId } = row;
          const status = statusOverrides[artifact.id] ?? artifact.processingStatus;
          const isProcessing = processingIds.has(artifact.id);
          const error = errors[artifact.id];
          const isTourTarget = fixtureId === TOUR_TARGET_FIXTURE_ID;
          return (
            <tr
              key={artifact.id}
              data-tour={isTourTarget ? "tour-inbox-target-row" : undefined}
              className="border-b border-border last:border-0"
            >
              <td className="px-2 py-2">
                <a href={technicalHref} className="font-medium text-[var(--color-accent)] underline-offset-2 hover:underline">
                  {sourceName}
                </a>
              </td>
              <td className="px-2 py-2">{artifact.artifactType}</td>
              <td className="px-2 py-2">{new Date(artifact.receivedAt).toLocaleString()}</td>
              <td className="px-2 py-2">
                {isProcessing ? (
                  <span role="status" className="text-ink-muted">Processing…</span>
                ) : (
                  <Badge tone={status === "needs-review" ? "warn" : status.startsWith("failed") ? "critical" : "neutral"}>
                    {STATUS_LABEL[status]}
                  </Badge>
                )}
                {error ? (
                  <p role="alert" className="mt-1 text-xs text-[var(--color-critical-ink)]">
                    {error}
                  </p>
                ) : null}
              </td>
              <td className="hidden px-2 py-2 xl:table-cell">{linkedEntity ?? "—"}</td>
              <td className="hidden px-2 py-2 xl:table-cell">{observationsFound}</td>
              <td className="hidden px-2 py-2 xl:table-cell">{reviewRequired ? "Yes" : "No"}</td>
              <td className="hidden px-2 py-2 xl:table-cell">{relatedCaseTitle ?? "—"}</td>
              <td className="px-2 py-2">
                <Button
                  data-tour={isTourTarget ? "tour-process-target" : undefined}
                  variant={status.startsWith("failed") ? "danger" : "secondary"}
                  type="button"
                  disabled={!RETRYABLE_STATUSES.has(status) || isProcessing}
                  onClick={() => void process(artifact.id)}
                >
                  {status.startsWith("failed") ? "Retry" : "Process"}
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
