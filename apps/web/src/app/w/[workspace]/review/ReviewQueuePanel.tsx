"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export interface ReviewQueueEntry {
  id: string;
  schemaKey: string;
  value: string;
  confidence: number;
  alternativeCandidate: string | null;
  evidenceCitation: string;
  rawText: string;
  rawExcerpt: string;
}

/**
 * Two/three-pane Review Queue (UX_SPEC §5.6). Actions are simulated locally
 * (no review-write backend in Wave 1); completing one advances to the next
 * queue item and moves focus to its heading, so keyboard/screen-reader users
 * are not stranded on a control that just left the page.
 */
export function ReviewQueuePanel({ entries, forcedError }: { entries: ReviewQueueEntry[]; forcedError?: boolean }) {
  const [queue, setQueue] = useState(entries);
  const [selectedId, setSelectedId] = useState(entries[0]?.id ?? null);
  const [actionError, setActionError] = useState(forcedError ?? false);
  const [note, setNote] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const selected = queue.find((entry) => entry.id === selectedId) ?? null;

  function complete(action: string) {
    if (forcedError) {
      setActionError(true);
      return;
    }
    setActionError(false);
    const remaining = queue.filter((entry) => entry.id !== selectedId);
    setQueue(remaining);
    setSelectedId(remaining[0]?.id ?? null);
    setNote("");
    window.setTimeout(() => headingRef.current?.focus(), 0);
    void action;
  }

  if (queue.length === 0) {
    return <EmptyState title="Review queue is clear" description="There is nothing pending review right now." />;
  }

  const highlightIndex = selected ? selected.rawText.indexOf(selected.rawExcerpt) : -1;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[16rem_1fr_20rem]">
      <nav aria-label="Review queue" className="rounded-lg border border-border bg-surface p-2">
        <ul className="flex flex-col gap-1">
          {queue.map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setSelectedId(entry.id)}
                aria-current={entry.id === selectedId ? "true" : undefined}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                  entry.id === selectedId ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "text-ink hover:bg-surface-muted"
                }`}
              >
                Item {index + 1}: {entry.schemaKey}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {selected ? (
        <>
          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-ink outline-none">
              Raw source
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
              {highlightIndex >= 0 ? (
                <>
                  {selected.rawText.slice(0, highlightIndex)}
                  <mark className="rounded bg-[var(--color-warn-surface)] underline decoration-2 underline-offset-2">
                    {selected.rawExcerpt}
                  </mark>
                  {selected.rawText.slice(highlightIndex + selected.rawExcerpt.length)}
                </>
              ) : (
                selected.rawText
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold text-ink">Observation detail</h2>
            <dl className="text-sm">
              <dt className="font-medium text-ink-muted">Field</dt>
              <dd className="text-ink">{selected.schemaKey}</dd>
              <dt className="mt-2 font-medium text-ink-muted">Extracted value</dt>
              <dd className="text-ink">{selected.value}</dd>
              <dt className="mt-2 font-medium text-ink-muted">Confidence</dt>
              <dd className="text-ink">{Math.round(selected.confidence * 100)}%</dd>
              {selected.alternativeCandidate ? (
                <>
                  <dt className="mt-2 font-medium text-ink-muted">Alternative candidate</dt>
                  <dd className="text-ink">{selected.alternativeCandidate}</dd>
                </>
              ) : null}
              <dt className="mt-2 font-medium text-ink-muted">Evidence</dt>
              <dd className="text-ink">{selected.evidenceCitation}</dd>
            </dl>

            <label className="text-sm">
              <span className="font-medium text-ink">Reviewer note</span>
              <textarea
                className="mt-1 w-full rounded-md border border-border p-2 text-sm"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>

            {actionError ? (
              <p role="alert" className="rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-2 text-xs text-[var(--color-critical-ink)]">
                Could not save this review action. Your selection and note have been kept.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => complete("accept")}>Accept</Button>
              <Button type="button" variant="secondary" onClick={() => complete("correct")}>Correct</Button>
              <Button type="button" variant="danger" onClick={() => complete("reject")}>Reject</Button>
              <Button type="button" variant="secondary" onClick={() => complete("insufficient")}>Mark insufficient evidence</Button>
              <Button type="button" variant="secondary" onClick={() => complete("link-entity")}>Link entity</Button>
              <Button type="button" variant="secondary" onClick={() => complete("create-entity")}>Create entity</Button>
              <Button type="button" variant="secondary" onClick={() => complete("add-note")}>Add reviewer note</Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
