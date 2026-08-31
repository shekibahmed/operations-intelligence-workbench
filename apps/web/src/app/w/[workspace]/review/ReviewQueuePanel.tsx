"use client";

import { useRef, useState } from "react";
import type { AuditEntry, Entity, JsonValue, Observation } from "@oiw/contracts";

import {
  acceptObservation,
  addReviewerNote,
  correctObservation,
  createEntityAction,
  getObservationNotes,
  getObservationRevisions,
  linkEntityAction,
  markInsufficientEvidence,
  rejectObservation,
  type ReviewActionResult,
} from "@/app/w/[workspace]/review/actions";
import { CreateEntityDialog, LinkEntityDialog } from "@/app/w/[workspace]/review/EntityActions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { highlightRanges } from "@/lib/highlight-text";
import { formatConfidence, REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from "@/lib/observation-display";
import type { PackLabels } from "@/lib/pack-labels";
import { resolveLabel } from "@/lib/pack-labels";

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
export function ReviewQueuePanel({
  workspace,
  entries,
  entities: initialEntities,
  entityTypes,
  labels,
}: {
  workspace: string;
  entries: ReviewQueueEntry[];
  entities: Entity[];
  entityTypes: { id: string; displayName: string }[];
  labels: PackLabels;
}) {
  const [queue, setQueue] = useState(entries);
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.observation.id ?? null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionDraft, setCorrectionDraft] = useState("");
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [insufficientReason, setInsufficientReason] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [history, setHistory] = useState<Observation[] | null>(null);
  const [notes, setNotes] = useState<AuditEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [entities, setEntities] = useState(initialEntities);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const entityTypeLabel = (entityType: string) => resolveLabel(labels, "entityTypes", entityType);

  const selected = queue.find((entry) => entry.observation.id === selectedId) ?? null;

  function resetDrafts() {
    setActionError(null);
    setShowCorrection(false);
    setCorrectionDraft("");
    setShowInsufficient(false);
    setInsufficientReason("");
    setShowNoteForm(false);
    setNoteDraft("");
    setHistory(null);
    setNotes(null);
  }

  function updateSelectedObservation(observation: Observation) {
    setQueue((prev) => prev.map((entry) => (entry.observation.id === observation.id ? { ...entry, observation } : entry)));
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
      setNotes(null);
      return;
    }
    setHistoryLoading(true);
    try {
      const [revisions, observationNotes] = await Promise.all([
        getObservationRevisions(workspace, selected.observation.id),
        getObservationNotes(workspace, selected.observation.id),
      ]);
      setHistory(revisions);
      setNotes(observationNotes);
    } catch {
      setActionError("Could not load revision history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  /**
   * Link/Create entity and Add reviewer note do not change `reviewStatus`
   * (only Accept/Correct/Reject/Mark insufficient evidence resolve an item),
   * so — unlike `runAction` — they keep the item selected rather than
   * advancing the queue.
   */
  async function handleLinkEntity(entityId: string) {
    if (selected === null) return { ok: false, message: "No observation selected." };
    setPending(true);
    setActionError(null);
    const result = await linkEntityAction(workspace, selected.observation.id, entityId);
    setPending(false);
    if (result.ok) {
      updateSelectedObservation(result.observation);
      return { ok: true };
    }
    setActionError(result.message);
    return { ok: false, message: result.message };
  }

  async function handleCreateEntity(input: { entityType: string; displayName: string; externalReference: string }) {
    if (selected === null) return { ok: false, message: "No observation selected." };
    setPending(true);
    setActionError(null);
    const result = await createEntityAction(workspace, selected.observation.id, input);
    setPending(false);
    if (result.ok) {
      updateSelectedObservation(result.observation);
      setEntities((prev) => [...prev, result.entity]);
      return { ok: true };
    }
    setActionError(result.message);
    return { ok: false, message: result.message };
  }

  async function handleAddNote() {
    if (selected === null) return;
    if (noteDraft.trim().length === 0) {
      setActionError("Enter a note before saving.");
      return;
    }
    setPending(true);
    setActionError(null);
    const result = await addReviewerNote(workspace, selected.observation.id, noteDraft.trim());
    setPending(false);
    if (result.ok) {
      setNoteDraft("");
      setShowNoteForm(false);
      setNotes((prev) => (prev === null ? null : [...prev, result.note]));
    } else {
      setActionError(result.message);
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
          <dt className="mt-2 font-medium text-ink-muted">Linked entity</dt>
          <dd className="text-ink">
            {observation.entityId === null
              ? "None"
              : (() => {
                  const entity = entityById.get(observation.entityId);
                  return entity === undefined
                    ? observation.entityId
                    : `${entity.displayName} (${entityTypeLabel(entity.entityType)})`;
                })()}
          </dd>
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
          <LinkEntityDialog entities={entities} entityTypeLabel={entityTypeLabel} disabled={pending} onLink={handleLinkEntity} />
          <CreateEntityDialog entityTypes={entityTypes} disabled={pending} onCreate={handleCreateEntity} />
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setShowNoteForm((prev) => !prev);
              setShowCorrection(false);
              setShowInsufficient(false);
            }}
          >
            Add reviewer note
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

        {showNoteForm ? (
          <label className="text-sm">
            <span className="font-medium text-ink">Reviewer note</span>
            <textarea
              className="mt-1 w-full rounded-md border border-border p-2 text-sm"
              rows={2}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
            />
            <Button type="button" className="mt-2" disabled={pending} onClick={() => void handleAddNote()}>
              Save note
            </Button>
          </label>
        ) : null}

        <div>
          <Button type="button" variant="secondary" disabled={historyLoading} onClick={() => void toggleHistory()}>
            {history === null ? "View history" : "Hide history"}
          </Button>
          {history !== null ? (
            <div className="mt-2 flex flex-col gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Revisions</h3>
                {history.length === 0 ? (
                  <p className="mt-1 text-xs text-ink-muted">No prior revisions — this is the original extracted value.</p>
                ) : (
                  <ol className="mt-1 flex flex-col gap-1 text-xs text-ink-muted">
                    {history.map((revision, index) => (
                      <li key={index}>
                        {valueLabel(revision.value)} — {REVIEW_STATUS_LABEL[revision.reviewStatus]}
                        {revision.reviewedAt !== null ? ` (${new Date(revision.reviewedAt).toLocaleString()})` : ""}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Notes</h3>
                {notes === null || notes.length === 0 ? (
                  <p className="mt-1 text-xs text-ink-muted">No notes yet.</p>
                ) : (
                  <ol className="mt-1 flex flex-col gap-1 text-xs text-ink-muted">
                    {notes.map((note) => (
                      <li key={note.id}>
                        {note.cause} ({note.actor.id}, {new Date(note.occurredAt).toLocaleString()})
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
