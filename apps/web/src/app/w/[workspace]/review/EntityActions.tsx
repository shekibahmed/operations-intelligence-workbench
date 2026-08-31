"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import type { Entity } from "@oiw/contracts";

import { Button } from "@/components/ui/Button";

export interface EntityActionResult {
  ok: boolean;
  message?: string;
}

function DialogChrome({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(28rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-4 shadow-lg">
        <Dialog.Title className="text-sm font-semibold text-ink">{title}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-ink-muted">{description}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

/**
 * Accessible, searchable entity picker (UX_SPEC §5.6 "Link entity"). Radio
 * buttons rather than a custom listbox/combobox — native, individually
 * labelled, keyboard-navigable controls, matching this codebase's existing
 * "no ambiguous icon row" convention for Accept/Correct/Reject. Radix Dialog
 * owns focus trap/return (UX_SPEC §16.3), same as `ConfirmDialog`.
 */
export function LinkEntityDialog({
  entities,
  entityTypeLabel,
  disabled = false,
  onLink,
}: {
  entities: Entity[];
  entityTypeLabel: (entityType: string) => string;
  disabled?: boolean;
  onLink: (entityId: string) => Promise<EntityActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const filtered =
    query.length === 0
      ? entities
      : entities.filter(
          (entity) =>
            entity.displayName.toLowerCase().includes(query) ||
            (entity.externalReference ?? "").toLowerCase().includes(query),
        );

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (next) {
      setSearch("");
      setSelectedId(null);
      setError(null);
    }
  }

  async function handleSubmit() {
    if (selectedId === null) return;
    setPending(true);
    setError(null);
    const result = await onLink(selectedId);
    setPending(false);
    if (result.ok) setOpen(false);
    else setError(result.message ?? "Could not link this entity.");
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="secondary" disabled={disabled}>
          Link entity
        </Button>
      </Dialog.Trigger>
      <DialogChrome title="Link entity" description="Search the workspace's entities and select one to link to this observation.">
        <label className="mt-3 block text-sm">
          <span className="font-medium text-ink">Search entities</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-border p-2 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Display name or external reference"
          />
        </label>

        {filtered.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No entities match &ldquo;{search}&rdquo;.</p>
        ) : (
          <fieldset className="mt-3">
            <legend className="text-sm font-medium text-ink">Entities</legend>
            <div className="mt-1 max-h-64 overflow-y-auto rounded-md border border-border p-2">
              {filtered.map((entity) => (
                <label key={entity.id} className="flex items-center gap-2 py-1 text-sm text-ink">
                  <input
                    type="radio"
                    name="link-entity"
                    value={entity.id}
                    checked={selectedId === entity.id}
                    onChange={() => setSelectedId(entity.id)}
                  />
                  <span>
                    {entity.displayName} <span className="text-ink-muted">— {entityTypeLabel(entity.entityType)}</span>
                    {entity.externalReference !== null ? <span className="text-ink-muted"> ({entity.externalReference})</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error !== null ? (
          <p role="alert" className="mt-3 rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-2 text-xs text-[var(--color-critical-ink)]">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Dialog.Close asChild>
            <Button variant="secondary" type="button" disabled={pending}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button type="button" disabled={selectedId === null || pending} onClick={() => void handleSubmit()}>
            Link
          </Button>
        </div>
      </DialogChrome>
    </Dialog.Root>
  );
}

/** Inline entity creation (UX_SPEC §5.6 "Create entity"): pack-typed, workspace-scoped, links the new entity in one submit. */
export function CreateEntityDialog({
  entityTypes,
  disabled = false,
  onCreate,
}: {
  entityTypes: { id: string; displayName: string }[];
  disabled?: boolean;
  onCreate: (input: { entityType: string; displayName: string; externalReference: string }) => Promise<EntityActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState(entityTypes[0]?.id ?? "");
  const [displayName, setDisplayName] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (next) {
      setEntityType(entityTypes[0]?.id ?? "");
      setDisplayName("");
      setExternalReference("");
      setError(null);
    }
  }

  async function handleSubmit() {
    if (displayName.trim().length === 0) {
      setError("Enter a display name for the new entity.");
      return;
    }
    if (entityType.length === 0) {
      setError("Choose an entity type.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await onCreate({ entityType, displayName: displayName.trim(), externalReference: externalReference.trim() });
    setPending(false);
    if (result.ok) setOpen(false);
    else setError(result.message ?? "Could not create this entity.");
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="secondary" disabled={disabled || entityTypes.length === 0}>
          Create entity
        </Button>
      </Dialog.Trigger>
      <DialogChrome title="Create entity" description="Create a new workspace entity and link it to this observation.">
        <label className="mt-3 block text-sm">
          <span className="font-medium text-ink">Entity type</span>
          <select
            className="mt-1 w-full rounded-md border border-border p-2 text-sm"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          >
            {entityTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm">
          <span className="font-medium text-ink">Display name</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-border p-2 text-sm"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="font-medium text-ink">External reference (optional)</span>
          <input
            type="text"
            className="mt-1 w-full rounded-md border border-border p-2 text-sm"
            value={externalReference}
            onChange={(event) => setExternalReference(event.target.value)}
          />
        </label>

        {error !== null ? (
          <p role="alert" className="mt-3 rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-2 text-xs text-[var(--color-critical-ink)]">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Dialog.Close asChild>
            <Button variant="secondary" type="button" disabled={pending}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button type="button" disabled={pending} onClick={() => void handleSubmit()}>
            Create and link
          </Button>
        </div>
      </DialogChrome>
    </Dialog.Root>
  );
}
