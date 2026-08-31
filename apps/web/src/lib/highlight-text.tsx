import type { ReactNode } from "react";

export interface TextHighlightRange {
  start: number;
  end: number;
}

/**
 * Renders `text` with each non-overlapping `[start, end)` range wrapped in
 * `<mark>` — the evidence-span treatment UX_SPEC §5.6 specifies for the
 * Review Queue and §5.12 says the Technical Inspector's raw viewer reuses.
 * Conveyed by more than colour (background + underline), per §16.3.
 */
export function highlightRanges(text: string, ranges: readonly TextHighlightRange[]): ReactNode {
  if (ranges.length === 0) return text;

  const merged: TextHighlightRange[] = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last !== undefined && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  merged.forEach((range, index) => {
    if (range.start > cursor) nodes.push(text.slice(cursor, range.start));
    nodes.push(
      <mark key={index} className="rounded bg-[var(--color-warn-surface)] underline decoration-2 underline-offset-2">
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
