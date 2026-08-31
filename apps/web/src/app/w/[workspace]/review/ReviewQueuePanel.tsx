"use client";

import { useRef, useState } from "react";
import type { JsonValue, Observation } from "@oiw/contracts";

import {
  acceptObservation,
  correctObservation,
  getObservationRevisions,
  markInsufficientEvidence,
  rejectObservation,
  type ReviewActionResult,
} from "@/app/w/[workspace]/review/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { highlightRanges } from "@/lib/highlight-text";
import { formatConfidence, REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/lib/observation-display";

export interface ReviewQueueEntry {
  observation: Observation;
  valueType: "string" | "number" | "boolean" | "object";
  rawText: string | null;
  evidence: {
    kind: "text-range" | "page" | "table-cell" | "json-path" | "attachment";
    label: string;
    excerpt: string | null;
    textRange: { start: number; end: number } | null;
  } | null;
}

function valueLabel(value: JsonValue | null): string {
  if (value === null) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/**
 * Two/three-pane Review Queue (UX_SPEC §5.6), wired to the real
 * accept/correct/reject/mark-insufficient server actions. Completing an
 * action removes the item from the local queue and moves focus to the next
 * item's heading (UX_SPEC accessibility requirement); a failed action keeps
 * the item selected with its draft input intact rather than discarding it.
 */
export function ReviewQueuePanel({ workspace, entries }: { workspace: string; entries: ReviewQueueEntry[] }) {
  const [queue, setQueue] = useState(entries);
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.observation.id ?? null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionDraft, setCorrectionDraft] = useState("");
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [insufficientReason, setInsufficientReason] = useState("");
  const [history, setHistory] = useState<Observation[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const selected = queue.find((entry) => entry.observation.id === selectedId) ?? null;

  function resetDrafts() {
    setActionError(null);
    setShowCorrection(false);
    setCorrectionDraft("");
    setShowInsufficient(false);
    setInsufficientReason("");
    setHistory(null);
  }

  function selectItem(id: string) {
    setSelectedId(id);
    resetDrafts();
  }

  function advancePastCurrent() {
    setQueue((prev) => {
      const remaining = prev.filter((entry) => entry.observation.id !== selectedId);
      setSelectedId(remaining[0]?.observation.id ?? null);
      return remaining;
    });
    resetDrafts();
    window.setTimeout(() => headingRef.current?.focus(), 0);
  }

  async function runAction(run: () => Promise<ReviewActionResult>) {
    setPending(true);
    setActionError(null);
    const result = await run();
    setPending(false);
    if (result.ok) advancePastCurrent();
    else setActionError(result.message);
  }

  async function handleAcceptCandidate(candidateValue: JsonValue, candidateConfidence: number) {
    if (selected === null) return;
    await runAction(() =>
      acceptObservation(workspace, selected.observation.id, {
        value: candidateValue,
        normalisedValue: candidateValue,
        confidence: candidateConfidence,
      }),
    );
  }

  async function handleCorrect() {
    if (selected === null) return;
    if (correctionDraft.trim().length === 0) {
      setActionError("Enter a corrected value before saving.");
      return;
    }
    await runAction(() => correctObservation(workspace, selected.observation.id, correctionDraft.trim()));
  }

  async function handleInsufficient() {
    if (selected === null) return;
    if (insufficientReason.trim().length === 0) {
      setActionError("A reason is required to mark this observation as insufficient evidence.");
      return;
    }
    await runAction(() => markInsufficientEvidence(workspace, selected.observation.id, insufficientReason.trim()));
  }

  async function toggleHistory() {
    if (selected === null) return;
    if (history !== null) {
      setHistory(null);
      return;
    }
    setHistoryLoading(true);
    try {
      setHistory(await getObservationRevisions(workspace, selected.observation.id));
    } catch {
      setActionError("Could not load revision history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  if (queue.length === 0 || selected === null) {
    return <EmptyState title="Review queue is clear" description="There is nothing pending review right now." />;
  }

  const { observation } = selected;
  const highlightRange = selected.evidence?.textRange ?? null;
  const rawText = selected.rawText ?? "";

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[16rem_1fr_20rem]">
      <nav aria-label="Review queue" className="rounded-lg border border-border bg-surface p-2">
        <ul className="flex flex-col gap-1">
          {queue.map((entry, index) => (
            <li key={entry.observation.id}>
              <button
                type="button"
                onClick={() => selectItem(entry.observation.id)}
                aria-current={entry.observation.id === selectedId ? "true" : undefined}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                  entry.observation.id === selectedId ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "text-ink hover:bg-surface-muted"
                }`}
              >
                Item {index + 1}: {entry.observation.schemaKey}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-ink outline-none">
          Raw source
        </h2>
        {selected.evidence === null ? (
          <p className="mt-2 text-sm text-ink-muted">No evidence segment recorded for this observation.</p>
        ) : highlightRange !== null && rawText.length > 0 ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{highlightRanges(rawText, [highlightRange])}</p>
        ) : (
          <div className="mt-2 text-sm text-ink">
            <p className="font-medium text-ink-muted">{selected.evidence.label}</p>
            {selected.evidence.excerpt !== null ? (
              <blockquote className="mt-1 border-l-2 border-border pl-2 text-ink">{selected.evidence.excerpt}</blockquote>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Observation detail</h2>
        <dl className="text-sm">
          <dt className="font-medium text-ink-muted">Field</dt>
          <dd className="text-ink">{observation.schemaKey}</dd>
          <dt className="mt-2 font-medium text-ink-muted">Extracted value</dt>
          <dd className="text-ink">
            {observation.evidenceStatus === "insufficient-evidence"
              ? `Insufficient evidence — ${observation.insufficiencyReason ?? "no reason recorded"}`
              : valueLabel(observation.value)}
          </dd>
          <dt className="mt-2 font-medium text-ink-muted">Confidence</dt>
          <dd className="text-ink">{formatConfidence(observation.confidence)}</dd>
          <dt className="mt-2 font-medium text-ink-muted">Status</dt>
          <dd>
            <Badge tone={REVIEW_STATUS_TONE[observation.reviewStatus]}>{REVIEW_STATUS_LABEL[observation.reviewStatus]}</Badge>
          </dd>
          {observation.extractor !== null ? (
            <>
              <dt className="mt-2 font-medium text-ink-muted">Extractor</dt>
              <dd className="text-ink">
                {observation.extractor.id}@{observation.extractor.version}
              </dd>
            </>
          ) : null}
        </dl>

        {observation.alternativeCandidates !== undefined && observation.alternativeCandidates.length > 0 ? (
          <fieldset className="rounded-md border border-border p-2">
            <legend className="px-1 text-xs font-medium text-ink-muted">Alternative candidates</legend>
            <ul className="flex flex-col gap-1">
              {observation.alternativeCandidates.map((candidate, index) => (
                <li key={index} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink">
                    {valueLabel(candidate.value)} <span className="text-ink-muted">({formatConfidence(candidate.confidence)})</span>
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => void handleAcceptCandidate(candidate.value, candidate.confidence)}
                  >
                    Accept this candidate
                  </Button>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        {actionError !== null ? (
          <p
            role="alert"
            className="rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-2 text-xs text-[var(--color-critical-ink)]"
          >
            {actionError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={pending} onClick={() => void runAction(() => acceptObservation(workspace, observation.id))}>
            Accept
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setShowCorrection((prev) => !prev);
              setShowInsufficient(false);
            }}
          >
            Correct
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => void runAction(() => rejectObservation(workspace, observation.id))}
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setShowInsufficient((prev) => !prev);
              setShowCorrection(false);
            }}
          >
            Mark insufficient evidence
          </Button>
        </div>

        {showCorrection ? (
          <label className="text-sm">
            <span className="font-medium text-ink">Corrected value ({selected.valueType})</span>
            <textarea
              className="mt-1 w-full rounded-md border border-border p-2 text-sm"
              rows={2}
              value={correctionDraft}
              onChange={(event) => setCorrectionDraft(event.target.value)}
            />
            <Button type="button" className="mt-2" disabled={pending} onClick={() => void handleCorrect()}>
              Save correction
            </Button>
          </label>
        ) : null}

        {showInsufficient ? (
          <label className="text-sm">
            <span className="font-medium text-ink">Reason evidence is insufficient</span>
            <textarea
              className="mt-1 w-full rounded-md border border-border p-2 text-sm"
              rows={2}
              value={insufficientReason}
              onChange={(event) => setInsufficientReason(event.target.value)}
            />
            <Button type="button" className="mt-2" disabled={pending} onClick={() => void handleInsufficient()}>
              Save
            </Button>
          </label>
        ) : null}

        <div>
          <Button type="button" variant="secondary" disabled={historyLoading} onClick={() => void toggleHistory()}>
            {history === null ? "View revision history" : "Hide revision history"}
          </Button>
          {history !== null ? (
            history.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">No prior revisions — this is the original extracted value.</p>
            ) : (
              <ol className="mt-2 flex flex-col gap-1 text-xs text-ink-muted">
                {history.map((revision, index) => (
                  <li key={index}>
                    {valueLabel(revision.value)} — {REVIEW_STATUS_LABEL[revision.reviewStatus]}
                    {revision.reviewedAt !== null ? ` (${new Date(revision.reviewedAt).toLocaleString()})` : ""}
                  </li>
                ))}
              </ol>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
