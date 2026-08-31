"use client";

import { useState } from "react";
import type { ActionItem } from "@oiw/contracts";

import { toggleActionItemAction } from "@/app/w/[workspace]/cases/[caseId]/actions";

export function ActionItemChecklist({ workspace, items: initialItems }: { workspace: string; items: ActionItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return <p className="text-sm text-ink-muted">No action items yet.</p>;

  async function toggle(item: ActionItem) {
    setPendingId(item.id);
    setError(null);
    const result = await toggleActionItemAction(workspace, item.id, item.status !== "completed");
    setPendingId(null);
    if (result.ok) {
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? result.actionItem : entry)));
    } else {
      setError(result.message);
    }
  }

  return (
    <div>
      {error !== null ? (
        <p role="alert" className="mb-2 rounded-md border border-[var(--color-critical-ink)] bg-[var(--color-critical-surface)] p-2 text-xs text-[var(--color-critical-ink)]">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const isDone = item.status === "completed";
          const inputId = `action-item-${item.id}`;
          return (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <input
                id={inputId}
                type="checkbox"
                checked={isDone}
                disabled={pendingId === item.id}
                onChange={() => void toggle(item)}
                className="mt-1"
              />
              <label htmlFor={inputId} className="flex-1">
                <span className={isDone ? "text-ink-muted line-through" : "text-ink"}>{item.title}</span>
                <span className="block text-xs text-ink-muted">
                  {item.assignee ?? "Unassigned"} · Due {item.dueAt ? new Date(item.dueAt).toLocaleDateString() : "—"} · {item.status}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
