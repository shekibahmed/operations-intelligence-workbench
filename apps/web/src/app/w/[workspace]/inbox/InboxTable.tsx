"use client";

import { useState } from "react";
import type { Artifact } from "@oiw/contracts";

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
}

function rowNeedsReview(row: InboxRow): boolean {
  return row.reviewRequired;
}

const STATUS_LABEL: Record<Artifact["processingStatus"], string> = {
  received: "Received",
  processing: "Processing",
  processed: "Processed",
  "needs-review": "Needs review",
  "failed-retryable": "Failed (retryable)",
  "failed-terminal": "Failed",
};

/**
 * Processing here is a client-local simulation (Process → brief spinner →
 * "processed"/"needs-review") since Wave 1 has no ingestion engine
 * (non-goal). The row updates in place without a full table reload, per
 * UX_SPEC §5.5.
 */
export function InboxTable({ rows }: { rows: InboxRow[] }) {
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Artifact["processingStatus"]>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  function process(artifactId: string, needsReview: boolean) {
    setProcessingIds((prev) => new Set(prev).add(artifactId));
    window.setTimeout(() => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(artifactId);
        return next;
      });
      setStatusOverrides((prev) => ({ ...prev, [artifactId]: needsReview ? "needs-review" : "processed" }));
    }, 500);
  }

  return (
    <table className="w-full border-collapse text-sm">
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
          const { artifact, sourceName, linkedEntity, observationsFound, reviewRequired, relatedCaseTitle, technicalHref } = row;
          const status = statusOverrides[artifact.id] ?? artifact.processingStatus;
          const isProcessing = processingIds.has(artifact.id);
          return (
            <tr key={artifact.id} className="border-b border-border last:border-0">
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
              </td>
              <td className="hidden px-2 py-2 xl:table-cell">{linkedEntity ?? "—"}</td>
              <td className="hidden px-2 py-2 xl:table-cell">{observationsFound}</td>
              <td className="hidden px-2 py-2 xl:table-cell">{reviewRequired ? "Yes" : "No"}</td>
              <td className="hidden px-2 py-2 xl:table-cell">{relatedCaseTitle ?? "—"}</td>
              <td className="px-2 py-2">
                <Button
                  variant="secondary"
                  type="button"
                  disabled={status !== "received" || isProcessing}
                  onClick={() => process(artifact.id, rowNeedsReview(row))}
                >
                  Process
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
