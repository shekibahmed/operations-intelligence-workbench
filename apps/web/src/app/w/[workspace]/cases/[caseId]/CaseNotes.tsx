"use client";

import { useState } from "react";
import type { AuditEntry } from "@oiw/contracts";

import { addCaseNoteAction } from "@/app/w/[workspace]/cases/[caseId]/actions";
import { Button } from "@/components/ui/Button";

export function CaseNotes({ workspace, caseId, notes: initialNotes }: { workspace: string; caseId: string; notes: AuditEntry[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (draft.trim().length === 0) {
      setError("Enter a note before saving.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await addCaseNoteAction(workspace, caseId, draft.trim());
    setPending(false);
    if (result.ok) {
      setNotes((prev) => [...prev, result.note]);
      setDraft("");
      setShowForm(false);
    } else {
      setError(result.message);
    }
  }

  return (
    <div>
      {notes.length === 0 ? (
        <p className="text-sm text-ink-muted">No case notes yet.</p>
      ) : (
        <ol className="mb-2 flex flex-col gap-1 text-sm text-ink-muted">
          {notes.map((note) => (
            <li key={note.id}>
              {note.cause} ({note.actor.id}, {new Date(note.occurredAt).toLocaleString()})
            </li>
          ))}
        </ol>
      )}
      {error !== null ? (
        <p role="alert" className="mb-2 text-xs text-[var(--color-critical-ink)]">
          {error}
        </p>
      ) : null}
      {showForm ? (
        <label className="text-sm">
          <span className="font-medium text-ink">Case note</span>
          <textarea
            className="mt-1 w-full rounded-md border border-border p-2 text-sm"
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="button" className="mt-2" disabled={pending} onClick={() => void save()}>
            Save note
          </Button>
        </label>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
          Add case note
        </Button>
      )}
    </div>
  );
}
