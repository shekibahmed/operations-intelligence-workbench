"use client";

import { useState } from "react";
import type { ActionItem } from "@oiw/contracts";

export function ActionItemChecklist({ items }: { items: ActionItem[] }) {
  const [completed, setCompleted] = useState<Set<string>>(
    new Set(items.filter((item) => item.status === "completed").map((item) => item.id)),
  );

  if (items.length === 0) return <p className="text-sm text-ink-muted">No action items yet.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isDone = completed.has(item.id);
        const inputId = `action-item-${item.id}`;
        return (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <input
              id={inputId}
              type="checkbox"
              checked={isDone}
              onChange={() =>
                setCompleted((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                })
              }
              className="mt-1"
            />
            <label htmlFor={inputId} className="flex-1">
              <span className={isDone ? "text-ink-muted line-through" : "text-ink"}>{item.title}</span>
              <span className="block text-xs text-ink-muted">
                {item.assignee ?? "Unassigned"} · Due {item.dueAt ? new Date(item.dueAt).toLocaleDateString() : "—"}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
